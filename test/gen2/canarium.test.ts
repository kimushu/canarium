//import { CanariumGen2, assert, showInfo } from '../test-common';
import { CanariumGen2 } from '../../src/gen2/canarium';
import { AvmTransactionsGen2 } from '../../src/gen2/avm_transactions';
import { AvsWritableStream, AvsReadableStream } from '../../src/gen2/avs_streams';
import { SerialPortStub } from './serialport-stub';
import * as semver from 'semver';

import * as chai from 'chai';
chai.use(require('chai-as-promised'));
const { assert } = chai;

CanariumGen2.Binding = <any>SerialPortStub;

process.nextTick(run);


describe('Canarium', function(){
    let canarium: CanariumGen2;

    function withInstance(description: string, tests: (this: Mocha.ISuiteCallbackContext) => any, path: string = SerialPortStub.VALID_PATH) {
        describe(description, function(){
            beforeEach(function(){
                canarium = new CanariumGen2(path);
            });
            afterEach(function(){
                let instance = canarium;
                canarium = undefined;
                return instance.dispose();
            });
            tests.call(this);
        });
    }

    describe('list()', function(){
        it('is a function', function(){
            assert.isFunction(CanariumGen2.list);
        });
        it('returns ports with correct information', function(){
            return assert.isFulfilled(
                CanariumGen2.list()
                .then((ports) => {
                    assert.equal(ports.length, 2);
                    assert.equal(ports[0].path, SerialPortStub.VALID_PATH);
                    assert.equal(ports[0].productId, 0x1234);
                    assert.equal(ports[0].vendorId, 0x5678);
                    assert.equal(ports[1].path, SerialPortStub.INVALID_PATH);
                    assert.equal(ports[1].productId, 0x4321);
                    assert.equal(ports[1].vendorId, 0x8765);
                })
            );
        });
    });

    describe('version', function(){
        it('is a string of semver format', function(){
            let { version } = CanariumGen2;
            assert.isString(version);
            assert(semver.valid(version));
        });
    });

    withInstance('path', function(){
        it('is a string property and equal to port path', function(){
            let { path } = canarium;
            assert.isString(path);
            assert.equal(path, 'COM99');
        });
        it('is a read-only property', function(){
            assert.throws(() => (<any>canarium).path = 'foo');
        });
    });

    withInstance('opened', function(){
        it('is a boolean property', function(){
            assert.isBoolean(canarium.opened);
        });
        it('is false when not opened', function(){
            assert.isFalse(canarium.opened);
        });
        // other tests are included in open()
    });

    withInstance('avm', function(){
        it('is an instance of AvmTransactionsGen2', function(){
            assert.instanceOf(canarium.avm, AvmTransactionsGen2);
        });
    });

    withInstance('open() with valid path', function(){
        it('is a function', function(){
            assert.isFunction(canarium.open);
        });
        it('succeeds and set \'opened\' to true', function(){
            return assert.isFulfilled(
                canarium.open()
                .then(() => {
                    assert.isTrue(canarium.opened);
                })
            );
        });
        it('changes opened value to true', function(){
            return assert.isFulfilled(canarium.open().then(() => {
                assert.isTrue(canarium.opened);
            }));
        });
        it('fails when already opened', function(){
            return assert.isRejected(canarium.open(), 'already opened');
        });
    });
/*
    sandbox('close()', function(){
        it('is a function', function(){
            assert.isFunction(canarium.close);
        });
        it('fails when not opened', function(){
            return assert.isRejected(canarium.close(), 'not opened');
        });
        it('succeeds when opened', function(){
            this.slow(1000);
            return assert.isFulfilled(
                canarium.open()
                .then(() => canarium.close())
            );
        });
    });

    sandbox('getInfo()', function(){
        it('is a function', function(){
            assert.isFunction(canarium.getInfo);
        });
        it('fails when not opened', function(){
            return assert.isRejected(canarium.getInfo(), 'not opened');
        });
        it('succeeds when opened', function(){
            return assert.isFulfilled(
                canarium.open()
                .then(() => canarium.getInfo())
                .then((info) => {
                    showInfo(`{id: '${info.id}', serialCode: '${info.serialCode
                    }', systemId: 0x${info.systemId.toString(16)
                    }, timestamp: 0x${info.timestamp.toString(16)} }`);
                    assert.equal(info.id, 'J72C');
                    assert.match(info.serialCode, /^93[0-9A-F]{4}-[0-9A-F]{6}-[0-9A-F]{6}$/);
                    assert.isNumber(info.systemId);
                    assert.isNumber(info.timestamp);
                })
            );
        });
    });

    sandbox('createWriteStream', function(){
        it('is a function', function(){
            assert.isFunction(canarium.createWriteStream);
        });
        it('fails when channel zero used', function(){
            assert.throws(() => canarium.createWriteStream(0), 'already exists');
        });
        it('succeeds and returns an instance of AvsWritableStream', function(){
            assert.instanceOf(canarium.createWriteStream(1), AvsWritableStream);
        });
    });

    sandbox('createReadStream', function(){
        it('is a function', function(){
            assert.isFunction(canarium.createReadStream);
        });
        it('fails when channel zero used', function(){
            assert.throws(() => canarium.createReadStream(0), 'already exists');
        });
        it('succeeds and returns an instance of AvsReadableStream', function(){
            assert.instanceOf(canarium.createReadStream(1), AvsReadableStream);
        });
    });
    */
});
