import { EventEmitter } from "events";
import { AvsWritableStream, AvsReadableStream, AvsMultiplexer, AvsDemultiplexer } from "./avs_streams";
import { AvmTransactionsGen2 } from "./avm_transactions";

const AVS_CH_SYS_MIN = 0;
const AVS_CH_SYS_MAX = 7;
const AVS_CH_USER_MIN = 8;
const AVS_CH_USER_MAX = 255;

export interface CanariumPort {
    path: string;
}

export interface CanariumListOptions {
}

export interface CanariumStreamOptions {
    packetized?: boolean;
}

interface AvsBidirPipe {
    mux: AvsMultiplexer;
    demux: AvsDemultiplexer;
}

export class CanariumGen2 extends EventEmitter {
    private _systemPipe: AvsBidirPipe;
    private _userPipe: AvsBidirPipe;
    private _avm: AvmTransactionsGen2;

    /**
     * Canarium(Gen2)のインスタンスを生成する
     * @param _path 接続先のパス
     */
    constructor(private _path: string) {
        super();
    }

    /**
     * 接続先の列挙
     */
    static list(options?: CanariumListOptions): Promise<CanariumPort[]>;
    static list(callback: (err: Error, ports?: CanariumPort[]) => void): void;
    static list(options: CanariumListOptions, callback: (err: Error, ports?: CanariumPort[]) => void): void;
    static list(options?: CanariumListOptions, callback?: (err: Error, ports?: CanariumPort[]) => void): Promise<CanariumPort[]>|void {
        if (typeof(options) === "function") {
            callback = options;
            options = null;
        }
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
     * 接続
     */
    open(): Promise<void>;
    open(callback: (err: Error) => void): void;
    open(callback?: (err: Error) => void): Promise<void>|void {
    }

    /**
     * 切断
     */
    close(): Promise<void>;
    close(callback: (err: Error) => void): void;
    close(callback?: (err: Error) => void): Promise<void>|void {
    }

    /**
     * 書き込みストリームを作成
     */
    createWriteStream(channel: number, packetized?: boolean): AvsWritableStream;
    createWriteStream(channel: number, options: CanariumStreamOptions): AvsWritableStream;
    createWriteStream(channel: number, options?: boolean|CanariumStreamOptions): AvsWritableStream {
        if (typeof(options) == "boolean") {
            return this.createWriteStream(channel, {packetized: options});
        }
        if (options == null) {
            options = {};
        }
        let pipe = this._classifyPipe(channel);
        if (pipe == null) {
            throw new Error(`channel (${channel}) is not supported`);
        }
        return pipe.mux.createStream(channel, !!options.packetized);
    }

    /**
     * 読み込みストリームを作成
     */
    createReadStream(channel: number, packetized?: boolean): AvsReadableStream;
    createReadStream(channel: number, options: CanariumStreamOptions): AvsReadableStream;
    createReadStream(channel: number, options?: boolean|CanariumStreamOptions): AvsReadableStream {
        if (typeof(options) == "boolean") {
            return this.createReadStream(channel, {packetized: options});
        }
        if (options == null) {
            options = {};
        }
        let pipe = this._classifyPipe(channel);
        if (pipe == null) {
            throw new Error(`channel (${channel}) is not supported`);
        }
        return pipe.demux.createStream(channel, !!options.packetized);
    }

    private _classifyPipe(channel: number): AvsBidirPipe {
        if (typeof(channel) !== "number") {
            throw new Error("channel must be a number");
        }
        if ((AVS_CH_SYS_MIN <= channel) && (channel <= AVS_CH_SYS_MAX)) {
            return this._systemPipe;
        }
        if ((AVS_CH_USER_MIN <= channel) && (channel <= AVS_CH_USER_MAX)) {
            return this._userPipe;
        }
        throw new Error(`channel number (${channel}) is out of range`);
    }

}