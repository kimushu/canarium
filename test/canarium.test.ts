import { Canarium, assert, cond, testdatacol, SWI } from './test-common';

import { waitPromise } from '../src/common';

describe('Canarium', function(){
    let canarium: Canarium;

    function sandbox(name, tests: (this: Mocha.ISuiteCallbackContext) => any) {
        describe(name, function(){
            before(function(){
                canarium = new Canarium();
            });
            tests.call(this);
            after(function(){
                if (canarium.connected) {
                    return canarium.close();
                }
                canarium = null;
            });
        });
    }

    sandbox('version', function(){
        it('is a string', function(){
            assert.isString(canarium.version);
        });
        it('has a valid format', function(){
            assert.match(canarium.version, /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/);
        });
    });

    sandbox('boardInfo', function(){
        it('is a property', function(){
            assert.property(canarium, 'boardInfo');
        });
    });

    sandbox('serialBitrate', function(){
        it('is a number', function(){
            assert.isNumber(canarium.serialBitrate);
        });
        it('is writable', function(){
            let value = canarium.serialBitrate * 2;
            canarium.serialBitrate = value;
            assert.equal(canarium.serialBitrate, value);
        });
    });

    sandbox('connected w/o connection', function(){
        it('is a boolean', function(){
            assert.isBoolean(canarium.connected);
        });
        it('is false before connection', function(){
            assert.isFalse(canarium.connected);
        });
    });

    sandbox('connected w/ connection', function(){
        before(function(){
            cond.boards[0] || this.skip();
        });
        it('is true after connection', function(){
            this.slow(1000);
            this.timeout(2000);
            return assert.isFulfilled(
                canarium.open(cond.boards[0])
                .then(() => {
                    assert.isTrue(canarium.connected);
                    return canarium.close();                    
                })
            );
        });
        it('is false after disconnection', function(){
            this.slow(1000);
            this.timeout(2000);
            return assert.isFulfilled(
                canarium.open(cond.boards[0])
                .then(() => {
                    return canarium.close();                    
                })
                .then(() => {
                    assert.isFalse(canarium.connected);
                })
            );
        });
    });

    sandbox('configured', function(){
        it('is a boolean', function(){
            assert.isBoolean(canarium.configured);
        });
        it('is false before connection', function(){
            assert.isFalse(canarium.configured);
        });
    });

    sandbox('base', function(){
        it('is an instance of BaseComm', function(){
            assert.instanceOf(canarium.base, Canarium.BaseComm);
        });
    });

    sandbox('i2c', function(){
        it('is an instance of I2CComm', function(){
            assert.instanceOf(canarium.i2c, Canarium.I2CComm);
        });
    });

    sandbox('avs', function(){
        it('is an instance of AvsPackets', function(){
            assert.instanceOf(canarium.avs, Canarium.AvsPackets);
        });
    });

    sandbox('avm', function(){
        it('is an instance of AvmTransactions', function(){
            assert.instanceOf(canarium.avm, Canarium.AvmTransactions);
        });
    });

    sandbox('onClosed', function(){
        it('is a property', function(){
            assert.property(canarium, 'onClosed');
        });
        it('is writable', function(){
            let value = () => null;
            canarium.onClosed = value;
            assert.equal(canarium.onClosed, value);
        });
    });

    sandbox('static enumerate()', function(){
        it('is a function', function(){
            assert.isFunction(Canarium.enumerate);
        });
        it('returns undefined when called with callback', function(done){
            assert.isUndefined(Canarium.enumerate((success: boolean, result: any[]) => {
                assert.isTrue(success);
                done();
            }));
        });
    });

    sandbox('open() w/o connection', function(){
        it('is a function', function(){
            assert.isFunction(canarium.open);
        });
        it('returns undefined when called with callback', function(done){
            assert.isUndefined(canarium.open('xxx', (success: boolean) => {
                assert.isFalse(success);
                done();
            }));
        });
        it('returns undefined when called with boardInfo and callback', function(done){
            assert.isUndefined(canarium.open('xxx', {}, (success: boolean) => {
                assert.isFalse(success);
                done();
            }));
        });
        it('returns Promise(rejection) when called with inexistent path and no callback', function(){
            return assert.isRejected(canarium.open('xxx'));
        });
    });
    sandbox('open() w/ connection', function(){
        before(function(){
            cond.boards[0] || this.skip();
        });
        afterEach(function(){
            return canarium.close().catch(() => {});
        });
        it('fails when called with incorrect board ID', function(){
            cond.boards[0] || this.skip();
            this.slow(2000);
            this.timeout(4000);
            return assert.isRejected(
                canarium.open(cond.boards[0], {id: <any>'J72A_'}),
                'Board ID mismatch'
            );
        });
        it('fails when called with incorrect serial code', function(){
            cond.boards[0] || this.skip();
            this.slow(2000);
            this.timeout(4000);
            return assert.isRejected(
                canarium.open(cond.boards[0], {serialcode: 'xxxxxx-yyyyyy-zzzzzz'}),
                'Board serial code mismatch'
            );
        });
        it('succeeds when called with existent path', function(){
            cond.boards[0] || this.skip();
            this.slow(1000);
            this.timeout(2000);
            return assert.isFulfilled(canarium.open(cond.boards[0]));
        });
        it('succeeds with configuration on PERIDOT Classic (PS mode)', function(){
            cond.classic_ps || this.skip();
            this.slow(2000);
            this.timeout(4000);
            return assert.isFulfilled(
                canarium.open(cond.classic_ps, {
                    rbfdata: testdatacol.classic_ps.fpga_output_data
                })
            );
        });
    });
    sandbox('close() w/o connection', function(){
        it('is a function', function(){
            assert.isFunction(canarium.close);
        });
        it('returns undefined when called with callback', function(done){
            assert.isUndefined(canarium.close((success: boolean) => {
                assert.isFalse(success);
                done();
            }));
        });
        it('returns Promise(rejection) when port is not opened', function(){
            return assert.isRejected(canarium.close());
        });
    });
    sandbox('close() w/ connection', function(){
        before(function(){
            cond.boards[0] || this.skip();
        });
        it('succeeds when port is opened', function(){
            this.slow(1000);
            this.timeout(2000);
            return assert.isFulfilled(
                canarium.open(cond.boards[0])
                .then(() => {
                    return canarium.close();
                })
            );
        });
    });
    sandbox('getinfo() w/o connection', function(){
        it('is a function', function(){
            assert.isFunction(canarium.getinfo);
        });
        it('returns undefined when called with callback', function(done){
            assert.isUndefined(canarium.getinfo((success: boolean, result) => {
                assert.isFalse(success);
                done();
            }));
        });
        it('returns Promise(rejection) when port is not opened', function(){
            return assert.isRejected(canarium.getinfo());
        });
    });
    sandbox('getinfo() w/ connection to PERIDOT Classic', function(){
        before(function(){
            cond.classic[0] || this.skip();
            this.slow(1000);
            this.timeout(2000);
            return canarium.open(cond.classic[0])
            .then(() => {
                return canarium.getinfo();
            });
        });
        after(function(){
            this.slow(1000);
            this.timeout(2000);
            return canarium.close().catch(() => {});
        });
        it('stores result into canarium.boardInfo', function(){
            assert.isOk(canarium.boardInfo);
        });
        it('succeeds with valid board ID', function(){
            canarium.boardInfo || this.skip();
            assert.match(canarium.boardInfo.id, /^J72[AN]$/);
        });
        it('succeeds with reasonable serial code', function(){
            canarium.boardInfo || this.skip();
            assert.match(canarium.boardInfo.serialcode, /^[0-9A-Z]{6}-[0-9A-Z]{6}-[0-9A-Z]{6}$/);
        });
    });
    sandbox('config() w/o connection', function(){
        it('is a function', function(){
            assert.isFunction(canarium.config);
        });
        it('returns undefined when called with callback', function(done){
            assert.isUndefined(canarium.config(null, Buffer.alloc(0), (success: boolean) => {
                assert.isFalse(success);
                done();
            }));
        });
        it('returns Promise(rejection) when port is not opened', function(){
            return assert.isRejected(canarium.config(null, Buffer.alloc(0)));
        });
    });
    sandbox('config() w/ connection to PERIDOT Classic (PS mode)', function(){
        before(function(){
            cond.classic_ps || this.skip();
            this.slow(1000);
            this.timeout(2000);
            return canarium.open(cond.classic_ps);
        });
        after(function(){
            this.slow(1000);
            this.timeout(2000);
            return canarium.close().catch(() => {});
        });
        it('succeeds without board constraints', function(){
            this.slow(2000);
            this.timeout(4000);
            return assert.isFulfilled(
                canarium.config(null, testdatacol.classic_ps.fpga_output_data)
            );
        });
        it('succeeds with correct board ID constraint', function(){
            this.slow(3000);
            this.timeout(6000);
            return assert.isFulfilled(
                canarium.config(
                    {id: 'J72A'},
                    testdatacol.classic_ps.fpga_output_data
                )
            );
        });
        it('fails with incorrect board ID constraint', function(){
            this.slow(2000);
            this.timeout(4000);
            return assert.isRejected(
                canarium.config(
                    {id: <any>'J72A_'},
                    testdatacol.classic_ps.fpga_output_data
                )
            );
        });
        it('fails with incorrect board serial constraint', function(){
            this.slow(2000);
            this.timeout(4000);
            return assert.isRejected(
                canarium.config(
                    {serialcode: 'xxxxxx-yyyyyy-zzzzzz'},
                    testdatacol.classic_ps.fpga_output_data
                )
            );
        });
    });
    sandbox('reconfig() w/o connection', function(){
        it('is a function', function(){
            assert.isFunction(canarium.reconfig);
        });
        it('returns undefined when called with callback', function(done){
            assert.isUndefined(canarium.reconfig((success: boolean) => {
                assert.isFalse(success);
                done();
            }));
        });
        it('returns Promise(rejection) when port is not opened', function(){
            return assert.isRejected(canarium.reconfig());
        });
    });
    //describe_sandbox("reconfig() w/ connection", function(){
    //});
    sandbox('reset() w/o connection', function(){
        it('is a function', function(){
            assert.isFunction(canarium.reset);
        });
        it('returns undefined when called with callback', function(done){
            assert.isUndefined(canarium.reset((success: boolean) => {
                assert.isFalse(success);
                done();
            }));
        });
        it('returns Promise(rejection) when port is not opened', function(){
            return assert.isRejected(canarium.reset());
        });
    });
    sandbox('reset() w/ connection to PERIDOT Classic (PS mode)', function(){
        const { SWI_BASE } = testdatacol.classic_ps.info;
        before(function(){
            cond.classic_ps || this.skip();
        });
        it('succeeds and clear SWI message register', function(){
            this.slow(2000);
            this.timeout(4000);
            let dummyValue = 0xdeadbeef;
            return assert.isFulfilled(
                canarium.open(cond.classic_ps, {rbfdata: testdatacol.classic_ps.fpga_output_data})
                .then(() => {
                    return canarium.avm.iowr(SWI_BASE, SWI.REG_MESSAGE, dummyValue);
                })
                .then(() => {
                    return canarium.avm.iord(SWI_BASE, SWI.REG_MESSAGE);
                })
                .then((value) => {
                    assert.equal(value, dummyValue);
                    return canarium.reset();
                })
                .then(() => {
                    return canarium.avm.iord(SWI_BASE, SWI.REG_MESSAGE);
                })
                .then((value) => {
                    assert.equal(value, 0);
                })
            );
        });
    });
});
