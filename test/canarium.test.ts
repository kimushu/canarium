import * as chai from 'chai';
chai.use(require('chai-as-promised'));
const {assert} = chai;
import { cond, CLASSIC_RBF_DATA, SWI_BASE, REG_SWI_MESSAGE } from './test-common';

import { Canarium } from '../src/canarium';
import { BaseComm } from '../src/base_comm';
import { I2CComm } from '../src/i2c_comm';
import { AvsPackets } from '../src/avs_packets';
import { AvmTransactions } from '../src/avm_transactions';
import { RpcClient } from '../src/rpc_client';
import { waitPromise } from '../src/common';

describe('Canarium', function(){
    describe('version', function(){
        let canarium = new Canarium();
        it('is a string', function(){
            assert.isString(canarium.version);
        });
        it('has a valid format', function(){
            assert.match(canarium.version, /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/);
        });
    });

    describe('boardInfo', function(){
        let canarium = new Canarium();
        it('is a property', function(){
            assert.property(canarium, 'boardInfo');
        });
    });

    describe('serialBitrate', function(){
        let canarium = new Canarium();
        it('is a number', function(){
            assert.isNumber(canarium.serialBitrate);
        });
        it('is writable', function(){
            let value = canarium.serialBitrate * 2;
            canarium.serialBitrate = value;
            assert.equal(canarium.serialBitrate, value);
        })
    });

    describe('connected w/o connection', function(){
        let canarium = new Canarium();
        it('is a boolean', function(){
            assert.isBoolean(canarium.connected);
        });
        it('is false before connection', function(){
            assert.isFalse(canarium.connected);
        });
    })

    describe('connected w/ connection', function(){
        let canarium = new Canarium();
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
            )
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
            )
        });
    })

    describe('configured', function(){
        let canarium = new Canarium();
        it('is a boolean', function(){
            assert.isBoolean(canarium.configured);
        });
        it('is false before connection', function(){
            assert.isFalse(canarium.configured);
        });
    });

    describe('base', function(){
        let canarium = new Canarium();
        it('is an instance of BaseComm', function(){
            assert.instanceOf(canarium.base, BaseComm);
        });
    });

    describe('i2c', function(){
        let canarium = new Canarium();
        it('is an instance of I2CComm', function(){
            assert.instanceOf(canarium.i2c, I2CComm);
        });
    });

    describe('avs', function(){
        let canarium = new Canarium();
        it('is an instance of AvsPackets', function(){
            assert.instanceOf(canarium.avs, AvsPackets);
        });
    });

    describe('avm', function(){
        let canarium = new Canarium();
        it('is an instance of AvmTransactions', function(){
            assert.instanceOf(canarium.avm, AvmTransactions);
        });
    });

    describe('rpcClient', function(){
        let canarium = new Canarium();
        it('is an instance of RpcClient', function(){
            assert.instanceOf(canarium.rpcClient, RpcClient);
        });
    });

    describe('swiBase', function(){
        let canarium = new Canarium();
        it('is a number', function(){
            assert.isNumber(canarium.swiBase);
        });
        it('is writable', function(){
            let value = canarium.swiBase + 16;
            canarium.swiBase = value;
            assert.equal(canarium.swiBase, value);
        });
    });

    describe('onClosed', function(){
        let canarium = new Canarium();
        it('is a property', function(){
            assert.property(canarium, 'onClosed');
        });
        it('is writable', function(){
            let value = () => null;
            canarium.onClosed = value;
            assert.equal(canarium.onClosed, value);
        });
    });

    describe('static enumerate()', function(){
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

    describe('open() w/o connection', function(){
        let canarium = new Canarium();
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
    describe('open() w/ connection', function(){
        let canarium = new Canarium();
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
                    rbfdata: CLASSIC_RBF_DATA
                })
            );
        });
    });
    describe('close() w/o connection', function(){
        let canarium = new Canarium();
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
    describe('close() w/ connection', function(){
        let canarium = new Canarium();
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
    describe('config() w/o connection', function(){
        let canarium = new Canarium();
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
            return assert.isRejected(canarium.close());
        });
    });
    describe('config() w/ connection to PERIDOT Classic (PS mode)', function(){
        let canarium = new Canarium();
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
                canarium.config(null, CLASSIC_RBF_DATA)
            );
        });
        it('succeeds with correct board ID constraint', function(){
            this.slow(3000);
            this.timeout(6000);
            return assert.isFulfilled(
                canarium.config(
                    {id: 'J72A'},
                    CLASSIC_RBF_DATA
                )
            );
        });
        it('fails with incorrect board ID constraint', function(){
            this.slow(2000);
            this.timeout(4000);
            return assert.isRejected(
                canarium.config(
                    {id: <any>'J72A_'},
                    CLASSIC_RBF_DATA
                )
            );
        });
        it('fails with incorrect board serial constraint', function(){
            this.slow(2000);
            this.timeout(4000);
            return assert.isRejected(
                canarium.config(
                    {serialcode: 'xxxxxx-yyyyyy-zzzzzz'},
                    CLASSIC_RBF_DATA
                )
            );
        });
    });
    describe('reconfig() w/o connection', function(){
        let canarium = new Canarium();
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
    //describe("reconfig() w/ connection", function(){
    //});
    describe('reset() w/o connection', function(){
        let canarium = new Canarium();
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
    describe('reset() w/ connection to PERIDOT Classic (PS mode)', function(){
        let canarium = new Canarium();
        before(function(){
            cond.classic_ps || this.skip();
        });
        it('succeeds and clear SWI message register', function(){
            this.slow(2000);
            this.timeout(4000);
            let dummyValue = 0xdeadbeef;
            return assert.isFulfilled(
                canarium.open(cond.classic_ps, {rbfdata: CLASSIC_RBF_DATA})
                .then(() => {
                    return canarium.avm.iowr(SWI_BASE, REG_SWI_MESSAGE, dummyValue);
                })
                .then(() => {
                    return canarium.avm.iord(SWI_BASE, REG_SWI_MESSAGE);
                })
                .then((value) => {
                    assert.equal(value, dummyValue);
                    return canarium.reset();
                })
                .then(() => {
                    return canarium.avm.iord(SWI_BASE, REG_SWI_MESSAGE);
                })
                .then((value) => {
                    assert.equal(value, 0);
                })
            );
        });
    });
});
//-*/