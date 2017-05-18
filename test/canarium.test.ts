import * as chai from "chai";
chai.use(require("chai-as-promised"));
const {assert} = chai;
import { cond, CLASSIC_RBF_DATA, SWI_BASE, REG_SWI_MESSAGE } from "./test-common";

import { Canarium } from "../src/canarium";
import { BaseComm } from "../src/base_comm";
import { I2CComm } from "../src/i2c_comm";
import { AvsPackets } from "../src/avs_packets";
import { AvmTransactions } from "../src/avm_transactions";
import { RpcClient } from "../src/rpc_client";
import { waitPromise } from "../src/common";

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

    describe("connected w/o connection", function(){
        let canarium = new Canarium();
        it("should be a boolean", function(){
            assert.isBoolean(canarium.connected);
        });
        it("should be false before connection", function(){
            assert.isFalse(canarium.connected);
        });
    })

    describe("connected w/ connection", function(){
        let canarium = new Canarium();
        before(function(){
            cond.boards[0] || this.skip();
        });
        it("should be true after connection", function(){
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
        it("should be false after disconnection", function(){
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
    describe("open() w/ connection", function(){
        let canarium = new Canarium();
        before(function(){
            cond.boards[0] || this.skip();
        });
        afterEach(function(){
            return canarium.close().catch(() => {});
        });
        it("should fail when called with incorrect board ID", function(){
            cond.boards[0] || this.skip();
            this.slow(2000);
            this.timeout(4000);
            return assert.isRejected(
                canarium.open(cond.boards[0], {id: <any>"J72A_"}),
                "Board ID mismatch"
            );
        });
        it("should fail when called with incorrect serial code", function(){
            cond.boards[0] || this.skip();
            this.slow(2000);
            this.timeout(4000);
            return assert.isRejected(
                canarium.open(cond.boards[0], {serialcode: "xxxxxx-yyyyyy-zzzzzz"}),
                "Board serial code mismatch"
            );
        });
        it("should success when called with existent path", function(){
            cond.boards[0] || this.skip();
            this.slow(1000);
            this.timeout(2000);
            return assert.isFulfilled(canarium.open(cond.boards[0]));
        });
        it("should success with configuration on PERIDOT Classic (PS mode)", function(){
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
    describe("close() w/ connection", function(){
        let canarium = new Canarium();
        before(function(){
            cond.boards[0] || this.skip();
        });
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
            assert.isUndefined(canarium.config(null, Buffer.alloc(0), (success: boolean) => {
                assert.isFalse(success);
                done();
            }));
        });
        it("should return Promise(rejection) when port is not opened", function(){
            return assert.isRejected(canarium.close());
        });
    });
    describe("config() w/ connection to PERIDOT Classic (PS mode)", function(){
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
        it("should success without board constraints", function(){
            this.slow(2000);
            this.timeout(4000);
            return assert.isFulfilled(
                canarium.config(null, CLASSIC_RBF_DATA)
            );
        });
        it("should success with correct board ID constraint", function(){
            this.slow(3000);
            this.timeout(6000);
            return assert.isFulfilled(
                canarium.config(
                    {id: "J72A"},
                    CLASSIC_RBF_DATA
                )
            );
        });
        it("should fail with incorrect board ID constraint", function(){
            this.slow(2000);
            this.timeout(4000);
            return assert.isRejected(
                canarium.config(
                    {id: <any>"J72A_"},
                    CLASSIC_RBF_DATA
                )
            );
        });
        it("should fail with incorrect board serial constraint", function(){
            this.slow(2000);
            this.timeout(4000);
            return assert.isRejected(
                canarium.config(
                    {serialcode: "xxxxxx-yyyyyy-zzzzzz"},
                    CLASSIC_RBF_DATA
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
    describe("reset() w/ connection to PERIDOT Classic (PS mode)", function(){
        let canarium = new Canarium();
        before(function(){
            cond.classic_ps || this.skip();
        });
        it("should success and clear SWI message register", function(){
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