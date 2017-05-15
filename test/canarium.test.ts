import * as chai from "chai";
chai.use(require("chai-as-promised"));
const {assert} = chai;

import * as fs from "fs";
import * as path from "path";

import { Canarium } from "../src/canarium";
import { BaseComm } from "../src/base_comm";
import { I2CComm } from "../src/i2c_comm";
import { AvsPackets } from "../src/avs_packets";
import { AvmTransactions } from "../src/avm_transactions";
import { RpcClient } from "../src/rpc_client";
import { waitPromise } from "../src/common";

const TEST_DIR = path.join(__dirname, "..", "..", "test");
const CLASSIC_RBF_PATH = path.join(TEST_DIR, "peridot_classic", "output_files", "swi_testsuite.rbf");
const CLASSIC_RBF_DATA = fs.readFileSync(CLASSIC_RBF_PATH);
const SWI_BASE = 0x10000000;
const REG_SWI_MESSAGE = 6;

const cond = {
    classic_ps: (process.argv.indexOf("--with-classic-ps") >= 0) ? "x" : null,
    classic_as: (process.argv.indexOf("--with-classic-as") >= 0) ? "x" : null,
    classic:    [],
//  ngs:        (process.argv.indexOf("--with-ngs") >= 0) ? "x" : null,
    boards:     [],
};

describe("(Test conditions)", function(){
    it("Bench tests (Virtual tests)", () => null);
    it("PERIDOT Classic (PS mode)", cond.classic_ps && (() => null));
    it("PERIDOT Classic (AS mode)", cond.classic_as && (() => null));
//  it("PERIDOT NGS", cond.ngs && (() => null));
});
/*
describe("stress test", function(){
    let canarium = new Canarium();
    it("open&close 10 times", function(){
        this.timeout(0);
        function loop(i){
            console.log(i);
            return canarium.open("COM3")
            .then(() => {
                return canarium.close();
            })
            .then(() => {
                if (i < 10) {
                    return loop(i + 1);
                }
            });
        }
        return assert.isFulfilled(loop(0));
    });
});
//-*/
describe("Canarium", function(){
    describe("version", function(){
        let canarium = new Canarium();
        it("should be a string", function(){
            assert.isString(canarium.version);
        });
        it("should have a valid format", function(){
            assert.match(canarium.version, /^\d+\.\d+\.\d+$/);
        });
    });

    describe("boardInfo", function(){
        let canarium = new Canarium();
        it("should be a property", function(){
            assert.property(canarium, "boardInfo");
        });
    });

    describe("serialBitrate", function(){
        let canarium = new Canarium();
        it("should be a number", function(){
            assert.isNumber(canarium.serialBitrate);
        });
        it("should be writable", function(){
            let value = canarium.serialBitrate * 2;
            canarium.serialBitrate = value;
            assert.equal(canarium.serialBitrate, value);
        })
    });

    describe("connected", function(){
        let canarium = new Canarium();
        it("should be a boolean", function(){
            assert.isBoolean(canarium.connected);
        });
        it("should be false before connection", function(){
            assert.isFalse(canarium.connected);
        });
    })

    describe("configured", function(){
        let canarium = new Canarium();
        it("should be a boolean", function(){
            assert.isBoolean(canarium.configured);
        });
        it("should be false before connection", function(){
            assert.isFalse(canarium.configured);
        });
    });

    describe("base", function(){
        let canarium = new Canarium();
        it("should be an instance of BaseComm", function(){
            assert.instanceOf(canarium.base, BaseComm);
        });
    });

    describe("i2c", function(){
        let canarium = new Canarium();
        it("should be an instance of I2CComm", function(){
            assert.instanceOf(canarium.i2c, I2CComm);
        });
    });

    describe("avs", function(){
        let canarium = new Canarium();
        it("should be an instance of AvsPackets", function(){
            assert.instanceOf(canarium.avs, AvsPackets);
        });
    });

    describe("avm", function(){
        let canarium = new Canarium();
        it("should be an instance of AvmTransactions", function(){
            assert.instanceOf(canarium.avm, AvmTransactions);
        });
    });

    describe("rpcClient", function(){
        let canarium = new Canarium();
        it("should be an instance of RpcClient", function(){
            assert.instanceOf(canarium.rpcClient, RpcClient);
        });
    });

    describe("swiBase", function(){
        let canarium = new Canarium();
        it("should be a number", function(){
            assert.isNumber(canarium.swiBase);
        });
        it("should be writable", function(){
            let value = canarium.swiBase + 16;
            canarium.swiBase = value;
            assert.equal(canarium.swiBase, value);
        });
    });

    describe("onClosed", function(){
        let canarium = new Canarium();
        it("should be a property", function(){
            assert.property(canarium, "onClosed");
        });
        it("should be writable", function(){
            let value = () => null;
            canarium.onClosed = value;
            assert.equal(canarium.onClosed, value);
        });
    });

    describe("static enumerate()", function(){
        it("should be a function", function(){
            assert.isFunction(Canarium.enumerate);
        });
        it("should return undefined when called with callback", function(done){
            assert.isUndefined(Canarium.enumerate((success: boolean, result: any[]) => {
                assert.isTrue(success);
                done();
            }));
        });
        let list;
        it("should return Promise<Array> when called without callback", function(){
            return assert.isFulfilled(
                Canarium.enumerate().then((result) => {
                    list = result;
                    assert.isArray(result);
                })
            );
        });
        it("should find PERIDOT Classic board for PS-mode test", cond.classic_ps && (function(){
            let item = list.shift();
            assert.equal(item.vendorId, 0x0403);
            assert.equal(item.productId, 0x6015);
            cond.classic_ps = item.path;
            cond.classic.push(item.path);
            cond.boards.push(item.path);
            console.log(cond.classic_ps)
        }));
        it("should find PERIDOT Classic board for AS-mode test", cond.classic_as && (function(){
            let item = list.shift();
            assert.equal(item.vendorId, 0x0403);
            assert.equal(item.productId, 0x6015);
            cond.classic_as = item.path;
            cond.classic.push(item.path);
            cond.boards.push(item.path);
        }));
        it("should not find any other boards", function(){
            assert.equal(list.length, 0);
        });
    });

    describe("open() w/o connection", function(){
        let canarium = new Canarium();
        it("should be a function", function(){
            assert.isFunction(canarium.open);
        });
        it("should return undefined when called with callback", function(done){
            assert.isUndefined(canarium.open("xxx", (success: boolean) => {
                assert.isFalse(success);
                done();
            }));
        });
        it("should return undefined when called with boardInfo and callback", function(done){
            assert.isUndefined(canarium.open("xxx", {}, (success: boolean) => {
                assert.isFalse(success);
                done();
            }));
        });
        it("should return Promise(rejection) when called with inexistent path and no callback", function(){
            return assert.isRejected(canarium.open("xxx"));
        });
    });
    xdescribe("open() w/ connection", cond.boards && function(){
        let canarium = new Canarium();
        afterEach(function(){
            return canarium.close().catch(() => {});
        });
        it("should fail when called with incorrect board ID", cond.boards && (function(){
            this.slow(3000);
            this.timeout(6000);
            return assert.isRejected(
                canarium.open(cond.boards[0], {id: <any>"J72A_"}),
                "Board ID mismatch"
            );
        }));
        it("should fail when called with incorrect serial code", cond.boards && (function(){
            this.slow(3000);
            this.timeout(6000);
            return assert.isRejected(
                canarium.open(cond.boards[0], {serialcode: "xxxxxx-yyyyyy-zzzzzz"}),
                "Board serial code mismatch"
            );
        }));
        it("should success when called with existent path", cond.boards && (function(){
            this.slow(1000);
            this.timeout(2000);
            return assert.isFulfilled(canarium.open(cond.boards[0]));
        }));
        it("should success with configuration on PERIDOT Classic (PS mode)", cond.classic_ps && (function(){
            this.slow(3000);
            this.timeout(6000);
            return assert.isFulfilled(
                canarium.open(cond.classic_ps, {
                    rbfdata: CLASSIC_RBF_DATA.buffer
                })
            );
        }));
    });
    describe("close() w/o connection", function(){
        let canarium = new Canarium();
        it("should be a function", function(){
            assert.isFunction(canarium.close);
        });
        it("should return undefined when called with callback", function(done){
            assert.isUndefined(canarium.close((success: boolean) => {
                assert.isFalse(success);
                done();
            }));
        });
        it("should return Promise(rejection) when port is not opened", function(){
            return assert.isRejected(canarium.close());
        });
    });
    xdescribe("close() w/ connection", cond.boards && function(){
        let canarium = new Canarium();
        it("should success when port is opened", function(){
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
    describe("config() w/o connection", function(){
        let canarium = new Canarium();
        it("should be a function", function(){
            assert.isFunction(canarium.config);
        });
        it("should return undefined when called with callback", function(done){
            assert.isUndefined(canarium.config(null, new ArrayBuffer(0), (success: boolean) => {
                assert.isFalse(success);
                done();
            }));
        });
        it("should return Promise(rejection) when port is not opened", function(){
            return assert.isRejected(canarium.close());
        });
    });
    xdescribe("config() w/ connection to PERIDOT Classic (PS mode)", cond.classic_ps && function(){
        let canarium = new Canarium();
        before(function(){
            this.slow(1000);
            this.timeout(2000);
            return canarium.open(cond.classic_ps);
        });
        after(function(){
            this.slow(1000);
            this.timeout(2000);
            return canarium.close().catch(() => {});
        });
        it("should success without board constraints", function(){
            this.slow(2000);
            this.slow(4000);
            return assert.isFulfilled(
                canarium.config(null, CLASSIC_RBF_DATA.buffer)
            );
        });
        it("should success with correct board ID constraint", function(){
            this.slow(4000);
            this.slow(8000);
            return assert.isFulfilled(
                canarium.config(
                    {id: "J72A"},
                    CLASSIC_RBF_DATA.buffer
                )
            );
        });
        it("should fail with incorrect board ID constraint", function(){
            this.slow(3000);
            this.slow(6000);
            return assert.isRejected(
                canarium.config(
                    {id: <any>"J72A_"},
                    CLASSIC_RBF_DATA.buffer
                )
            );
        });
        it("should fail with incorrect board serial constraint", function(){
            this.slow(3000);
            this.slow(6000);
            return assert.isRejected(
                canarium.config(
                    {serialcode: "xxxxxx-yyyyyy-zzzzzz"},
                    CLASSIC_RBF_DATA.buffer
                )
            );
        });
    });
    describe("reconfig() w/o connection", function(){
        let canarium = new Canarium();
        it("should be a function", function(){
            assert.isFunction(canarium.reconfig);
        });
        it("should return undefined when called with callback", function(done){
            assert.isUndefined(canarium.reconfig((success: boolean) => {
                assert.isFalse(success);
                done();
            }));
        });
        it("should return Promise(rejection) when port is not opened", function(){
            return assert.isRejected(canarium.reconfig());
        });
    });
    //describe("reconfig() w/ connection", function(){
    //});
    describe("reset() w/o connection", function(){
        let canarium = new Canarium();
        it("should be a function", function(){
            assert.isFunction(canarium.reset);
        });
        it("should return undefined when called with callback", function(done){
            assert.isUndefined(canarium.reset((success: boolean) => {
                assert.isFalse(success);
                done();
            }));
        });
        it("should return Promise(rejection) when port is not opened", function(){
            return assert.isRejected(canarium.reset());
        });
    });
    describe("reset() w/ connection to PERIDOT Classic (PS mode)", cond.classic_ps && function(){
        let canarium = new Canarium();
        it("should success and clear SWI message register", function(){
            this.slow(3000);
            this.timeout(60000);
            let dummyValue = 0xdeadbeef;
            return assert.isFulfilled(
                canarium.open(cond.classic_ps, {rbfdata: CLASSIC_RBF_DATA.buffer})
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