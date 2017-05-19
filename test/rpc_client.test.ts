import { Canarium, assert, cond, testdatacol, writeElf, SWI } from './test-common';
import { waitPromise } from '../src/common';

describe('RpcClient', function(){
    let testdata = testdatacol.classic_ps;
    let { SWI_BASE, SDRAM_BASE, CLASSID, RESET_BASE } = testdata.info;
    let canarium = new Canarium();
    let { rpcClient } = canarium;
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
    describe('doCall() w/o server', function(){
        it('is a function', function(){
            assert.isFunction(rpcClient.doCall);
        });
        it('fails with timeout error', function(){
            this.slow(1000);
            return assert.isRejected(rpcClient.doCall('test', {}, 500, 100), 'RPC timeout');
        });
    });
    describe('resetConnection() w/o server', function(){
        it('is a function', function(){
            assert.isFunction(rpcClient.resetConnection);
        });
        it('succeeds and pending request with reset error', function(){
            this.slow(300);
            return Promise.all([
                assert.isRejected(
                    rpcClient.doCall('test', {}, null, 5000), 'has been reset'
                ),
                assert.isFulfilled(
                    waitPromise(100).then(() => rpcClient.resetConnection())
                )
            ]);
        })
    });
    describe('prepare for tests w/ server', function(){
        it('reset Nios II', function(){
            return assert.isFulfilled(canarium.avm.iowr(RESET_BASE, 0, 1));
        });
        it('write server program (rpcsrv)', function(){
            return assert.isFulfilled(writeElf(canarium, testdata.apps.rpcsrv));
        });
        it('start Nios II', function(){
            return assert.isFulfilled(canarium.avm.iowr(RESET_BASE, 0, 0));
        });
    });
    describe('doCall() w/ server', function(){
        it('fails with ENOSYS error when non-existent method used', function(){
            this.slow(500);
            return assert.isFulfilled(
                rpcClient.doCall('xxx', {}, null, 100)
                .then(() => {
                    assert.fail();
                }, (error) => {
                    assert.equal(error.code, Canarium.RemoteError.ENOSYS);
                })
            );
        });
        it('succeeds with correct result for "echo" method', function(){
            let dummyData = {a: 1, b: [2, 3, 4], c: {d: 567}};
            this.slow(500);
            return assert.isFulfilled(
                rpcClient.doCall('echo', dummyData, null, 100)
                .then((result) => {
                    assert.deepEqual(result, dummyData);
                })
            );
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
