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
            switch (code) {
            case JSONRPC_ERR_PARSE_ERROR:
                message = 'Parse error';
                break;
            case JSONRPC_ERR_INVALID_REQUEST:
                message = 'Invalid request';
                break;
            case JSONRPC_ERR_METHOD_NOT_FOUND:
                message = 'Method not found';
                break;
            case JSONRPC_ERR_INVALID_PARAMS:
                message = 'Invalid parameters';
                break;
            case JSONRPC_ERR_INTERNAL_ERROR:
                message = 'Internal error';
                break;
            }
        }
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = new.target.name;
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
    call(method: string, params: any): Promise<any>;

    /**
     * リモート呼び出し
     * @param method    呼び出すメソッド名
     * @param params    パラメータのオブジェクト
     * @param callback  コールバック関数
     */
    call(method: string, params: any, callback: (err: Error, result: any) => void): void;

    call(method: string, params: any, callback?: (err: Error, result: any) => void): Promise<any>|void {
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
        let { jsonrpc, result, error, id } = this._bson.deserialize(response);
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
