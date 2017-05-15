import { loopPromise, printLog, waitPromise } from "./common";
import { SerialWrapper } from "./serial_wrapper";

/**
 * 1回のシリアル送信の最大バイト数
 */
const SERIAL_TX_MAX_LENGTH: number = 1024;

/**
 * 連続シリアル送信の間隔(ミリ秒)
 */
const SUCCESSIVE_TX_WAIT_MS: number = null;

/**
 * 列挙されるボードの情報
 */
export interface BoardCandidate {
    /** UI向け名称(COMxxなど) */
    name: string;

    /** 内部管理向けパス */
    path: string;

    /** ベンダーID */
    vendorId: number;

    /** プロダクトID */
    productId: number;
}

/**
 * ボード下位層通信のオプション
 */
export interface BaseCommOptions {
    /** 即時応答ビットを立てるかどうか */
    fastAcknowledge?: boolean;

    /** コンフィグレーション済みとして扱うかどうか */
    forceConfigured?: boolean;
}

/**
 * PERIDOTボード下位層通信クラス
 */
export class BaseComm {
    /**
     * 接続状態 (true: 接続済み, false: 未接続)
     */
    get connected(): boolean { return this._connection != null; }

    /**
     * 接続しているシリアル通信デバイスのパス
     */
    get path(): string { return "" + this._path; }
    private _path: string;

    /**
     * ビットレート(bps)
     */
    get bitrate(): number { return this._bitrate; }
    set bitrate(value: number) { this._bitrate = parseInt(<any>value); }
    private _bitrate: number = 115200;

    /**
     * 即時応答ビットを立てるかどうか
     */
    get sendImmediate(): boolean { return this._sendImmediate; }
    private _sendImmediate: boolean = false;

    /**
     * コンフィグレーション済みかどうか
     */
    get configured(): boolean { return this._configured; }
    private _configured: boolean = false;

    /**
     * クローズされた時に呼び出されるコールバック関数
     * (明示的にclose()した場合と、ボードが強制切断された場合の両方で呼び出される)
     */
    get onClosed(): () => void { return this._onClosed; }
    set onClosed(value: () => void) { this._onClosed = value; }
    private _onClosed: () => void;

    /**
     * デバッグ出力の細かさ(0で出力無し)
     */
    static verbosity: number = 0;

    /**
     * シリアル接続クラスのインスタンス
     */
    private _connection: SerialWrapper = null;

    /**
     * 受信中データ
     */
    private _rxBuffer: ArrayBuffer;

    /**
     * 受信処理を行う関数
     */
    private _receiver: (chunk?: ArrayBuffer, error?: Error) => void;

    /**
     * 接続対象デバイスを列挙する
     * (PERIDOTでないデバイスも列挙される可能性があることに注意)
     */
    static enumerate(): Promise<BoardCandidate[]> {
        function getFriendlyName(port: any): string {
            var name, path;
            name = port.manufacturer;
            path = port.path;
            if (name && name !== "") {
                return name + " (" + path + ")";
            }
            return "" + path;
        }
        return SerialWrapper.list().then((ports: any[]) => {
            return ports.map((port) => {
                return {
                    path: "" + port.path,
                    name: getFriendlyName(port),
                    vendorId: port.vendorId,
                    productId: port.productId
                };
            });
        });
    }

    /**
     * ボードに接続する
     *
     * @param path  接続先パス(enumerateが返すpath)
     */
    connect(path: string): Promise<void> {
        if (this._connection != null) {
            return Promise.reject(new Error("Already connected"));
        }

        this._connection = new SerialWrapper(path, {
            baudRate: this._bitrate
        });
        this._receiver = null;
        return this._connection.open()
        .then(() => {
            this._connection.onClosed = () => {
                this._connection = null;
                this._onClosed && (this._onClosed)();
            };
            this._connection.onReceived = (data) => {
                this._receiver(data);
            };
        })
        .catch((error) => {
            this._connection = null;
            this._receiver = null;
            throw error;
        });
    }

    /**
     * オプション設定
     *
     * @param {Object} option  オプション
     */
    option(option: BaseCommOptions): Promise<void> {
        if (this._connection == null) {
            return Promise.reject(new Error("Not connected"));
        }
        return Promise.resolve()
        .then(() => {
            if (option.fastAcknowledge != null) {
                this._sendImmediate = !!option.fastAcknowledge;
                return this.transCommand(0x39 | (this._sendImmediate ? 0x02 : 0x00));
            }
        })
        .then(() => {
            if (option.forceConfigured != null) {
                this._configured = !!option.forceConfigured;
            }
        });
    }

    /**
     * ボードから切断する
    */
    disconnect(): Promise<void> {
        return this.assertConnection()
        .then(() => {
            this._receiver = null;
            return this._connection.close().catch(() => {});
        });
    }

    /**
     * 接続されていることを確認する
     */
    assertConnection(): Promise<void> {
        if (this._connection == null) {
            return Promise.reject(new Error("Not connected"));
        }
        return Promise.resolve();
    }

    /**
     * 制御コマンドの送受信を行う
     *
     * @param command   コマンドバイト
     */
    transCommand(command: number): Promise<number> {
        let txarray = new Uint8Array(2);
        txarray[0] = 0x3a;
        txarray[1] = command;
        return this._transSerial(txarray.buffer, (rxdata) => {
            if (rxdata.byteLength >= 1) {
                return 1;
            }
        })
        .then((rxdata) => {
            return (new Uint8Array(rxdata))[0];
        });
    }

    /**
     * データの送受信を行う
     *
     * @param txdata    送信するデータ(制御バイトは自動的にエスケープされる。nullの場合は受信のみ)
     * @param estimator 受信完了まで繰り返し呼び出される受信処理関数。
     *                  引数は受信データ全体と、今回の呼び出しで追加されたデータのオフセット。
     *                  省略時は送信のみで完了とする。戻り値の解釈は以下の通り。
     *                  - number : 指定バイト数を受信して受信完了
     *                  - undefined : 追加データを要求
     *                  - Error : エラー発生時のエラー情報
     */
    transData(txdata?: ArrayBuffer, estimator?: (rxdata: ArrayBuffer, offset: number) => number|void|Error): Promise<ArrayBuffer> {
        if (txdata != null) {
            let src = new Uint8Array(txdata);
            let dst = new Uint8Array(txdata.byteLength * 2);
            let len = 0;
            for (let i = 0; i < src.length; ++i) {
                let byte = src[i];
                if (byte === 0x3a || byte === 0x3d) {
                    dst[len] = 0x3d;
                    len += 1;
                    byte ^= 0x20;
                }
                dst[len] = byte;
                len += 1;
            }
            txdata = dst.buffer.slice(0, len);
        }
        return this._transSerial(txdata, estimator);
    }

    /**
     * ログの出力
     *
     * @param lvl   詳細度(0で常に出力。値が大きいほど詳細なメッセージを指す)
     * @param func  関数名
     * @param msg   メッセージまたはメッセージを返す関数
     * @param data  任意のデータ
     */
    private _log(lvl: number, func: string, msg: string|(() => string), data?: any) {
        if (BaseComm.verbosity >= lvl) {
            printLog("BaseComm", func, msg, data);
        }
    }

    /**
     * シリアル通信の送受信を行う
     *
     * @param txdata    送信するエスケープ済みデータ(nullの場合は受信のみ)
     * @param estimator 受信完了まで繰り返し呼び出される受信処理関数。
     *                  引数は受信データ全体と、今回の呼び出しで追加されたデータのオフセット。
     *                  省略時は送信のみで完了とする。戻り値の解釈は以下の通り。
     *                  - number : 指定バイト数を受信して受信完了
     *                  - undefined : 追加データを要求
     *                  - Error : エラー発生時のエラー情報
     */
    private _transSerial(txdata: ArrayBuffer, estimator: (rxdata: ArrayBuffer, offset: number) => number|void|Error): Promise<ArrayBuffer> {
        if (this._connection == null) {
            return Promise.reject(new Error("Not connected"));
        }
        if (this._receiver != null) {
            return Promise.reject(new Error("Operation is in progress"));
        }
        let promise = new Promise<ArrayBuffer>((resolve, reject) => {
            this._receiver = function (rxdata, error) {
                let result: number|void|Error;
                if (rxdata != null) {
                    let offset = (this._rxBuffer != null ? this._rxBuffer.byteLength : 0);
                    let newArray = new Uint8Array(offset + rxdata.byteLength);
                    if (this._rxBuffer != null) {
                        newArray.set(new Uint8Array(this._rxBuffer));
                    }
                    newArray.set(new Uint8Array(rxdata), offset);
                    this._rxBuffer = newArray.buffer;
                    result = estimator(this._rxBuffer, offset);
                } else {
                    result = error;
                }
                if (result instanceof Error) {
                    this._rxBuffer = null;
                    this._receiver = null;
                    return reject(result);
                }
                if (result != null) {
                    rxdata = this._rxBuffer.slice(0, result);
                    this._rxBuffer = this._rxBuffer.slice(result);
                    this._receiver = null;
                    return resolve(rxdata);
                }
            }
        });
        //this._connection.resume();
        let txsize = (txdata != null ? txdata.byteLength : 0);
        return loopPromise(0, txsize, SERIAL_TX_MAX_LENGTH, (pos) => {
            let data = txdata.slice(pos, pos + SERIAL_TX_MAX_LENGTH);
            let size = data.byteLength;
            return this._connection.write(data)
            .then(() => {
                this._log(1, "_transSerial", "sent", new Uint8Array(data));
                if (SUCCESSIVE_TX_WAIT_MS > 0) {
                    return waitPromise(SUCCESSIVE_TX_WAIT_MS);
                }
            });
        })
        .then(() => {
            if (estimator == null) {
                this._receiver = null;
                return new ArrayBuffer(0);
            }
            this._log(1, "_transSerial", "wait", promise);
            return promise;
        });
    }
}
