import { CanariumGen2, assert, showInfo } from '../test-common';
import { AvmTransactionsGen2 } from '../../src/gen2/avm_transactions';
import { AvsWritableStream, AvsReadableStream } from '../../src/gen2/avs_streams';
import * as semver from 'semver';

describe('Canarium', function(){
    let canarium: CanariumGen2;
    let portPath: string;

    function sandbox(name, tests: (this: Mocha.ISuiteCallbackContext) => any) {
        describe(name, function(){
            before(function(){
                canarium = new CanariumGen2(portPath);
            });
            tests.call(this);
            after(function(){
                return canarium.close()
                .catch(() => {})
                .then(() => canarium = null);
            });
        });
    }

    describe('list()', function(){
        it('is a function', function(){
            assert.isFunction(CanariumGen2.list);
        });
        it('returns one or more port(s)', function(){
            return assert.isFulfilled(
                CanariumGen2.list()
                .then((ports) => {
                    assert.isAtLeast(ports.length, 1);
                    ports.forEach((port, index) => {
                        showInfo(`[${index}] { path: '${port.path
                        }', vendorId: 0x${port.vendorId.toString(16)
                        }, productId: 0x${port.productId.toString(16)}, ... }`);
                        assert.isString(port.path);
                    });
                    portPath = ports[0].path;
                })
            );
        });
    });

    describe('version', function(){
        it('is a string of semver format', function(){
            let { version } = CanariumGen2;
            assert.isString(version);
            assert(semver.valid(version));
            showInfo(version);
        });
    });

    sandbox('path', function(){
        it('is a string property and equal to port path', function(){
            let { path } = canarium;
            assert.isString(path);
            assert.equal(path, portPath);
        });
    });

    sandbox('opened', function(){
        it('is boolean property', function(){
            assert.isBoolean(canarium.opened);
        });
        it('is false when not opened', function(){
            assert.isFalse(canarium.opened);
        });
    });

    sandbox('avm', function(){
        it('is an instance of AvmTransactionsGen2', function(){
            assert.instanceOf(canarium.avm, AvmTransactionsGen2);
        });
    });

    sandbox('open()', function(){
        it('is a function', function(){
            assert.isFunction(canarium.open);
        });
        it('succeeds (no argument)', function(){
            return assert.isFulfilled(canarium.open());
        });
        it('changes opened value to true', function(){
            assert.isTrue(canarium.opened);
        });
        it('fails when already opened', function(){
            return assert.isRejected(canarium.open(), 'already opened');
        });
    });

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
});
