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

    const TEST_DATA_OPEN = [
        {e:[0x7c,0x00]},
        {e:[0x7a,0x7f,0x00,0x00,0x00]},
        {e:3},{e:[0x7b]},{e: 1},
        {i:[0x7c,0x00,0x7a,0xff,0x00,0x00,0x7b,0x00]},
    ];

    withInstance('open() with valid path', function(){
        it('is a function', function(){
            assert.isFunction(canarium.open);
        });
        it('succeeds and set \'opened\' to true', function(){
            SerialPortStub.writeTestDataSet(TEST_DATA_OPEN);
            return assert.isFulfilled(
                canarium.open()
                .then(() => {
                    assert.isTrue(canarium.opened);
                })
            );
        });
        it('changes opened value to true', function(){
            SerialPortStub.writeTestDataSet(TEST_DATA_OPEN);
            return assert.isFulfilled(canarium.open().then(() => {
                assert.isTrue(canarium.opened);
            }));
        });
        it('fails when already opened', function(){
            SerialPortStub.writeTestDataSet(TEST_DATA_OPEN);
            return assert.isRejected(
                canarium.open().then(() => canarium.open()),
                'already opened'
            );
        });
    });

    withInstance('open() with invalid path', function(){
        it('fails and keep \'opened\' false', function(){
            return assert.isRejected(canarium.open())
            .then(() => {
                assert.isFalse(canarium.opened);
            });
        });
    }, SerialPortStub.INVALID_PATH);

    withInstance('close()', function(){
        it('is a function', function(){
            assert.isFunction(canarium.close);
        });
        it('fails when not opened', function(){
            return assert.isRejected(canarium.close(), 'not opened');
        });
        it('succeeds when opened', function(){
            SerialPortStub.writeTestDataSet(TEST_DATA_OPEN);
            return assert.isFulfilled(
                canarium.open()
                .then(() => canarium.close())
            );
        });
    });

    // systemId: 0xdeadbeef, timestamp: 0x12345678
    // uidLow: 0xbaadcafe, uidHigh: 0xdefec8ed
    const TEST_DATA_GETINFO = [
        {e:[0x7a,0x14,0x00,0x00,0x10,0x10,0x00,0x00,0x7b,0x00]},
        {i:[0x7a,0xef,0xbe,0xad,0xde,0x78,0x56,0x34,0x12]},
        {i:[0xfe,0xca,0xad,0xba,0xed,0xc8,0xfe,0x7b,0xde]},
    ];

    withInstance('getInfo()', function(){
        it('is a function', function(){
            assert.isFunction(canarium.getInfo);
        });
        it('fails when not opened', function(){
            return assert.isRejected(canarium.getInfo(), 'not opened');
        });
        it('succeeds and returns correct data', function(){
            SerialPortStub.writeTestDataSet([
                ...TEST_DATA_OPEN,
                ...TEST_DATA_GETINFO,
            ]);
            return assert.isFulfilled(
                canarium.open()
                .then(() => canarium.getInfo())
                .then((info) => {
                    assert.equal(info.id, 'J72C');
                    assert.equal(info.systemId, 0xdeadbeef);
                    assert.equal(info.timestamp, 0x12345678);
                    assert.equal(info.serialCode, '93DEFE-C8EDBA-ADCAFE');
                })
            );
        });
    });

    withInstance('createWriteStream()', function(){
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

    withInstance('createReadStream()', function(){
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
});
