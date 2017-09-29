import { EventEmitter } from 'events';
import { AvsWritableStream, AvsReadableStream, AvsMultiplexer, AvsDemultiplexer } from './avs_streams';
import { AvmTransactionsGen2 } from './avm_transactions';
import * as SerialPort from 'serialport';
import { invokeCallback } from './util';
import { RpcClient } from './rpc_client';

const AVS_CH_SLOW_MIN = 0;
const AVS_CH_SLOW_MAX = 7;
const AVS_CH_FAST_MIN = 8;
const AVS_CH_FAST_MAX = 255;

const SYSTEM_ID_BASE = 0x10000000;

/**
 * ボード情報
 */
export interface BoardInfo {
    /**
     * TBD
     */
    id?: string;

    /**
     * シリアル番号('xxxxxx-yyyyyy-zzzzzz')
     */
    serialCode?: string;

    /**
     * System ID
     */
    systemId?: number;

    /**
     * Timestamp
     */
    timestamp?: number;
}

/**
 * 接続先ポートの情報
 */
export interface CanariumPort {
    path: string;
    manufacturer?: string;
    serialNumber?: string;
    pnpId?: string;
    locationId?: string;
    productId?: number;
    vendorId?: number;
}

/**
 * 列挙オプション
 */
export interface CanariumListOptions {
}

/**
 * ストリーム作成オプション
 */
export interface CanariumStreamOptions {
    /**
     * パケット化するか否か(trueの場合、SOP&EOPで識別されたパケットを単位として送受信する)
     */
    packetized?: boolean;
}

/**
 * 双方向パイプ構造体
 */
interface AvsBidirPipe {
    outbound: AvsMultiplexer;
    inbound: AvsDemultiplexer;
}

/**
 * PERIDOTボードドライバ(第2世代通信仕様)
 */
export class CanariumGen2 extends EventEmitter {
    private _opening: boolean = false;
    private _opened: boolean = false;
    private _serial: SerialPort;
    private _slowPipe: AvsBidirPipe;
    private _fastPipe: AvsBidirPipe;
    private _avm: AvmTransactionsGen2;
    private _boardInfoCache: BoardInfo;
    private _systemIdBase: number = SYSTEM_ID_BASE;

    /**
     * Canarium(Gen2)のインスタンスを生成する
     * @param _path 接続先のパス
     */
    constructor(private _path: string) {
        super();
        this._setupPipes();
    }

    /**
     * 接続先を列挙する (PERIDOTでないデバイスも列挙されうることに注意)
     * @param options 列挙のオプション
     */
    static list(options?: CanariumListOptions): Promise<CanariumPort[]>;

    /**
     * 接続先を列挙する (PERIDOTでないデバイスも列挙されうることに注意)
     * @param callback コールバック関数
     */
    static list(callback: (err: Error, ports?: CanariumPort[]) => void): void;

    /**
     * 接続先を列挙する (PERIDOTでないデバイスも列挙されうることに注意)
     * @param options 列挙のオプション
     * @param callback コールバック関数
     */
    static list(options: CanariumListOptions, callback: (err: Error, ports?: CanariumPort[]) => void): void;

    static list(options?: CanariumListOptions, callback?: (err: Error, ports?: CanariumPort[]) => void): Promise<CanariumPort[]>|void {
        if (typeof(options) === 'function') {
            callback = options;
            options = null;
        }
        if (callback != null) {
            return invokeCallback(callback, this.list(options));
        }
        return new Promise<CanariumPort[]>((resolve, reject) => {
            SerialPort.list((err, ports) => {
                if (err) {
                    return reject(err);
                }
                return resolve(ports.map((port) => {
                    return {
                        path: port.comName,
                        manufacturer: port.manufacturer,
                        serialNumber: port.serialNumber,
                        pnpId: port.pnpId,
                        locationId: port.locationId,
                        productId: (port.productId != null) ? parseInt(port.productId, 16) : undefined,
                        vendorId: (port.vendorId != null) ? parseInt(port.vendorId, 16) : undefined,
                    };
                }));
            });
        });
    }

    /**
     * AvalonMM アクセサ
     */
    get avm(): AvmTransactionsGen2 {
        return this._avm;
    }

    /**
     * 接続先のパス
     */
    get path(): string {
        return this._path;
    }

    /**
     * 接続されているか否か
     */
    get opened(): boolean {
        return this._opened;
    }

    /**
     * ボードに接続する
     */
    open(): Promise<void>;

    /**
     * 接続できるボードを限定して、ボードに接続する
     * @param boardInfo 接続先ボード情報
     */
    open(boardInfo: BoardInfo): Promise<void>;

    /**
     * ボードに接続する
     * @param callback コールバック関数
     */
    open(callback: (err: Error) => void): void;

    /**
     * ボードに接続する
     * 接続できるボードを限定して、ボードに接続する
     * @param boardInfo 接続先ボード情報
     * @param callback コールバック関数
     */
    open(boardInfo: BoardInfo, callback: (err: Error) => void): void;

    open(boardInfo?: any, callback?: (err: Error) => void): Promise<void>|void {
        if (typeof(boardInfo) === 'function') {
            callback = boardInfo;
            boardInfo = null;
        }
        if (callback != null) {
            return invokeCallback(callback, this.open(boardInfo));
        }
        if (this._opening || this._opened) {
            return Promise.reject(new Error('already opened'));
        }
        this._opening = true;
        this._boardInfoCache = null;
        return Promise.resolve()
        .then(() => {
            if (this._serial != null) {
                return new Promise<void>((resolve, reject) => {
                    this._serial.open((err) => {
                        if (err) {
                            this._opening = false;
                            return reject(err);
                        }
                        return resolve();
                    });
                });
            }
            return Promise.reject(new Error('interface not found'));
        })
        .then(() => {
            if (boardInfo == null) {
                return;
            }
            return this.getInfo()
            .then((info) => {
                if ((boardInfo.id != null) && (boardInfo.id !== info.id)) {
                    return Promise.reject(new Error('Board ID mismatch'));
                }
                if ((boardInfo.serialCode != null) && (boardInfo.serialCode !== info.serialCode)) {
                    return Promise.reject(new Error('Board serial code mismatch'));
                }
                if ((boardInfo.systemId != null) && (boardInfo.systemId !== info.systemId)) {
                    return Promise.reject(new Error('System ID mismatch'));
                }
                if ((boardInfo.timestamp != null) && (boardInfo.timestamp !== info.timestamp)) {
                    return Promise.reject(new Error('Timestamp mismatch'));
                }
            });
        })
        .then(() => {
            if (!this._opening) {
                return Promise.reject(new Error('closed during open'));
            }
            this._opened = true;
        })
        .finally(() => {
            this._opening = false;
        });
    }

    /**
     * ボードから切断する
     */
    close(): Promise<void>;

    /**
     * ボードから切断する
     * @param callback コールバック関数
     */
    close(callback: (err: Error) => void): void;

    close(callback?: (err: Error) => void): Promise<void>|void {
        if (callback != null) {
            return invokeCallback(callback, this.close());
        }
        if (!this._opened) {
            return Promise.reject(new Error('not opened'));
        }
        if (this._serial != null) {
            return new Promise<void>((resolve, reject) => {
                this._serial.close((err) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve();
                });
            });
        }
        return Promise.reject(new Error('interface not found'));
    }

    /**
     * ボード情報を取得する
     */
    getInfo(): Promise<BoardInfo>;

    /**
     * ボード情報を取得する
     * @param callback コールバック関数
     */
    getInfo(callback: (err: Error, result: BoardInfo) => void): void;

    getInfo(callback?: (err: Error, result: BoardInfo) => void): Promise<BoardInfo>|void {
        if (callback != null) {
            return invokeCallback(callback, this.getInfo());
        }
        if (!this._opened) {
            return Promise.reject(new Error('not opened'));
        }
        if (this._boardInfoCache != null) {
            return Promise.resolve(this._boardInfoCache);
        }
        return this.avm.read(this._systemIdBase, 16)
        .then((result) => {
            this._boardInfoCache = {
                systemId: result.readUInt32LE(0),
                timestamp: result.readUInt32LE(4),
            };
            let uidLo = `0000000${result.readUInt32LE(8).toString(16)}`.substr(-8);
            let uidHi = `0000000${result.readUInt32LE(12).toString(16)}`.substr(-8);
            this._boardInfoCache.id = 'J72?';
            this._boardInfoCache.serialCode = `93${uidHi.substr(0, 4)}-${uidHi.substr(4)}${uidLo.substr(0, 2)}-${uidLo.substr(2)}`;
            return this._boardInfoCache;
        });
    }

    /**
     * 書き込みストリームを作成する
     * @param channel チャネル番号
     * @param packetized パケット化するか否か(trueの場合、1回で書き込まれたデータは1パケットとして送信される)
     */
    createWriteStream(channel: number, packetized?: boolean): AvsWritableStream;

    /**
     * 書き込みストリームを作成する
     * @param channel チャネル番号
     * @param options ストリームの振る舞いを指定するオプション
     */
    createWriteStream(channel: number, options: CanariumStreamOptions): AvsWritableStream;

    createWriteStream(channel: number, options?: boolean|CanariumStreamOptions): AvsWritableStream {
        if (typeof(options) === 'boolean') {
            return this.createWriteStream(channel, {packetized: options});
        }
        if (options == null) {
            options = {};
        }
        let pipe = this._classifyPipe(channel);
        return pipe.outbound.createStream(channel, !!options.packetized);
    }

    /**
     * 読み込みストリームを作成する
     * @param channel チャネル番号
     * @param packetized パケット化するか否か(trueの場合、SOP&EOPで識別されたパケットを単位として受信する)
     */
    createReadStream(channel: number, packetized?: boolean): AvsReadableStream;

    /**
     * 読み込みストリームを作成する
     * @param channel チャネル番号
     * @param options ストリームの振る舞いを指定するオプション
     */
    createReadStream(channel: number, options: CanariumStreamOptions): AvsReadableStream;

    createReadStream(channel: number, options?: boolean|CanariumStreamOptions): AvsReadableStream {
        if (typeof(options) === 'boolean') {
            return this.createReadStream(channel, {packetized: options});
        }
        if (options == null) {
            options = {};
        }
        let pipe = this._classifyPipe(channel);
        return pipe.inbound.createStream(channel, !!options.packetized);
    }

    /**
     * RPCクライアントの作成
     * @param channel チャネル番号
     */
    createRpcClient(channel: number): RpcClient {
        let pipe = this._classifyPipe(channel);
        return new RpcClient(
            pipe.outbound.createStream(channel, true),
            pipe.inbound.createStream(channel, true)
        );
    }

    /**
     * パイプの初期化
     */
    private _setupPipes(): void {
        if (true /* VCP */) {
            this._serial = new SerialPort(this._path, {autoOpen: false});
            this._serial.on('close', () => {
                this._opened = false;
                if (!this._opening) {
                    this.emit('close');
                } else {
                    this._opening = false;
                }
            });
            this._serial.on('error', this.emit.bind(this, 'error'));
            this._slowPipe = {
                inbound: new AvsDemultiplexer(<any>this._serial),
                outbound: new AvsMultiplexer(<any>this._serial),
            };
        }
        // FIXME: D3XX support
    }

    /**
     * チャネル番号からパイプを識別
     * @param channel チャネル番号
     */
    private _classifyPipe(channel: number): AvsBidirPipe {
        if (typeof(channel) !== 'number') {
            throw new Error('channel must be a number');
        }
        let pipe: AvsBidirPipe;
        if ((AVS_CH_SLOW_MIN <= channel) && (channel <= AVS_CH_SLOW_MAX)) {
            pipe = this._slowPipe;
        } else if ((AVS_CH_FAST_MIN <= channel) && (channel <= AVS_CH_FAST_MAX)) {
            pipe = this._fastPipe;
        }
        if (pipe != null) {
            return pipe;
        }
        throw new Error(`channel (${channel}) is not supported`);
    }

}