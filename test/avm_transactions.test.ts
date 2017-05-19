import * as chai from 'chai';
chai.use(require('chai-as-promised'));
const {assert} = chai;
import { cond, testdatacol, SWI } from './test-common';

import { Canarium } from '../src/canarium';

describe('AvmTransactions', function(){
    let testdata = testdatacol.classic_ps;
    let { SWI_BASE, SDRAM_BASE, CLASSID } = testdata.info;
    let canarium = new Canarium();
    let avm = canarium.avm;
    before(function(){
        cond.classic_ps || this.skip();
        if (!canarium.connected) {
            this.timeout(5000);
            return canarium.open(cond.classic_ps)
            .then(() => {
                assert.isFalse(canarium.configured);
            });
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
    describe('option() w/o connection', function(){
        it('is a function', function(){
            assert.isFunction(avm.option);
        })
    });
    describe('iord() w/o connection', function(){
        it('is a function', function(){
            assert.isFunction(avm.iord);
        });
    });
    describe('iowr() w/o connection', function(){
        it('is a function', function(){
            assert.isFunction(avm.iowr);
        });
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
    [['iord', [0, 0]], ['iowr', [0, 0, 0]], ['read', [0, 4]], ['write', [0, Buffer.alloc(4)]]].forEach((x) => {
        let fn = <string>x[0];
        let args = <any[]>x[1];
        describe(`${fn}() before configuration`, function(){
            let msg = 'Device is not configured';
            it('returns undefined and fails when called before configuration', function(done){
                assert.isUndefined(avm[fn](...args, (success: boolean, error: Error) => {
                    assert.isFalse(success);
                    assert.instanceOf(error, Error);
                    assert.include(`${error}`, msg);
                    done();
                }));
            });
            it('returns Promise(rejected) when called before configuration', function(){
                return assert.isRejected(avm[fn](...args), msg);
            });
        });
    });
    describe('prepare for read/write tests', function(){
        it('configuration', function(){
            this.slow(1000);
            return assert.isFulfilled(canarium.config(null, testdata.fpga_output_data));
        });
    });
    describe('option() w/ connection', function(){
        it('returns undefined and succeeds when called with callback', function(done){
            assert.isUndefined(avm.option({}, (success: boolean) => {
                assert.isTrue(success);
                done();
            }));
        });
        it('returns Promise(fulfilled) when called without callback', function(){
            return assert.isFulfilled(
                avm.option({})
            );
        });
    });
    describe('iord() w/ connection', function(){
        it('returns undefined and succeeds when called with callback', function(done){
            assert.isUndefined(avm.iord(SWI_BASE, SWI.REG_CLASSID, (success: boolean) => {
                assert.isTrue(success);
                done();
            }));
        });
        it('returns Promise(fulfilled) when called without callback', function(){
            return assert.isFulfilled(
                avm.iord(SWI_BASE, SWI.REG_CLASSID)
            );
        });
        it('succeeds with correct value (offset=1)', function(){
            return assert.isFulfilled(
                avm.iord(SWI_BASE - 4, SWI.REG_CLASSID + 1)
                .then((value) => {
                    assert.equal(value, CLASSID);
                })
            );
        });
        for (let byteoffset = 0; byteoffset <= 4; ++byteoffset) {
            it(`succeeds with correct value (byteoffset=${byteoffset})`, function(){
                return assert.isFulfilled(
                    avm.iord(SWI_BASE + byteoffset, SWI.REG_CLASSID)
                    .then((value) => {
                        if (byteoffset < 4) {
                            assert.equal(value, CLASSID);
                        } else {
                            assert.notEqual(value, CLASSID);
                        }
                    })
                );
            });
        }
    });
    describe('iowr() w/ connection', function(){
        let scratch_base = SDRAM_BASE + 8;
        it('returns undefined and succeeds when called with callback', function(done){
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
    describe('iowr() and iord() queueing', function(){
        it('queued in the order of calling', function(){
            let p1, p2, p3;
            let dummyValue1 = 0xdeadbeef;
            let dummyValue2 = 0x7d7dcafe;
            return assert.isFulfilled(
                avm.iowr(SDRAM_BASE, 0, dummyValue1)
                .then(() => {
                    p1 = avm.iord(SDRAM_BASE, 0);
                    p2 = avm.iowr(SDRAM_BASE, 0, dummyValue2);
                    p3 = avm.iord(SDRAM_BASE, 0);
                    return p1;
                })
                .then((value) => {
                    assert.equal(value, dummyValue1);
                    return p3;
                })
                .then((value) => {
                    assert.equal(value, dummyValue2);
                    return p2;
                })
            );
        });
    });
    let largeData: Buffer;
    describe('write() w/ connection', function(){
        it('returns undefined and succeeds when called with callback', function(done){
            assert.isUndefined(avm.write(SDRAM_BASE, Buffer.alloc(64), (success: boolean) => {
                assert.isTrue(success);
                done();
            }));
        });
        it('returns Promise(fulfilled) when called without callback', function(){
            return assert.isFulfilled(
                avm.write(SDRAM_BASE, Buffer.alloc(64).fill('0'))
            );
        });
        it('succeeds for zero-byte write', function(){
            return assert.isFulfilled(avm.write(SDRAM_BASE, Buffer.alloc(0)));
        });
        it('succeeds for unaligned address', function(){
            return assert.isFulfilled(
                avm.write(SDRAM_BASE + 3, Buffer.alloc(6).fill('1'))
                .then(() => {
                    return Promise.all([
                        avm.iord(SDRAM_BASE, 0),
                        avm.iord(SDRAM_BASE, 1),
                        avm.iord(SDRAM_BASE, 2),
                    ])
                })
                .then((values) => {
                    assert.equal(values[0], 0x31303030);
                    assert.equal(values[1], 0x31313131);
                    assert.equal(values[2], 0x30303031);
                })
            );
        });
        it('succeeds for large data (> 32kbytes)', function(){
            this.slow(500);
            largeData = Buffer.allocUnsafe(64*1024);
            for (let i = 0; i < largeData.length; i += 2) {
                largeData.writeUInt16LE(i & 0xffff, i);
            }
            return assert.isFulfilled(
                avm.write(SDRAM_BASE, largeData)
            );
        });
    });
    describe('read() w/ connection', function(){
        it('returns undefined and succeeds when called with callback', function(done){
            assert.isUndefined(avm.read(SDRAM_BASE, 64, (success: boolean, readdata: Buffer) => {
                assert.isTrue(success);
                done();
            }));
        });
        it('returns Promise(fulfilled) when called without callback', function(){
            return assert.isFulfilled(
                avm.read(SDRAM_BASE, 64)
            );
        });
        it('succeeds and returns empty buffer for zero-byte read', function(){
            return assert.isFulfilled(
                avm.read(SDRAM_BASE, 0)
                .then((readdata) => {
                    assert.equal(readdata.length, 0);
                })
            )
        });
        it('succeeds for unaligned access', function(){
            return assert.isFulfilled(
                avm.read(SDRAM_BASE + 3, 6)
                .then((readdata) => {
                    assert.equal(readdata.compare(largeData.slice(3, 3 + 6)), 0);
                })
            )
        });
        it('succeeds for large data (> 32kbytes)', function(){
            this.slow(500);
            return assert.isFulfilled(
                avm.read(SDRAM_BASE, largeData.length)
                .then((readdata) => {
                    assert.equal(readdata.compare(largeData), 0);
                })
            )
        });
    });
});
