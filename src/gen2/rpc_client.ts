import { AvsReadableStream, AvsWritableStream } from './avs_streams';
import { EventEmitter } from 'events';
import { invokeCallback } from './util';
import * as BSON from 'bson';

/**
 * JSON-RPC仕様バージョン
 */
const JSONRPC_VERSION = '2.0';

/**
 * リクエスト構造体
 * (idに紐付けてPromiseのコールバック関数を保持する)
 */
interface Request {
    id: number;
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
        let id = this._getNewId();
        let request = this._bson.serialize({
            jsonrpc: JSONRPC_VERSION,
            method, params,
            id: new BSON.Timestamp((id & 0xffffffff) >>> 0, id >>> 32),
        });
        return new Promise<any>((resolve, reject) => {
            this._requests[id] = {id, resolve, reject};
            this._writable.once('error', reject);
            this._writable.write(request);
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
        let idNumber = id.toInt();
        let request = this._requests[idNumber];
        if (!request) {
            return;
        }
        delete this._requests[idNumber];
        this._writable.removeListener('error', request.reject);
        if (result !== undefined) {
            request.resolve(result);
        } else {
            request.reject(error);
        }
    }
}
