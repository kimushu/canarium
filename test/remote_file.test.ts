import { Canarium, assert, cond, testdatacol, writeElf, SWI } from './test-common';

describe('RemoteFile', function(){
    let testdata = testdatacol.classic_ps;
    let { SWI_BASE, SDRAM_BASE, CLASSID, RESET_BASE } = testdata.info;
    let canarium = new Canarium();
    before(function(){
        cond.classic_ps || this.skip();
        if (!canarium.connected) {
            this.timeout(5000);
            return canarium.open(cond.classic_ps, {rbfdata: testdata.fpga_output_data});
        }
    });
    after(function(){
        if (canarium.connected) {
            return canarium.close();
        }
    });
    describe('prepare for tests w/o server', function(){
        it('reset Nios II', function(){
            return assert.isFulfilled(canarium.avm.iowr(RESET_BASE, 0, 1));
        });
    });
    describe('prepare for tests w/ server', function(){
        it('reset Nios II', function(){
            return assert.isFulfilled(canarium.avm.iowr(RESET_BASE, 0, 1));
        });
        it('write server program (clientfs)', function(){
            return assert.isFulfilled(writeElf(canarium, testdata.apps.clientfs));
        });
        it('start Nios II', function(){
            return assert.isFulfilled(canarium.avm.iowr(RESET_BASE, 0, 0));
        });
    });
    describe('open() w/ server', function(){
        let file: Canarium.RemoteFile;
        afterEach(function(){
            let f = file;
            file = null;
            if (f) {
                return f.close();
            }
        });
        this.slow(300);
        it('fails (ENOENT) for reading of non-existent file', function(){
            return assert.isFulfilled(
                canarium.openRemoteFile('/non/existent', {O_RDONLY: true}, 0, null, 100)
                .then((file) => {
                    file.close();
                    assert.fail();
                }, (error: Canarium.RemoteError) => {
                    assert.equal(error.code, Canarium.RemoteError.ENOENT);
                })
            );
        });
        it('succeeds for reading of existent readable file', function(){
            return assert.isFulfilled(
                canarium.openRemoteFile('/foo/bar1', {O_RDONLY: true}, 0, null, 100)
                .then((f) => {
                    file = f;
                })
            );
        });
        it('succeeds for writing of ')
    });
    describe('cleanup', function(){
        it('delay for suppress disconnect error during poll', function(done){
            this.slow(2000);
            this.timeout(2000);
            global.setTimeout(done, 500);
        });
    });
});
