import * as SerialPort from "serialport"; // for v4.x
//import { SerialPort } from "serialport"; // for v2.x
import { hexDump } from "./common";

const DEBUG = 0;
const DELAY_AFTER_CLOSE_MS = 0;
const MAX_RETRIES_FOR_OPEN = 5;
const DELAY_FOR_OPEN_RETRY = 100;

/**
 * ポート情報
 */
export interface PortInfo {
    /** パス */
    path: string;

    /** 製造者 */
    manufacturer?: string;
    
    /** シリアル番号 */
    serialNumber?: string;

    /** Vendor ID */
    vendorId?: number;

    /** Product ID */
    productId?: number;
}

/**
 * 接続オプション
 */
export interface ConnectOption {
    /** ボーレート */
    baudRate?: number;

    /** データのビット幅 */
    dataBits?: number;

    /** ストップビット幅 */
    stopBits?: number;
}

/**
 * シリアル通信のラッパ(廃止予定)
 */
export class SerialWrapper {
    /**
     * ポートが閉じられたときに呼び出されるコールバック関数
     * (不意の切断とclose()呼び出しのどちらで閉じても呼び出される)
     */
    public onClosed: () => void;

    /**
     * データを受信したときに呼び出されるコールバック関数
     * (もし登録されていない場合、受信したデータは破棄される)
     */
    public onReceived: (data: ArrayBuffer) => void;

    /**
     * シリアルポートインスタンス
     */
    private _sp: any;

    /**
     * ポートを列挙する
     */
    static list(): Promise<PortInfo[]> {
        return new Promise((resolve, reject) => {
            SerialPort.list((error, ports: any[]) => {
                if (error != null) {
                    return reject(error);
                }
                let results: PortInfo[] = [];
                for (let i = 0; i < ports.length; ++i) {
                    let port: any = ports[i];
                    if ((port.pnpId != null) || (port.locationId != null)) {
                        results.push({
                            path: "" + port.comName,
                            manufacturer: "" + port.manufacturer,
                            serialNumber: "" + port.serialNumber,
                            vendorId: parseInt(port.vendorId, 16),
                            productId: parseInt(port.productId, 16)
                        });
                    }
                }
                return resolve(results);
            });
        });
    }

    /**
     * コンストラクタ
     *
     * @param _path     接続先ポートのパス
     * @param _options  接続時のオプション
     */
    constructor(private _path: string, private _options: ConnectOption = {}) {
        if (this._options.baudRate != null) {
            this._options.baudRate = 115200;
        }
        if (this._options.dataBits != null) {
            this._options.dataBits = 8;
        }
        if (this._options.stopBits != null) {
            this._options.stopBits = 1;
        }
    }

    /**
     * 接続する
     */
    open(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this._sp != null) {
                return reject(new Error("Already opened"));
            }
            let tryOpen = (count: number) => {
                /* istanbul ignore if */
                if (DEBUG >= 1) {
                    console.log(`${Date.now()}:open${count > 0 ? "(retry)" : ""}`);
                }
                let sp = new SerialPort(this._path, this._options, (error) => {
                    if (error != null) {
                        if (`${error}`.match(/Access denied$/) && count < MAX_RETRIES_FOR_OPEN) {
                            return global.setTimeout(tryOpen, DELAY_FOR_OPEN_RETRY, count + 1);
                        }
                        return reject(error);
                    }
                    this._sp = sp;
                    this._sp.on("data", (data) => this._dataHandler(data));
                    this._sp.on("disconnect", () => this._closeHandler());
                    return resolve();
                });
            };
            tryOpen(0);
        });
    }

    /**
     * データの書き込み(送信)
     * @param data  送信するデータ
     */
    write(data): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this._sp == null) {
                return reject(new Error("disconnected"));
            }
            /* istanbul ignore if */
            if (DEBUG >= 2) {
                console.log(`${Date.now()}:send:${hexDump(data)}`);
            }
            return this._sp.write(new Buffer(new Uint8Array(data)), (error) => {
                if (error != null) {
                    return reject(error);
                }
                return resolve();
            });
        }).then(() => {
            return this.drain();
        });
    }

    /**
     * 接続を一時停止状態にする
     */
    pause(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this._sp == null) {
                return reject(new Error("disconnected"));
            }
            this._sp.pause();
            return resolve();
        })
    }

    /**
     * 接続の一時停止を解除する
     */
    resume(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this._sp == null) {
                return reject(new Error("disconnected"));
            }
            return resolve();
        });
    }

    /**
     * 送受信待ちのバッファを破棄する(送受信データが欠落する可能性がある)
     */
    flush(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this._sp == null) {
                return reject(new Error("disconnected"));
            }
            return this._sp.flush((error) => {
                if (error != null) {
                    return reject(error);
                }
                return resolve();
            });
        });
    }

    /**
     * 送受信待ちのバッファを強制的に吐き出す(送受信データは欠落しない)
     */
    drain(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this._sp == null) {
                return reject(new Error("disconnected"));
            }
            return this._sp.drain((error) => {
                if (error != null) {
                    return reject(error);
                }
                return resolve();
            });
        });
    }

    /**
     * 切断する
     */
    close(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let sp = this._sp;
            if (sp == null) {
                return reject(new Error("disconnected"));
            }
            this._sp = null;
            /* istanbul ignore if */
            if (DEBUG >= 1) {
                console.log(`${Date.now()}:close`);
            }
            return sp.close(() => {
                let func = this.onClosed;
                if (typeof(func) === "function") {
                    try {
                        func();
                    } catch (error) {
                        // Ignore errors
                    }
                }
                return global.setTimeout(resolve, DELAY_AFTER_CLOSE_MS);
            });
        });
    }

    /**
     * データ受信ハンドラ(NodeJSのみ)
     * @param data  受信したデータ
     */
    private _dataHandler(data: Buffer): void {
        if (this._sp != null) {
            let func = this.onReceived;
            if (typeof(func) === "function") {
                /* istanbul ignore if */
                if (DEBUG >= 2) {
                    console.log(`${Date.now()}:recv:${hexDump(data)}`);
                }
                func(new Uint8Array(data).buffer);
            }
        }
    }

    /**
     * 切断検知ハンドラ(NodeJSのみ)
     */
    private _closeHandler(): void {
        if (this._sp != null) {
            /* istanbul ignore if */
            if (DEBUG >= 1) {
                console.log(`${Date.now()}:_closeHandler`);
            }
            this.close();
        }
    }
}
