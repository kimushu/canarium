import { AvsReadableStream, AvsWritableStream } from './avs_streams';
import { EventEmitter } from 'events';
import { invokeCallback } from './util';
import * as BSON from 'bson';

/**
 * JSON-RPC仕様バージョン
 */
const JSONRPC_VERSION = '2.0';

/**
 * JSON-RPC仕様で定義されたエラーコード
 */
const JSONRPC_ERR_PARSE_ERROR       = -32700;
const JSONRPC_ERR_INVALID_REQUEST   = -32600;
const JSONRPC_ERR_METHOD_NOT_FOUND  = -32601;
const JSONRPC_ERR_INVALID_PARAMS    = -32602;
const JSONRPC_ERR_INTERNAL_ERROR    = -32603;

/**
 * メッセージと説明文字列のマップ
 */
const ERROR_MESSAGES = {
    1:  'EPERM (Not owner)',
    2:  'ENOENT (No such file or directory)',
    3:  'ESRCH (No such process)',
    4:  'EINTR (Interrupted system call)',
    5:  'EIO (I/O error)',
    6:  'ENXIO (No such device or address)',
    7:  'E2BIG (Arg list too long)',
    8:  'ENOEXEC (Exec format error)',
    9:  'EBADF (Bad file number)',
    10: 'ECHILD (No children)',
    11: 'EAGAIN (No more processes)',
    12: 'ENOMEM (Not enough space)',
    13: 'EACCES (Permission denied)',
    14: 'EFAULT (Bad address)',
    16: 'EBUSY (Device or resource busy)',
    17: 'EEXIST (File exists)',
    18: 'EXDEV (Cross-device link)',
    19: 'ENODEV (No such device)',
    20: 'ENOTDIR (Not a directory)',
    21: 'EISDIR (Is a directory)',
    22: 'EINVAL (Invalid argument)',
    23: 'ENFILE (Too many open files in system)',
    24: 'EMFILE (File descriptor value too large)',
    25: 'ENOTTY (Not a character device)',
    26: 'ETXTBSY (Text file busy)',
    27: 'EFBIG (File too large)',
    28: 'ENOSPC (No space left on device)',
    29: 'ESPIPE (Illegal seek)',
    30: 'EROFS (Read-only file system)',
    31: 'EMLINK (Too many links)',
    32: 'EPIPE (Broken pipe)',
    33: 'EDOM (Math arg out of domain of func)',
    34: 'ERANGE (Math result not representable)',
    35: 'ENOMSG (No message of desired type)',
    36: 'EIDRM (Identifier removed)',
    45: 'EDEADLK (Deadlock)',
    46: 'ENOLCK (No lock)',
    60: 'ENOSTR (Not a stream)',
    61: 'ENODATA (No data (for no delay io))',
    62: 'ETIME (Stream ioctl timeout)',
    63: 'ENOSR (No stream resources)',
    67: 'ENOLINK (Virtual circuit is gone)',
    71: 'EPROTO (Protocol error)',
    74: 'EMULTIHOP (Multihop attempted)',
    77: 'EBADMSG (Bad message)',
    79: 'EFTYPE (Inappropriate file type or format)',
    88: 'ENOSYS (Function not implemented)',
    90: 'ENOTEMPTY (Directory not empty)',
    91: 'ENAMETOOLONG (File or path name too long)',
    92: 'ELOOP (Too many symbolic links)',
    95: 'EOPNOTSUPP (Operation not supported on socket)',
    96: 'EPFNOSUPPORT (Protocol family not supported)',
    104:'ECONNRESET (Connection reset by peer)',
    105:'ENOBUFS (No buffer space available)',
    106:'EAFNOSUPPORT (Address family not supported by protocol family)',
    107:'EPROTOTYPE (Protocol wrong type for socket)',
    108:'ENOTSOCK (Socket operation on non-socket)',
    109:'ENOPROTOOPT (Protocol not available)',
    111:'ECONNREFUSED (Connection refused)',
    112:'EADDRINUSE (Address already in use)',
    113:'ECONNABORTED (Software caused connection abort)',
    114:'ENETUNREACH (Network is unreachable)',
    115:'ENETDOWN (Network interface is not configured)',
    116:'ETIMEDOUT (Connection timed out)',
    117:'EHOSTDOWN (Host is down)',
    118:'EHOSTUNREACH (Host is unreachable)',
    119:'EINPROGRESS (Connection already in progress)',
    120:'EALREADY (Socket already connected)',
    121:'EDESTADDRREQ (Destination address required)',
    122:'EMSGSIZE (Message too long)',
    123:'EPROTONOSUPPORT (Unknown protocol)',
    125:'EADDRNOTAVAIL (Address not available)',
    126:'ENETRESET (Connection aborted by network)',
    127:'EISCONN (Socket is already connected)',
    128:'ENOTCONN (Socket is not connected)',
    129:'ETOOMANYREFS',
    132:'EDQUOT',
    133:'ESTALE',
    134:'ENOTSUP (Not supported)',
    138:'EILSEQ (Illegal byte sequence)',
    139:'EOVERFLOW (Value too large for defined data type)',
    140:'ECANCELED (Operation canceled)',
    141:'ENOTRECOVERABLE (State not recoverable)',
    142:'EOWNERDEAD (Previous owner died)',
};
ERROR_MESSAGES[JSONRPC_ERR_PARSE_ERROR] = 'Parse error';
ERROR_MESSAGES[JSONRPC_ERR_INVALID_REQUEST] = 'Invalid request';
ERROR_MESSAGES[JSONRPC_ERR_METHOD_NOT_FOUND] = 'Method not found';
ERROR_MESSAGES[JSONRPC_ERR_INVALID_PARAMS] = 'Invalid parameters';
ERROR_MESSAGES[JSONRPC_ERR_INTERNAL_ERROR] = 'Internal error';

/**
 * リクエスト構造体
 * (idに紐付けてPromiseのコールバック関数を保持する)
 */
interface Request {
    resolve: Function;
    reject: Function;
}

/**
 * 応答待ちリクエストのマップ
 */
interface RequestPool {
    [id: number]: Request;
}

/**
 * RPC関連エラークラス
 */
export class RpcError extends Error {
    public code: number;

    /**
     * エラーオブジェクトを生成
     * @param message メッセージ
     * @param code エラーコード
     */
    constructor(message?: string, code?: number) {
        if (message == null) {
            message = ERROR_MESSAGES[code];
        }
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = new.target.name;
        this.code = code;
    }

    get PARSE_ERROR()        { return JSONRPC_ERR_PARSE_ERROR; }
    get INVALID_REQUEST()    { return JSONRPC_ERR_INVALID_REQUEST; }
    get METHOD_NOT_FOUND()   { return JSONRPC_ERR_METHOD_NOT_FOUND; }
    get INVALID_PARAMS()     { return JSONRPC_ERR_INVALID_PARAMS; }
    get INTERNAL_ERROR()     { return JSONRPC_ERR_INTERNAL_ERROR; }
}

/**
 * RPCクライアント管理クラス
 */
export class RpcClient extends EventEmitter {
    private _bson = new BSON.BSON();
    private _lastId: number;
    private _requests: RequestPool = {};

    /**
     * RPCクライアントを生成
     * @param _writable 書き込み(出力)側ストリーム
     * @param _readable 読み込み(入力)側ストリーム
     */
    constructor(private _writable: AvsWritableStream, private _readable: AvsReadableStream) {
        super();
        this._writable.once('close', this.emit.bind(this, 'close'));
        this._writable.on('error', this.emit.bind(this, 'error'));
        this._readable.on('error', this.emit.bind(this, 'error'));
        this._readable.on('data', this._receiveHandler.bind(this));
    }

    /**
     * リモート呼び出し
     * @param method    呼び出すメソッド名
     * @param params    パラメータのオブジェクト
     */
    call<T = any>(method: string, params: any): Promise<T>;

    /**
     * リモート呼び出し
     * @param method    呼び出すメソッド名
     * @param params    パラメータのオブジェクト
     * @param callback  コールバック関数
     */
    call<T = any>(method: string, params: any, callback: (err: Error, result: T) => void): void;

    call<T = any>(method: string, params: any, callback?: (err: Error, result: any) => void): Promise<T>|void {
        if (callback != null) {
            return invokeCallback(callback, this.call(method, params));
        }
        let idNumber = this._getNewId();
        let id = BSON.Timestamp.fromNumber(idNumber);
        let request = this._bson.serialize({
            jsonrpc: JSONRPC_VERSION,
            method, params, id
        });
        return new Promise<any>((resolve, reject) => {
            this._requests[idNumber] = {resolve, reject};
            this._writable.once('error', reject);
            this._writable.write(request);
        });
    }

    /**
     * リモート通知 (応答を求めない呼び出し)
     */
    notify(method: string, params: any): Promise<void>;

    /**
     * リモート通知 (応答を求めない呼び出し)
     * @param method    呼び出すメソッド名
     * @param params    パラメータのオブジェクト
     * @param callback  コールバック関数
     */
    notify(method: string, params: any, callback: (err: Error) => void): void;

    notify(method: string, params: any, callback?: (err: Error) => void): Promise<void>|void {
        if (callback != null) {
            return invokeCallback(callback, this.notify(method, params));
        }
        let request = this._bson.serialize({
            jsonrpc: JSONRPC_VERSION,
            method, params
        });
        return new Promise<void>((resolve, reject) => {
            this._writable.once('error', reject);
            let finish = () => {
                this._writable.removeListener('error', reject);
                resolve();
            };
            if (!this._writable.write(request)) {
                this._writable.once('drain', finish);
            } else {
                process.nextTick(finish);
            }
        });
    }
    
    /**
     * 新しいIDを生成
     */
    private _getNewId(): number {
        let id = Date.now();
        if (id <= this._lastId) {
            id = this._lastId + 1;
        }
        this._lastId = id;
        return id;
    }

    /**
     * 応答パケットの受信
     * @param response 応答データ
     */
    private _receiveHandler(response: Buffer): void {
        let { jsonrpc, result, error, id } = this._bson.deserialize(response, {
            promoteBuffers: true
        });
        if ((jsonrpc !== JSONRPC_VERSION) || (!(id instanceof BSON.Timestamp))) {
            return;
        }
        let idNumber = id.toNumber();
        let request = this._requests[idNumber];
        if (!request) {
            return;
        }
        delete this._requests[idNumber];
        this._writable.removeListener('error', request.reject);
        if (result !== undefined) {
            request.resolve(result);
        } else {
            request.reject(new RpcError(error.message, error.code));
        }
    }
}
