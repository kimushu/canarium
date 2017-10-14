import { EventEmitter } from 'events';
import { assert } from 'chai';

export interface TestDataExpect {
    e: Buffer | string | Array<number> | number;
}
export interface TestDataInject {
    i: Buffer | string | Array<number>;
}
export interface TestDataDelay {
    d: number;
}
export interface TestDataRemove {
    r: true;
}
export type TestDataEntry = TestDataExpect | TestDataInject | TestDataDelay | TestDataRemove;

export class SerialPortStub extends EventEmitter {
    static VALID_PATH = 'COM99';
    static INVALID_PATH = '/dev/tty.usbmodem9999';
    private static _testDataSet: TestDataEntry[];

    public TX_FLUSH_SIZE = 1024;

    private _connected: boolean = false;
    private _testDataSet: TestDataEntry[];
    private _credits: number = 0;
    private _delay: boolean = false;

    static list(cb: Function): void {
        cb(null, [{
            comName: this.VALID_PATH,
            manufacturer: 'Valid (openable) port',
            serialNumber: 'W12345678',
            productId: '1234',
            vendorId: '5678',
        }, {
            comName: this.INVALID_PATH,
            manufacturer: 'Invalid (non-openable) port',
            serialNumber: 'M12345678',
            productId: '4321',
            vendorId: '8765',
        }]);
    }

    static writeTestDataSet(set: TestDataEntry[]): void {
        assert(this._testDataSet == null);
        this._testDataSet = [];
        for (let entry of set) {
            this._testDataSet.push(Object.assign({}, entry));
        }
    }

    constructor(private _path: string) {
        super();
        assert.isString(_path);
    }

    private _getExpect(): TestDataEntry {
        if (this._testDataSet == null) {
            this._testDataSet = SerialPortStub._testDataSet || [];
            SerialPortStub._testDataSet = null;
        }
        for (;;) {
            let entry = this._testDataSet[0];
            if (entry == null) {
                // All test data finished
                return null;
            }
            if ((<TestDataExpect>entry).e != null) {
                return entry;
            }
            if ((<TestDataInject>entry).i != null) {
                let buf = (<TestDataInject>entry).i;
                if (typeof(buf) === 'string') {
                    buf = Buffer.from(buf, 'utf8');
                } else if (buf instanceof Array) {
                    buf = Buffer.from(buf);
                }
                // Process read() data injection
                process.nextTick(() => {
                    // console.log('read:', buf);
                    this.emit('data', buf);
                })
                this._testDataSet.splice(0, 1);
                continue;
            }
            if ((<TestDataDelay>entry).d != null) {
                if (!this._delay) {
                    // Process delay injection
                    let interval = (<TestDataDelay>entry).d;
                    this._delay = true;
                    setTimeout(() => {
                        this._delay = false;
                        assert((<TestDataDelay>this._testDataSet[0]).d != null);
                        this._testDataSet.splice(0, 1);
                    }, interval);
                }
                break;
            }
            if ((<TestDataRemove>entry).r != null) {
                // Process removal injection
                process.nextTick(() => {
                    this._connected = false;
                    this.emit('close');
                });
                this._testDataSet.splice(0, 1);
                continue;
            }
        }
        for (let entry of this._testDataSet) {
            if ((<TestDataExpect>entry).e != null) {
                return entry;
            }
        }
        return null;
    }

    open(cb: Function): void {
        assert.isFunction(cb);
        assert.isFalse(this._connected);
        switch (this._path) {
        case SerialPortStub.VALID_PATH:
            this._connected = true;
            cb();
            return;
        default:
            cb(new Error('Invalid path'));
            return;
        }
    }

    close(cb: Function): void {
        assert.isFunction(cb);
        assert.isTrue(this._connected);
        this._connected = false;
        cb();
    }

    flush(cb: Function): void {
        assert.isFunction(cb);
        assert.isTrue(this._connected);
        cb();
    }

    write(data: Buffer, encoding: string, callback: Function): boolean {
        assert(this._credits < this.TX_FLUSH_SIZE);
        assert.instanceOf(data, Buffer);
        assert.isTrue(this._connected);
        // Validate write() data expectation
        // console.log('write:', data);
        for (;;) {
            let testData = <TestDataExpect>this._getExpect();
            if (data.length === 0) {
                break;
            }
            if (testData == null) {
                testData = {e: Buffer.alloc(0)};
            }
            let expect = testData.e;
            if (typeof(expect) === 'number') {
                let ignoreLen = Math.min(data.length, expect);
                data = data.slice(ignoreLen);
                testData.e = expect - ignoreLen;
                if ((testData.e === 0) && (this._testDataSet[0] === testData)) {
                    this._testDataSet.splice(0, 1);
                }
                this._credits += ignoreLen;
            } else {
                if (typeof(expect) === 'string') {
                    expect = testData.e = Buffer.from(expect, 'utf8');
                } else if (expect instanceof Array) {
                    expect = testData.e = Buffer.from(expect);
                }
                let compareLen = Math.min(data.length, expect.length);
                if (compareLen === 0) {
                    assert(false, 'Unexpected write data');
                }
                if (data.compare(expect, 0, compareLen) !== 0) {
                    for (let i = 0; i < compareLen; ++i) {
                        assert.equal(data[i], expect[i], 'Unexpected write data');
                    }
                }
                data = data.slice(compareLen);
                testData.e = expect.slice(compareLen);
                if ((testData.e.length === 0) && (this._testDataSet[0] === testData)) {
                    this._testDataSet.splice(0, 1);
                }
                this._credits += compareLen;
            }
        }
        if (callback != null) {
            process.nextTick(callback);
        }
        if (this._credits >= this.TX_FLUSH_SIZE) {
            process.nextTick(() => {
                this._credits = 0;
                this.emit('drain');
            });
            return false;
        }
        return true;
    }

    // read() {
    //     return null;
    // }
}
