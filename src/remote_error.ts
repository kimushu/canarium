const MESSAGES = {
    '-32700': 'Parse error',
    '-32600': 'Invalid request',
    '-32601': 'Method not found',
    '-32602': 'Invalid params',
    '-32603': 'Internal error',
           1: 'Operation not permitted',
           2: 'No such file or directory',
           5: 'Input/output error',
           9: 'Bad file number',
          11: 'Operation would block',
          12: 'Not enough space',
          13: 'Permission denied',
          16: 'Device or resource busy',
          17: 'File exists',
          19: 'No such device',
          20: 'Not a directory',
          21: 'Is a directory',
          22: 'Invalid argument',
          24: 'Too many open files',
          28: 'No space left on device',
          88: 'Function not implemented',
         133: 'Stale file handle',
         134: 'Not supported',
         140: 'Operation cancelled',
};

/**
 * PERIDOTボード側のエラーを表現するクラス
 */
export class RemoteError extends Error {
    /**
     * エラー番号(PERIDOTボード側システムのerrno値、またはJSON-RPC仕様で定義された値)
     */
    code: number;

    /**
     * エラーの付属情報
     */
    data?: any;

    /** Operation not permitted */      static get EPERM() { return 1; }
    /** No such file or directory */    static get ENOENT() { return 2; }
    /** Input/output error */           static get EIO() { return 5; }
    /** Bad file number */              static get EBADF() { return 9; }
    /** Operation would block */        static get EAGAIN() { return 11; }
    /** Not enough space */             static get ENOMEM() { return 12; }
    /** Permission denied */            static get EACCES() { return 13; }
    /** Device or resource busy */      static get EBUSY() { return 16; }
    /** File exists */                  static get EEXIST() { return 17; }
    /** No such device */               static get ENODEV() { return 19; }
    /** Not a directory */              static get ENOTDIR() { return 20; }
    /** Is a directory */               static get EISDIR() { return 21; }
    /** Invalid argument */             static get EINVAL() { return 22; }
    /** Too many open files */          static get EMFILE() { return 24; }
    /** No space left on device */      static get ENOSPC() { return 28; }
    /** Function not implemented */     static get ENOSYS() { return 88; }
    /** Stale file handle */            static get ESTALE() { return 133; }
    /** Not supported */                static get ENOTSUP() { return 134; }
    /** Operation cancelled */          static get ECANCELED() { return 140; }

    /**
     * コンストラクタ(エラーオブジェクトを生成)
     *
     * @param obj JSON-RPCエラー情報
     */
    constructor(obj: any) {
        if (typeof(obj) === 'number') {
            obj = {
                code: obj,
                message: MESSAGES[obj]
            };
        } else if (obj == null) {
            obj = {};
        }
        super(obj.message);
        Object.setPrototypeOf(this, new.target.prototype);

        this.code = obj.code;
        this.data = obj.data;
        Object.freeze(this.data);
    }
}
