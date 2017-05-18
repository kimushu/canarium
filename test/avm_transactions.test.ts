import * as chai from 'chai';
chai.use(require('chai-as-promised'));
const {assert} = chai;
import { cond, CLASSIC_RBF_DATA, SWI_BASE, REG_SWI_MESSAGE, REG_SWI_CLASSID, CLASSIC_CLASSID, IPL_BASE, IPL_SPAN } from './test-common';

import { Canarium } from '../src/canarium';

describe('AvmTransactions', function(){
    let canarium = new Canarium();
    let avm = canarium.avm;
    before(function(){
        cond.classic_ps || this.skip();
        if (!canarium.connected) {
            this.timeout(5000);
            return canarium.open(cond.classic_ps, {rbfdata: CLASSIC_RBF_DATA});
        }
    });
    after(function(){
        if (canarium.connected) {
            return canarium.close();
        }
    });
    describe('base', function(){
        it('equals to canarium.base', function(){
            assert.equal(avm.base, canarium.base);
        });
    });
    describe('swiBase', function(){
        it('is a number', function(){
            assert.isNumber(avm.swiBase);
        });
        it('is writable', function(){
            let oldValue = avm.swiBase;
            let newValue = oldValue + 4;
            avm.swiBase = newValue;
            assert.equal(avm.swiBase, newValue);
            avm.swiBase = oldValue;
        });
    });
    describe('iord() w/o connection', function(){
        it('is a function', function(){
            assert.isFunction(avm.iord);
        });
    });
    describe('iord() w/ connection', function(){
        it('returns undefined and success when called with callback', function(done){
            assert.isUndefined(avm.iord(SWI_BASE, REG_SWI_CLASSID, (success: boolean) => {
                assert.isTrue(success);
                done();
            }));
        });
        it('returns Promise(fulfilled) when called without callback', function(){
            return assert.isFulfilled(
                avm.iord(SWI_BASE, REG_SWI_CLASSID)
            );
        });
        it('succeeds with correct value (offset=1)', function(){
            return assert.isFulfilled(
                avm.iord(SWI_BASE - 4, REG_SWI_CLASSID + 1)
                .then((value) => {
                    assert.equal(value, CLASSIC_CLASSID);
                })
            );
        });
        for (let byteoffset = 0; byteoffset <= 4; ++byteoffset) {
            it(`succeeds with correct value (byteoffset=${byteoffset})`, function(){
                return assert.isFulfilled(
                    avm.iord(SWI_BASE + byteoffset, REG_SWI_CLASSID)
                    .then((value) => {
                        if (byteoffset < 4) {
                            assert.equal(value, CLASSIC_CLASSID);
                        } else {
                            assert.notEqual(value, CLASSIC_CLASSID);
                        }
                    })
                );
            });
        }
    });
    describe('iowr() w/o connection', function(){
        it('is a function', function(){
            assert.isFunction(avm.iowr);
        });
    });
    describe('iowr() w/ connection', function(){
        let scratch_base = IPL_BASE + IPL_SPAN - 8;
        it('returns undefined and success when called with callback', function(done){
            assert.isUndefined(avm.iowr(scratch_base, 0, 0, (success: boolean) => {
                assert.isTrue(success);
                done();
            }));
        });
        it('returns Promise(fulfilled) when called without callback', function(){
            return assert.isFulfilled(
                avm.iowr(scratch_base, 0, 0)
            );
        });
        it('succeeds with correct value (offset=1)', function(){
            let dummyValue = 0xdeadbeef;
            return assert.isFulfilled(
                avm.iowr(scratch_base - 4, 1, dummyValue)
                .then(() => {
                    return avm.iord(scratch_base, 0);
                })
                .then((value) => {
                    assert.equal(value, dummyValue);
                })
            );
        });
        for (let byteoffset = 0; byteoffset <= 4; ++byteoffset) {
            it(`succeeds with correct value (byteoffset=${byteoffset})`, function(){
                let dummyValue = 0xbadcafe0 + byteoffset;
                return assert.isFulfilled(
                    avm.iowr(scratch_base + byteoffset, 0, dummyValue)
                    .then(() => {
                        return avm.iord(scratch_base, 0);
                    })
                    .then((value) => {
                        if (byteoffset < 4) {
                            assert.equal(value, dummyValue);
                        } else {
                            assert.equal(value, dummyValue - 1);
                            return avm.iord(scratch_base, 1)
                            .then((value) => {
                                assert.equal(value, dummyValue);
                            });
                        }
                    })
                );
            });
        }
    });
    describe('write() w/o connection', function(){
        it('is a function', function(){
            assert.isFunction(avm.write);
        });
    });
    describe('read() w/o connection', function(){
        it('is a function', function(){
            assert.isFunction(avm.read);
        });
    });
});
