import { CanariumGen2, assert } from '../test-common';

describe('Canarium', function(){
    let canarium: CanariumGen2;
    let portPath: string;

    describe('list', function(){
        it('is a function', function(){
            assert.isFunction(CanariumGen2.list);
        });
        it('returns one or more port(s)', function(){
            return assert.isFulfilled(
                CanariumGen2.list()
                .then((ports) => {
                    assert.isAtLeast(ports.length, 1);
                    portPath = ports[0].path;
                    assert.isString(portPath);
                })
            );
        });
    });

    describe('constructor', function(){
        it('succeeds', function(){
            canarium = new CanariumGen2(portPath);
        });
    });

    describe('open', function(){
        it('is a function', function(){
            assert.isFunction(canarium.open);
        });
        it('succeeds', function(){
            return assert.isFulfilled(canarium.open());
        });
    });

    describe('avm', function(){
        describe('iord', function(){
            it('succeeds', function(){
                let promise = canarium.avm.iord(0x10000000, 0)
                .then((value) => {
                    assert.equal(value, 0x72a05201);
                });
                return assert.isFulfilled(promise);
            });
        });
    });

    describe('rpcClient', function(){
        let client: CanariumGen2.RpcClient;
        it('succeeds construction', function(){
            client = canarium.createRpcClient(1);
        });
        it('fails with unknown method', function(){
            return assert.isRejected(
                client.call('test', {hoge: 1234}),
                'Method not found'
            );
        });
    });
});

run();
