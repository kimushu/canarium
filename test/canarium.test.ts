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

const CLASSIC_RBF = path.join(__dirname, "..", "..", "test", "peridot_classic", "output_files", "swi_testsuite.rbf");

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

    describe("open()", function(){
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
        it("should return Promise and reject when called with inexistent path and no callback", function(){
            return assert.isRejected(canarium.open("xxx"));
        });
        it("should fail when called with incorrect board ID", cond.boards && (function(){
            this.slow(3000);
            this.timeout(5000);
            return assert.isRejected(
                canarium.open(cond.boards[0], {id: <any>"J72A_"}),
                "Board ID mismatch"
            );
        }));
        it("should fail when called with incorrect serial code", cond.boards && (function(){
            this.slow(3000);
            this.timeout(5000);
            return assert.isRejected(
                canarium.open(cond.boards[0], {serialcode: "xxxxxx-yyyyyy-zzzzzz"}),
                "Board serial code mismatch"
            );
        }));
        it("should success when called with existent path", cond.boards && (function(){
            this.slow(1000);
            this.timeout(3000);
            return assert.isFulfilled(
                canarium.open(cond.boards[0])
                .then(() => {
                    return canarium.close();
                })
            );
        }));
        it("should success with configuration on PERIDOT Classic (PS mode)", cond.classic_ps && (function(){
            this.slow(3000);
            this.timeout(5000);
            return assert.isFulfilled(
                canarium.open(cond.classic_ps, {
                    rbfdata: fs.readFileSync(CLASSIC_RBF).buffer
                })
                .then(() => {
                    return canarium.close();
                })
            );
        }));
    })
});