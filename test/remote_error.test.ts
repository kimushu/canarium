import { Canarium, assert } from './test-common';

describe('RemoteError', function(){
    const { RemoteError } = Canarium;
    const DEFINES = [
        'EPERM',
        'ENOENT',
        'EIO',
        'EBADF',
        'EAGAIN',
        'ENOMEM',
        'EACCES',
        'EBUSY',
        'EEXIST',
        'ENODEV',
        'ENOTDIR',
        'EISDIR',
        'EINVAL',
        'EMFILE',
        'ENOSPC',
        'ENOSYS',
        'ESTALE',
        'ENOTSUP',
        'ECANCELED',
    ];
    it('is an instance of Error', function(){
        let e = new RemoteError(null);
        assert.instanceOf(e, Error);
    })
    DEFINES.forEach((def) => {
        it(`has ${def} property with number value`, function(){
            assert.isNumber(RemoteError[def]);
        });
        it(`has a message for ${def}`, function(){
            let e = new RemoteError(RemoteError[def]);
            assert.isString(e.message);
            assert.isAbove(e.message.length, 0);
        });
    });
});
