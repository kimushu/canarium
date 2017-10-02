import { Canarium, assert, cond, testdatacol, writeElf, SWI } from './test-common';
import { waitPromise } from '../src/common';

function rejectedWithRemoteError(promise: Promise<any>, code: number): Promise<any> {
    return promise.then((result) => {
        assert.fail();
    }, (error: Canarium.RemoteError) => {
        assert.instanceOf(error, Canarium.RemoteError);
        assert.equal(error.code, code);
    });
}

describe('RemoteFile', function(){
    let testdata = testdatacol.classic_ps;
    let { SWI_BASE, SDRAM_BASE, CLASSID, RESET_BASE } = testdata.info;
    let canarium = new Canarium();
    let answer: Buffer;
    let autoCloseFile: Canarium.RemoteFile;
    let largerLen = 2048;   // Must be larger than max packet size
    before(function(){
        cond.classic_ps || this.skip();
        answer = Buffer.allocUnsafe(128*1024);
        for (let i = 0; i < answer.length; i += 2) {
            answer.writeUInt16LE(i >>> 1, i);
        }
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
    afterEach(function(){
        let file = autoCloseFile;
        autoCloseFile = null;
        return file && file.close();
    });
    describe('prepare for tests w/o server', function(){
        it('reset Nios II', function(){
            return assert.isFulfilled(canarium.avm.iowr(RESET_BASE, 0, 1));
        });
    });
    describe('open() w/o server', function(){
        it('fails with RPC timeout', function(){
            this.slow(1000);
            return assert.isRejected(
                Canarium.RemoteFile.open(canarium.rpcClient, '/foo/bar', 0, 0, 500, 100),
                'RPC timeout'
            );
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
            this.slow(300);
            return assert.isFulfilled(canarium.avm.iowr(RESET_BASE, 0, 0))
            .then(() => waitPromise(100));
        });
    });
    describe('open() w/ server', function(){
        this.slow(500);
        function openTest(mode: string, type: string, path: string, code?: string){
            it(`${code != null ? `fails (${code})` : 'succeeds'} for ${mode} access of ${type}`, function(){
                let flags: Canarium.FileOpenFlags = {};
                flags[mode] = true;
                let p = Canarium.RemoteFile.open(canarium.rpcClient, path, flags, 0, 500, 100)
                        .then((f) => autoCloseFile = f);
                if (code != null) {
                    p = rejectedWithRemoteError(p, Canarium.RemoteError[code]);
                }
                return assert.isFulfilled(p);
            });
        }
        openTest('O_RDONLY', 'non-existent', '/non/such/file', 'EACCES');
        openTest('O_RDONLY', 'readonly', '/foo/bar1');
        openTest('O_WRONLY', 'readonly', '/foo/bar1', 'EACCES');
        openTest('O_RDWR',   'readonly', '/foo/bar1', 'EACCES');
        openTest('O_RDONLY', 'writeonly', '/foo/bar2', 'EACCES');
        openTest('O_WRONLY', 'writeonly', '/foo/bar2');
        openTest('O_RDWR',   'writeonly', '/foo/bar2', 'EACCES');
        openTest('O_RDONLY', 'full-access', '/foo/bar3');
        openTest('O_WRONLY', 'full-access', '/foo/bar3');
        openTest('O_RDWR',   'full-access', '/foo/bar3');
    });
    describe('read() w/ server', function(){
        this.slow(1000);
        it('succeeds with correct data on readable fd (w/o continue)', function(){
            return canarium.openRemoteFile('/foo/bar3', {O_RDONLY: true}, 0, 500, 100)
            .then((f) => (autoCloseFile = f).read(largerLen))
            .then((readdata) => {
                assert.isBelow(readdata.length, largerLen);
                assert.equal(readdata.compare(answer, 0, readdata.length), 0);
            });
        });
        it('succeeds with correct data on readable fd (w/continue)', function(){
            return canarium.openRemoteFile('/foo/bar3', {O_RDONLY: true}, 0, 500, 50)
            .then((f) => (autoCloseFile = f).read(largerLen, true))
            .then((readdata) => {
                assert.equal(readdata.length, largerLen);
                assert.equal(readdata.compare(answer, 0, readdata.length), 0);
            });
        });
        it('fails (EACCES) on non-readable fd', function(){
            return rejectedWithRemoteError(
                canarium.openRemoteFile('/foo/bar3', {O_WRONLY: true}, 0, 500, 100)
                .then((f) => (autoCloseFile = f).read(1)),
                Canarium.RemoteError.EACCES
            );
        });
    });
    xdescribe('write() w/ server', function(){
        let altered: Buffer;
        let verify: boolean;
        before(function(){
            altered = Buffer.allocUnsafe(answer.length);
            for (let i = 0; i < altered.length; ++i) {
                altered[i] = answer[i] ^ 0xff;
            }
        });
        it('fails (EACCES) on non-writable fd', function(){
            return rejectedWithRemoteError(
                canarium.openRemoteFile('/foo/bar3', {O_RDONLY: true}, 0, 500, 100)
                .then((f) => (autoCloseFile = f).write(Buffer.alloc(1))),
                Canarium.RemoteError.EACCES
            );
        });
        let prev_written: number;
        verify = false;
        it('succeeds on writable fd (w/o continue)', function(){
            return canarium.openRemoteFile('/foo/bar3', {O_RDWR: true}, 0, 500, 100)
            .then((f) => (autoCloseFile = f).write(altered.slice(0, largerLen)))
            .then((written) => {
                assert.isBelow(written, largerLen);
                prev_written = written;
                verify = true;
            });
        });
        it('verify previous write()', function(){
            verify || this.skip();
            return canarium.openRemoteFile('/foo/bar3', {O_RDONLY: true}, 0, 500, 100)
            .then((f) => (autoCloseFile = f).read(largerLen, true))
            .then((readdata) => {
                assert.equal(readdata.compare(altered, 0, prev_written, 0, prev_written), 0);
                assert.equal(readdata.compare(answer, prev_written, largerLen), 0);
            });
        });
        verify = false;
        it('succeeds on writable fd (w/continue)', function(){
            return canarium.openRemoteFile('/foo/bar3', {O_RDWR: true}, 0, 500, 100)
            .then((f) => (autoCloseFile = f).write(altered.slice(0, largerLen), true))
            .then((written) => {
                assert.equal(written, largerLen);
                verify = true;
            });
        });
        it('verify previous write()', function(){
            verify || this.skip();
            return canarium.openRemoteFile('/foo/bar3', {O_RDONLY: true}, 0, 500, 100)
            .then((f) => (autoCloseFile = f).read(largerLen, true))
            .then((readdata) => {
                assert.equal(readdata.compare(altered, 0, largerLen), 0);
            });
        });
    });
    describe('cleanup', function(){
        it('delay for suppress disconnect error during poll', function(done){
            this.slow(2000);
            this.timeout(2000);
            global.setTimeout(done, 500);
        });
    });
});
