import { EventEmitter } from 'events';
import * as modAvsStreams from './avs_streams';
import { AvmTransactionsGen2 } from './avm_transactions';
import { invokeCallback } from './util';
import * as modRpcClient from './rpc_client';
import SerialPort = require('serialport');
import { join as joinPath } from 'path';

const debug = require('debug')('canarium:main');

const DEFAULT_OPEN_OPTIONS: CanariumGen2.OpenOptions = {
    baudRate: 115200,
    channelSendInterval: 5000,
    disableTimeouts: false,
};

const GEN2_BOARD_ID = 'J72C';
const AVS_CH_AVM_TRANSACTION = 0x00;
const SYSTEM_ID_BASE = 0x10000000;
const AVM_TEST_ADDRESS = 0x3d5a3d00;
const AVM_TEST_TIMEOUT = 500;
const SERIAL_CLOSE_DELAY_MS = 200;

/*
 * SYSTEM_ID_BASEをベースとするレジスタの配置
 * +0x0 : System ID
 * +0x4 : Timestamp
 * +0x8 : UID Low (*1,*2)
 * +0xc : UID High (*1,*2)
 *
 * (*1) UIDの返却値が準備中の場合、以下のいずれかの方法でそれを通知できる
 *      1) waitrequestを使ってAvalon MM Masterを待たせる
 *      2) 全ビット0の値を返し、CanariumGen2にリトライを要求する
 * 
 * (*2) UIDをCanariumに読ませたくない場合は、全ビット1の値を返すこと。
 */

/*
 * 型情報のエクスポート
 */
export module CanariumGen2 {
    /**
     * ボード情報
     */
    export interface BoardInfo {
        /**
         * ボードID (Gen2対応ボードでは'J72C'固定)
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
    export interface PortInfo {
        path: string;
        manufacturer?: string;
        serialNumber?: string;
        pnpId?: string;
        locationId?: string;
        productId?: number;
        vendorId?: number;
    }

    /**
     * 接続オプション
     */
    export interface OpenOptions {
        /**
         * 接続時のボーレート (デフォルトは 115200bps)
         */
        baudRate?: number;

        /**
         * 接続時のビットレート (廃止予定。baudRateを推奨)
         * @deprecated
         */
        bitrate?: number;

        /**
         * チャネル番号の再送信間隔 [ミリ秒] (デフォルトは 5000ms)
         * 0を指定すると再送信をしない。
         */
        channelSendInterval?: number;

        /**
         * 各種タイムアウトを無効にし、無限待ちとする (デフォルトは false)
         * 主にデバッグ用途で利用。
         */
        disableTimeouts?: boolean;
    }

    /**
     * 列挙オプション
     */
    export interface ListOptions {
    }

    /**
     * ストリーム作成オプション
     */
    export interface StreamOptions {
        /**
         * パケット化するか否か(trueの場合、SOP&EOPで識別されたパケットを単位として送受信する)
         */
        packetized?: boolean;
    }

    /**
     * RPCクライアントクラス
     */
    export type RpcClient = modRpcClient.RpcClient;

    /**
     * RPC関連エラークラス
     */
    export type RpcError = modRpcClient.RpcError;

    /**
     * Avalon-STストリーム出力クラス
     */
    export type AvsWritableStream = modAvsStreams.AvsWritableStream;

    /**
     * Avalon-STストリーム入力クラス
     */
    export type AvsReadableStream = modAvsStreams.AvsReadableStream;
}

/**
 * 双方向パイプ構造体
 */
interface AvsBidirPipe {
    outbound: modAvsStreams.AvsMultiplexer;
    inbound: modAvsStreams.AvsDemultiplexer;
}

/**
 * 各種ID情報からシリアルコードへの変換
 */
function generateSerialCode(uidLow: number, uidHigh: number): string {
    let code = `0000000${uidHigh.toString(16)}`.substr(-8) + `0000000${uidLow.toString(16)}`.substr(-8);
    return `93${code.substr(0, 4)}-${code.substr(4, 6)}-${code.substr(10, 6)}`.toUpperCase();
}

/**
 * PERIDOTボードドライバ(第2世代通信仕様)
 */
export class CanariumGen2 extends EventEmitter {
    private static _binding: any;
    private static _version: string;
    private _binding: typeof SerialPort;
    private _options: CanariumGen2.OpenOptions;
    private _opening: boolean = false;
    private _opened: boolean = false;
    private _serial: SerialPort;
    private _defaultPipe: AvsBidirPipe;
    private _avm: AvmTransactionsGen2;
    private _boardInfoCache: CanariumGen2.BoardInfo;
    private _systemIdBase: number = SYSTEM_ID_BASE;

    /**
     * Canarium(Gen2)のインスタンスを生成する
     * @param _path 接続先のパス
     * @param options 接続オプション
     */
    constructor(private _path: string, options?: CanariumGen2.OpenOptions) {
        super();
        this._binding = new.target.Binding;
        this._options = Object.assign({}, DEFAULT_OPEN_OPTIONS, options);
        if (this._options.bitrate != null) {
            this._options.baudRate = this._options.bitrate;
        }
        this._setupPipes();
        this._avm = new AvmTransactionsGen2(
            this.createWriteStream(AVS_CH_AVM_TRANSACTION, true),
            this.createReadStream(AVS_CH_AVM_TRANSACTION, true)
        );
    }

    /**
     * オブジェクトの廃棄
     */
    dispose(): Promise<void> {
        return this.close()
        .catch(() => {})    // close中のエラーは無視する
        .then(() => {
            this._binding = null;
            this._options = null;
            this._serial = null;
            this._defaultPipe = null;
            this._avm = null;
            this._boardInfoCache = null;
        });
    }

    /**
     * SerialPortクラスへのbinding
     */
    static get Binding(): any {
        if (this._binding == null) {
            this._binding = require('serialport');
        }
        return this._binding;
    }
    static set Binding(binding: any) {
        this._binding = binding;
    }

    /**
     * 接続先を列挙する (PERIDOTでないデバイスも列挙されうることに注意)
     * @param options 列挙のオプション
     */
    static list(options?: CanariumGen2.ListOptions): Promise<CanariumGen2.PortInfo[]>;

    /**
     * 接続先を列挙する (PERIDOTでないデバイスも列挙されうることに注意)
     * @param callback コールバック関数
     */
    static list(callback: (err: Error, ports?: CanariumGen2.PortInfo[]) => void): void;

    /**
     * 接続先を列挙する (PERIDOTでないデバイスも列挙されうることに注意)
     * @param options 列挙のオプション
     * @param callback コールバック関数
     */
    static list(options: CanariumGen2.ListOptions, callback: (err: Error, ports?: CanariumGen2.PortInfo[]) => void): void;

    static list(options?: CanariumGen2.ListOptions, callback?: (err: Error, ports?: CanariumGen2.PortInfo[]) => void): Promise<CanariumGen2.PortInfo[]>|void {
        if (typeof(options) === 'function') {
            callback = options;
            options = null;
        }
        if (callback != null) {
            return invokeCallback(callback, this.list(options));
        }
        return new Promise<CanariumGen2.PortInfo[]>((resolve, reject) => {
            CanariumGen2.Binding.list((err, ports) => {
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
     * バージョン (canariumパッケージのバージョン)
     */
    static get version(): string {
        if (this._version == null) {
            let info = require(joinPath(__dirname, '..', '..', '..', 'package.json'));
            this._version = info.version;
        }
        return this._version;
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
    open(boardInfo: CanariumGen2.BoardInfo): Promise<void>;

    /**
     * ボードに接続する
     * @param callback コールバック関数
     */
    open(callback: (err: Error) => void): void;

    /**
     * 接続できるボードを限定して、ボードに接続する
     * @param boardInfo 接続先ボード情報
     * @param callback コールバック関数
     */
    open(boardInfo: CanariumGen2.BoardInfo, callback: (err: Error) => void): void;

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
                    debug('open(%s)', this._path);
                    this._serial.open((err) => {
                        if (err) {
                            return reject(err);
                        }
                        return resolve();
                    });
                });
            }
            return Promise.reject(new Error('interface not found'));
        })
        .then(() => {
            debug('connectionTest');
            return this._connectionTest();
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
        .catch((reason) => {
            return this._forceClose()
            .finally(() => {
                throw reason;
            });
        })
        .finally(() => {
            this._opening = false;
        });
    }

    /**
     * ボードから切断する(内部用)
     */
    private _forceClose(): Promise<void> {
        debug('forceClose');
        if (this._serial != null) {
            return new Promise<void>((resolve, reject) => {
                this._serial.close((err) => {
                    if (err) {
                        return reject(err);
                    }
                    setTimeout(resolve, SERIAL_CLOSE_DELAY_MS);
                });
            });
        }
        return Promise.reject(new Error('interface not found'));
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
        return this._forceClose();
    }

    /**
     * ボード情報を取得する
     */
    getInfo(): Promise<CanariumGen2.BoardInfo>;

    /**
     * ボード情報を取得する
     * @param callback コールバック関数
     */
    getInfo(callback: (err: Error, result: CanariumGen2.BoardInfo) => void): void;

    getInfo(callback?: (err: Error, result: CanariumGen2.BoardInfo) => void): Promise<CanariumGen2.BoardInfo>|void {
        if (callback != null) {
            return invokeCallback(callback, this.getInfo());
        }
        if (!this._opened) {
            return Promise.reject(new Error('not opened'));
        }
        if (this._boardInfoCache != null) {
            return Promise.resolve(this._boardInfoCache);
        }
        debug('getInfo');
        return this.avm.read(this._systemIdBase, 16)
        .then((result) => {
            this._boardInfoCache = {
                id: GEN2_BOARD_ID,
                serialCode: generateSerialCode(
                    result.readUInt32LE(8),
                    result.readUInt32LE(12)
                ),
                systemId: result.readUInt32LE(0),
                timestamp: result.readUInt32LE(4),
            };
            return this._boardInfoCache;
        });
    }

    /**
     * 書き込みストリームを作成する
     * @param channel チャネル番号
     * @param packetized パケット化するか否か(trueの場合、1回で書き込まれたデータは1パケットとして送信される)
     */
    createWriteStream(channel: number, packetized?: boolean): CanariumGen2.AvsWritableStream;

    /**
     * 書き込みストリームを作成する
     * @param channel チャネル番号
     * @param options ストリームの振る舞いを指定するオプション
     */
    createWriteStream(channel: number, options: CanariumGen2.StreamOptions): CanariumGen2.AvsWritableStream;

    createWriteStream(channel: number, options?: boolean|CanariumGen2.StreamOptions): CanariumGen2.AvsWritableStream {
        if (typeof(options) === 'boolean') {
            return this.createWriteStream(channel, {packetized: options});
        }
        if (options == null) {
            options = {};
        }
        let pipe = this._classifyPipe(channel, options);
        return pipe.outbound.createStream(channel, !!options.packetized);
    }

    /**
     * 読み込みストリームを作成する
     * @param channel チャネル番号
     * @param packetized パケット化するか否か(trueの場合、SOP&EOPで識別されたパケットを単位として受信する)
     */
    createReadStream(channel: number, packetized?: boolean): CanariumGen2.AvsReadableStream;

    /**
     * 読み込みストリームを作成する
     * @param channel チャネル番号
     * @param options ストリームの振る舞いを指定するオプション
     */
    createReadStream(channel: number, options: CanariumGen2.StreamOptions): CanariumGen2.AvsReadableStream;

    createReadStream(channel: number, options?: boolean|CanariumGen2.StreamOptions): CanariumGen2.AvsReadableStream {
        if (typeof(options) === 'boolean') {
            return this.createReadStream(channel, {packetized: options});
        }
        if (options == null) {
            options = {};
        }
        let pipe = this._classifyPipe(channel, options);
        return pipe.inbound.createStream(channel, !!options.packetized);
    }

    /**
     * RPCクライアントを作成する
     * @param channel チャネル番号
     */
    createRpcClient(channel: number, options?: CanariumGen2.StreamOptions): CanariumGen2.RpcClient {
        let pipe = this._classifyPipe(channel, options);
        return new modRpcClient.RpcClient(
            pipe.outbound.createStream(channel, true),
            pipe.inbound.createStream(channel, true)
        );
    }

    /**
     * パイプを初期化する
     */
    private _setupPipes(): void {
        this._serial = new this._binding(this._path, {
            baudRate: this._options.baudRate,
            autoOpen: false
        });
        this._serial.on('close', () => {
            debug('on close');
            this._opened = false;
            if (!this._opening) {
                this.emit('close');
            } else {
                this._opening = false;
            }
        });
        this._serial.on('error', this.emit.bind(this, 'error'));
        this._defaultPipe = {
            inbound: new modAvsStreams.AvsDemultiplexer(<any>this._serial, this._options),
            outbound: new modAvsStreams.AvsMultiplexer(<any>this._serial, this._options),
        };
    }

    /**
     * 使用するパイプを特定する
     * @param channel チャネル番号
     * @param options ストリームオプション
     */
    private _classifyPipe(channel: number, options: CanariumGen2.StreamOptions): AvsBidirPipe {
        if (typeof(channel) !== 'number') {
            throw new Error('channel must be a number');
        }
        if (options == null) {
            options = {};
        }
        if (this._defaultPipe != null) {
            return this._defaultPipe;
        }
        throw new Error(`channel (${channel}) is not supported`);
    }

    /**
     * 通信テストを行う
     */
    private _connectionTest(): Promise<void> {
        return Promise.race([
            this.avm.testNoTransactionPacket(AVM_TEST_ADDRESS),
            new Promise<never>((resolve, reject) => {
                if (!this._options.disableTimeouts) {
                    setTimeout(reject, AVM_TEST_TIMEOUT, new Error('Connection timed out'));
                }
            })
        ]);
    }
}
