import * as chai from "chai";
chai.use(require("chai-as-promised"));
const {assert} = chai;

import { Canarium } from "../src/canarium";
import { BaseComm } from "../src/base_comm";
import { I2CComm } from "../src/i2c_comm";
import { AvsPackets } from "../src/avs_packets";
import { AvmTransactions } from "../src/avm_transactions";
import { RpcClient } from "../src/rpc_client";

const cond = {
    classic_ps: (process.argv.indexOf("--with-classic-ps") >= 0) ? 1 : null,
    classic_as: (process.argv.indexOf("--with-classic-as") >= 0) ? 1 : null,
    classic:    null,
    ngs:        (process.argv.indexOf("--with-ngs") >= 0) ? 1 : null,
    boards:     null,
};
cond.classic = cond.classic_ps + cond.classic_as;
cond.boards  = cond.classic + cond.ngs;

describe("(Test conditions)", () => {
    it("Bench tests (Virtual tests)", () => null);
    it("PERIDOT Classic (PS mode)", cond.classic_ps && (() => null));
    it("PERIDOT Classic (AS mode)", cond.classic_as && (() => null));
    it("PERIDOT NGS", cond.ngs && (() => null));
});
describe("Canarium", () => {
    describe("version", () => {
        it("should be a valid string", () => {
            let canarium = new Canarium();
            assert.match(canarium.version, /^\d+\.\d+\.\d+$/);
        });
    });

    describe("boardInfo", () => {
        it("should be a property", () => {
            let canarium = new Canarium();
            assert.property(canarium, "boardInfo");
        });
    });

    describe("serialBitrate", () => {
        it("should be a number", () => {
            let canarium = new Canarium();
            assert.isNumber(canarium.serialBitrate);
        });
        it("should be writable", () => {
            let canarium = new Canarium();
            let value = canarium.serialBitrate * 2;
            canarium.serialBitrate = value;
            assert.equal(canarium.serialBitrate, value);
        })
    });

    describe("connected", () => {
        it("should be a boolean", () => {
            let canarium = new Canarium();
            assert.isBoolean(canarium.connected);
        });
        it("should be false before connection", () => {
            let canarium = new Canarium();
            assert.isFalse(canarium.connected);
        });
    })

    describe("configured", () => {
        it("should be a boolean", () => {
            let canarium = new Canarium();
            assert.isBoolean(canarium.configured);
        });
        it("should be false before connection", () => {
            let canarium = new Canarium();
            assert.isFalse(canarium.configured);
        });
    });

    describe("base", () => {
        it("should be an instance of BaseComm", () => {
            let canarium = new Canarium();
            assert.instanceOf(canarium.base, BaseComm);
        });
    });

    describe("i2c", () => {
        it("should be an instance of I2CComm", () => {
            let canarium = new Canarium();
            assert.instanceOf(canarium.i2c, I2CComm);
        });
    });

    describe("avs", () => {
        it("should be an instance of AvsPackets", () => {
            let canarium = new Canarium();
            assert.instanceOf(canarium.avs, AvsPackets);
        });
    });

    describe("avm", () => {
        it("should be an instance of AvmTransactions", () => {
            let canarium = new Canarium();
            assert.instanceOf(canarium.avm, AvmTransactions);
        });
    });

    describe("rpcClient", () => {
        it("should be an instance of RpcClient", () => {
            let canarium = new Canarium();
            assert.instanceOf(canarium.rpcClient, RpcClient);
        });
    });

    describe("swiBase", () => {
        it("should be a number", () => {
            let canarium = new Canarium();
            assert.isNumber(canarium.swiBase);
        });
        it("should be writable", () => {
            let canarium = new Canarium();
            let value = canarium.swiBase + 16;
            canarium.swiBase = value;
            assert.equal(canarium.swiBase, value);
        });
    });

    describe("onClosed", () => {
        it("should be a property", () => {
            let canarium = new Canarium();
            assert.property(canarium, "onClosed");
        });
        it("should be writable", () => {
            let canarium = new Canarium();
            let value = () => null;
            canarium.onClosed = value;
            assert.equal(canarium.onClosed, value);
        });
    });

    describe("static enumerate()", () => {
        it("should be a function", () => {
            assert.isFunction(Canarium.enumerate);
        });
        it("should return undefined when called with callback", (done) => {
            assert.isUndefined(Canarium.enumerate((success: boolean, result: any[]) => {
                assert.isTrue(success);
                done();
            }));
        });
        it("should return Promise when called without callback", () => {
            return assert.isFulfilled(Canarium.enumerate());
        });
        let classic = 0, ngs = 0;
        cond.classic_ps && ++classic;
        cond.classic_as && ++classic;
        cond.ngs && ++ngs;
        let len = classic + ngs;
        it(`should fulfill with an array of ${len} item(s)`, () => {
            return Canarium.enumerate().then((result) => {
                assert.isArray(result);
                assert.equal(result.length, len);
            });
        });
        it(`should find ${classic} PERIDOT Classic board(s)`, cond.classic ? () => {
            return Canarium.enumerate().then((result) => {
                let list = result.slice(0, 0 + classic);
                list.every((item) => {
                    assert.equal(item.vendorId, 0x0403);
                    assert.equal(item.productId, 0x6015);
                    return true;
                });
            });
        } : null);
        it(`should find ${ngs} PERIDOT NGS board(s)`, cond.ngs ? () => {
            return Canarium.enumerate().then((result) => {
                let list = result.slice(classic, classic + ngs);
                list.every((item) => {
                    //assert.equal(item.vendorId, 0x0403);
                    //assert.equal(item.productId, 0x6015);
                    return true;
                });
            });
        } : null);
    });

    describe("open()", () => {
        it("should be a function", () => {
            let canarium = new Canarium();
            assert.isFunction(canarium.open);
        });
        it("should return undefined when called with callback", (done) => {
            let canarium = new Canarium();
            assert.isUndefined(canarium.open("xxx", (success: boolean) => {
                assert.isFalse(success);
                done();
            }));
        });
        it("should return undefined when called with boardInfo and callback", (done) => {
            let canarium = new Canarium();
            assert.isUndefined(canarium.open("xxx", {}, (success: boolean) => {
                assert.isFalse(success);
                done();
            }));
        });
        it("should return Promise when called without callback", () => {
            let canarium = new Canarium();
            return assert.isRejected(canarium.open("xxx"));
        });
    })
});