import * as BSON from "bson";
import { AvmTransactions } from "./avm_transactions";
import { RemoteError } from "./remote_error";
import { printLog } from "./common";

const bson = new BSON();
const SWI_REG_MSG = 6;
const SWI_REG_SWI = 7;
const PERIDOT_RPCSRV_IF_VER = 0x0101;
const JSONRPC_VERSION = "2.0";
const MIN_POLLING_INTERVAL_MS = 50;
const MAX_POLLING_INTERVAL_MS = 1000;

/**
 * PERIDOTボードRPCクライアントクラス
 */
export class RpcClient {
    /**
     * デバッグ出力の細かさ(0で出力無し)
     */
    static verbosity: number = 0;

    /**
     * リクエスト送信待ち行列(callの要求順にキューされる)
     */
    private _pendingCalls: any[] = [];

    /**
     * 応答待ちのcall情報(各callのタグをキーとした連想配列)
     */
    private _ongoingCalls: any = {};

    /**
     * 最後に発行したタグ
     */
    private _lastTag: number = 0;

    /**
     * サーバー情報のポインタ
     */
    private _srvInfoPtr: number = null;

    /**
     * ホストID
     */
    private _hostId: Uint32Array = null;

    /**
     * ポーリングの2重起動防止バリア
     */
    private _pollingBarrier: boolean = false;

    /**
     * ポーリング用タイマーのID (タイマー無効時はnull)
     */
    private _timerId: NodeJS.Timer = null;

    /**
     * ポーリング用タイマーの周期(ms) (タイマー無効時はnull)
     */
    private _timerInterval: number = null;

    /**
     * コンストラクタ
     *
     * @param _avm  Avalon-MMトランザクション層通信クラスのインスタンス
     */
    constructor(private _avm: AvmTransactions) {
    }

    /**
     * リモートメソッド呼び出しの実行
     * (エラー発生時はRemoteErrorオブジェクトをreasonとしてRejectされる)
     * 
     * @param method    メソッド名
     * @param params    パラメータ、またはパラメータを返す関数
     * @param interval  ポーリング周期(ms)
     */
    doCall(method: string, params: any, interval?: number): Promise<any> {
        if (interval == null) {
            interval = MAX_POLLING_INTERVAL_MS;
        }
        return new Promise((resolve, reject) => {
            let tag = this._getNewTag();
            this._pendingCalls.push({method, params, interval, tag, resolve, reject});
            this._updateTimer();
        });
    }

    /**
     * 接続のリセット
     */
    resetConnection(): Promise<void> {
        let error = Error("RPC connection has been reset by client");
        this._abortPendingCalls(error);
        this._abortOngoingCalls(error);
        this._srvInfoPtr = null;
        this._hostId = null;
        this._updateTimer();
        return Promise.resolve();
    }

    /**
     * ポーリング用タイマーの作成/更新
     */
    private _updateTimer(): void {
        let interval = this._pendingCalls.reduce((prev, curr) => {
            return Math.min(prev, curr.interval);
        }, Infinity);
        interval = Math.max(interval, MIN_POLLING_INTERVAL_MS);
        if (this._timerInterval !== interval) {
            if (this._timerId != null) {
                global.clearInterval(this._timerId);
            }
            this._timerId = null;
            this._timerInterval = null;
            if (interval !== Infinity) {
                this._timerId = global.setInterval(() => this._poll(), interval);
                this._timerInterval = interval;
            }
        }
    }

    /**
     * リクエスト送信待ちのcallをすべてキャンセルする
     * @param error エラーオブジェクト
     */
    private _abortPendingCalls(error: Error): void {
        let calls = this._pendingCalls;
        this._pendingCalls = [];
        for (let i = 0; i < calls.length; ++i) {
            let call = calls[i];
            call.reject(error);
        }
    }

    /**
     * 応答受信待ちのcallをすべてキャンセルする
     * @param error エラーオブジェクト
     */
    private _abortOngoingCalls(error: Error): void {
        let calls = this._ongoingCalls;
        this._ongoingCalls = {};
        for (let tag in calls) {
            let call = calls[tag];
            call.reject(error);
        }
    }

    /**
     * ポーリングによるリクエストの送信＆応答受信処理(タイマーハンドラ)
     */
    private _poll(): void {
        if (this._pollingBarrier) {
            return;
        }
        this._pollingBarrier = true;
        this._pollBody().then(() => {
            this._pollingBarrier = false;
        }, (error) => {
            this._pollingBarrier = false;
            console.error("Error during poll:", error);
        });
    }

    /**
     * ポーリングによるリクエストの送信＆応答受信処理(本体)
     */
    private _pollBody(): Promise<void> {
        let serverReady = false;
        let reqLen: number;
        let reqPtr: number;
        let resLen: number;
        let resPtr: number;
        let raiseIrq = false;
        return Promise.resolve()
        .then(() => {
            if (this._srvInfoPtr == null) {
                return;
            }
            // 接続済みの場合
            return this._avm.read(this._srvInfoPtr + 4, 6 * 4)
            .then((ab) => {
                let id0, id1;
                [id0, id1, reqLen, reqPtr, resLen, resPtr] = Array.from(new Uint32Array(ab));
                if ((id0 !== this._hostId[0]) || (id1 !== this._hostId[1])) {
                    // ホストID不一致 (サーバー側が意図せず再起動したと判断)
                    throw new Error("RPC server has been reset (Host ID does not match)");
                }
                // 接続維持確認完了
                serverReady = true;
            });
        })
        .catch((error) => {
            // 接続状況確認中にエラーが発生した場合
            // リクエスト送信およびレスポンス待ちをすべてエラーで中断する
            this._abortPendingCalls(error);
            this._abortOngoingCalls(error);
            serverReady = false;
        })
        .then(() => {
            if (serverReady) {
                return;
            }
            // 初回接続や再接続が必要な場合
            // SWIメッセージを読み込み、サーバー情報の位置を得る
            this._srvInfoPtr = null;
            return this._avm.iord(this._avm.swiBase, SWI_REG_MSG)
            .then((ptr) => {
                if (ptr === 0) {
                    let error = new RemoteError(RemoteError.ECANCELED);
                    this._abortOngoingCalls(error);
                    throw error;
                }

                // サーバー情報の位置を保存
                this._srvInfoPtr = ptr;
                return this._avm.read(this._srvInfoPtr, 7 * 4);
            })
            .then((ab) => {
                // サーバー情報全体を取得し、バージョン等をチェック
                let if_ver, id0, id1;
                [if_ver, id0, id1, reqLen, reqPtr, resLen, resPtr] = Array.from(new Uint32Array(ab));
                if ((if_ver & 0xffff) !== PERIDOT_RPCSRV_IF_VER) {
                    // バージョン不整合
                    // リクエスト送信およびレスポンス待ちをすべてエラーで中断する
                    let error = new Error("Unsupported remote version");
                    this._abortPendingCalls(error);
                    this._abortOngoingCalls(error);
                    throw error;
                }

                // ホストIDを書き込み
                let newId = Date.now();
                this._hostId = new Uint32Array(2);
                this._hostId[0] = newId & 0xffffffff;
                this._hostId[1] = newId >>> 32;
                return this._avm.write(this._srvInfoPtr + 4, this._hostId.buffer);
            })
            .then(() => {
                // (再)接続完了
                serverReady = true;
            });
        })
        .then(() => {
            if (this._pendingCalls.length === 0) {
                return;
            }
            // 新しいリクエストが存在する場合

            // リクエスト送信バッファの空きを確認
            return this._avm.iord(reqPtr, 0)
            .then((size) => {
                if (size !== 0) {
                    // 空きが無い場合
                    // サーバー側が前回のリクエストを取り逃した可能性があるため、
                    // ソフトウェア割り込みをかける
                    raiseIrq = true;
                    return;
                }

                // 空きが有るため、新規リクエストの送信準備を行う
                let call = this._pendingCalls.shift();
                let bsonData;

                return Promise.resolve()
                .then(() => {
                    let {params} = call;
                    let obj: any = {
                        jsonrpc: JSONRPC_VERSION,
                        method: call.method.toString(),
                        id: call.tag
                    };
                    obj.params = (typeof(params) === "function" ? null : params);

                    // 送信するBSONデータを生成
                    bsonData = bson.serialize(obj);

                    if (typeof(params) === "function") {
                        // paramsが関数の場合、その戻り値を使ってBSONを再生成
                        obj.params = params(reqLen - bsonData.byteLength);
                        bsonData = bson.serialize(obj);
                    }

                    switch (Object.prototype.toString.call(obj.params)) {
                        case "[object Object]":
                        case "[object Array]":
                            // OK
                            break;
                        default:
                            throw new TypeError("Invalid parameter type");
                    }

                    // BSONデータサイズ確認
                    if (bsonData.byteLength > reqLen) {
                        throw new Error("Request data is too large");
                    }

                    // BSONデータ書き込み(先頭ワード以外と、先頭ワードに分けて書き込む)
                    return this._avm.write(reqPtr + 4, bsonData.slice(4))
                })
                .then(() => {
                    return this._avm.write(reqPtr, bsonData.slice(0, 4));
                })
                .then(() => {
                    // リクエスト送信完了
                    this._ongoingCalls[call.tag.toNumber()] = call;
                    raiseIrq = true;
                })
                .catch((error) => {
                    // エラー発生時、このcallを失敗扱いにする
                    if (call != null) {
                        call.reject(error);
                    }
                });
            });
        })
        .then(() => {
            // レスポンス受信バッファの空きを確認
            return this._avm.iord(resPtr, 0)
            .then((size) => {
                if (size === 0) {
                    // 空きの場合は抜ける
                    // ただし、サーバー側が前回のリクエストを取り逃した可能性があるため、
                    // ソフトウェア割り込みをかけてから終了する
                    raiseIrq = true;
                    return
                }

                // データサイズが不正な場合、レスポンスの削除のみを行う
                if (size > resLen) {
                    throw new Error("Invalid response length");
                }

                // データがあるため、レスポンスを受信する
                return this._avm.read(resPtr, size)
                .then((ab) => {
                    // 受信したBSONデータをECMAオブジェクトに戻す
                    let obj = bson.deserialize(Buffer.from(ab));

                    // 受信データの検証

                    // バージョンの確認
                    if (obj.jsonrpc !== JSONRPC_VERSION) {
                        throw new Error("Invalid JSONRPC response");
                    }

                    // タグの取得
                    let tag = (obj.id != null) ? obj.id.toNumber() : null;
                    if (tag == null) {
                        throw new Error("No valid id");
                    }

                    // 対象のcallを特定
                    let call = this._ongoingCalls[tag];
                    if (call == null) {
                        throw new Error("No RPC request tagged #" + tag);
                    }
                    delete this._ongoingCalls[tag];
                    this._updateTimer();
                    if (obj.error != null) {
                        // エラー終了
                        call.reject(new RemoteError(obj.error));
                    } else {
                        // 正常終了
                        call.resolve(obj.result);
                    }
                })
                .catch((error) => {
                    this._log(0, "_poll", "receiving response: (" + error.name + ") " + error.message);
                })
                .then(() => {
                    // レスポンスの削除を行う
                    return this._avm.iowr(resPtr, 0, 0);
                })
                .then(() => {
                    raiseIrq = true;
                })
                .catch((error) => {
                    this._log(0, "_poll", "deleting response: (" + error.name + ") " + error.message);
                });
            });
        })
        .then(() => {
            if (raiseIrq) {
                return this._avm.iowr(this._avm.swiBase, SWI_REG_SWI, 1);
            }
        });
    }

    /**
     * 新しいタグ値の取得
     */
    private _getNewTag(): any {
        let value = Date.now();
        if (value <= this._lastTag) {
            value = this._lastTag + 1;
        }
        this._lastTag = value;
        return (<any>BSON).Timestamp.fromNumber(value);
    }

    /**
     * ログの出力
     * @param lvl   詳細度(0で常に出力。値が大きいほど詳細なメッセージを指す)
     * @param func  関数名
     * @param msg   メッセージまたはメッセージを返す関数
     * @param data  任意のデータ
     */
    private _log(lvl: number, func: string, msg: string|(() => string), data?: any) {
        if (RpcClient.verbosity >= lvl) {
            printLog("RpcClient", func, msg, data);
        }
    }
}
