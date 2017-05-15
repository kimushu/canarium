import * as path from "path";
import * as fs from "fs";
import * as chai from "chai";
chai.use(require("chai-as-promised"));
const {assert} = chai;
import { Canarium } from "../src/canarium";

export const TEST_DIR = path.join(__dirname, "..", "..", "test");
export const CLASSIC_RBF_PATH = path.join(TEST_DIR, "peridot_classic", "output_files", "swi_testsuite.rbf");
export const CLASSIC_RBF_DATA = fs.readFileSync(CLASSIC_RBF_PATH);
export const CLASSIC_CLASSID = 0x72a09001;
export const SWI_BASE = 0x10000000;
export const REG_SWI_CLASSID = 0;
export const REG_SWI_MESSAGE = 6;
export const IPL_BASE = 0x0f000000;
export const IPL_SPAN = 4096;

export const cond = {
    classic_ps: <string>null,
    classic_as: <string>null,
    classic:    <string[]>[],
    boards:     <string[]>[],
};

(()=>{
    Canarium.enumerate()
    .then((list) => {
        if (process.argv.indexOf("--with-classic-ps") >= 0) {
            let item = list.shift();
            assert.equal(item.vendorId, 0x0403);
            assert.equal(item.productId, 0x6015);
            cond.classic_ps = item.path;
            cond.classic.push(item.path);
            cond.boards.push(item.path);
        }
        if (process.argv.indexOf("--with-classic-as") >= 0) {
            let item = list.shift();
            assert.equal(item.vendorId, 0x0403);
            assert.equal(item.productId, 0x6015);
            cond.classic_as = item.path;
            cond.classic.push(item.path);
            cond.boards.push(item.path);
        }
        assert.equal(list.length, 0);
        run();
    });
})();

describe("(Test conditions)", function(){
    it("Bench tests (Virtual tests)", function(){});
    it("PERIDOT Classic (PS mode)", function(){
        cond.classic_ps || this.skip();
    });
    it("PERIDOT Classic (AS mode)", function(){
        cond.classic_as || this.skip();
    });
});
