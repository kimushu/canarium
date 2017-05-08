import { hexDump, invokeCallback, printLog } from "./common";
import { BaseCommOptions } from "./base_comm";
import { AvsPackets } from "./avs_packets";

/**
 * ホスト通信用ペリフェラル(SWI)のベースアドレスの既定値
 */
const SWI_BASE_ADDR_DEFAULT = 0x10000000;

/**
 * 1回のトランザクションで読み書きできる最大バイト数
 */
const AVM_TRANS_MAX_BYTES = 32768;

/**
 * Avalon-MMトランザクション層のオプション
 */
export interface AvmTransactionsOptions extends BaseCommOptions {
}

/**
 * PERIDOTボードAvalon-MMトランザクション層通信クラス
 */
export class AvmTransactions {
    /**
     * BaseCommインスタンス
     */
    get base() { return this._avs.base; }

    /**
     * ホスト通信用ペリフェラル(SWI)のベースアドレス
     */
    private _swiBase: number;
    get swiBase(): number { return this._swiBase; }
    set swiBase(value: number) { this._swiBase = parseInt(<any>value); }

    /**
     * デバッグ出力の細かさ(0で出力無し)
     */
    static verbosity: number = 0;

    /**
     * キューされている動作の最後尾を示すPromiseオブジェクト
     */
    private _lastAction: Promise<any>;

    /**
     * @param _avs      Avalon-STパケット層通信クラスのインスタンス
     * @param _channel  パケットのチャネル番号
     */
    constructor(private _avs: AvsPackets, private _channel: number) {
        this._swiBase = SWI_BASE_ADDR_DEFAULT;
        this._lastAction = Promise.resolve();
    }

    /**
     * AvalonMMメモリリード(IORD_DIRECT)
     *
     * @param address   読み込み元アドレス(バイト単位)
     * @param bytenum   読み込むバイト数
     */
    read(address: number, bytenum: number): Promise<ArrayBuffer>;

    /**
     * AvalonMMメモリリード(IORD_DIRECT)
     *
     * @param address   読み込み元アドレス(バイト単位)
     * @param bytenum   読み込むバイト数
     * @param callback  コールバック関数
     */
    read(address: number, bytenum: number, callback: (success: boolean, result: ArrayBuffer | Error) => void): void;

    read(address: number, bytenum: number, callback?: (success: boolean, result: ArrayBuffer | Error) => void): any {
        if (callback != null) {
            return invokeCallback(callback, this.read(address, bytenum));
        }
        return this._avs.base.assertConnection().then(() => {
            return this._queue(async () => {
                this._log(1, "read", () => "begin(address=" + (hexDump(address)) + ")");
                if (!this._avs.base.configured) {
                    throw new Error("Device is not configured");
                }
                let dest = new Uint8Array(bytenum);
                for (let pos = 0; pos < bytenum; pos += AVM_TRANS_MAX_BYTES) {
                    let partialSize = Math.min(bytenum - pos, AVM_TRANS_MAX_BYTES);
                    this._log(2, "read", () => "partial(offset=" + (hexDump(pos)) + ",size=" + (hexDump(partialSize)) + ")");
                    let partialData = await this._trans(
                        0x14,   // Read, incrementing address
                        address + pos,
                        undefined,
                        partialSize
                    );
                    dest.set(new Uint8Array(partialData), pos);
                }
                this._log(1, "read", "end", dest);
                return dest.buffer;
            });
        });
    }

    /**
     * AvalonMMメモリライト(IOWR_DIRECT)
     *
     * @param address   書き込み先アドレス(バイト単位)
     * @param writedata 書き込むデータ
     */
    write(address: number, writedata: ArrayBuffer): Promise<void>;

    /**
     * AvalonMMメモリライト(IOWR_DIRECT)
     *
     * @param address   書き込み先アドレス(バイト単位)
     * @param writedata 書き込むデータ
     * @param callback  コールバック関数
     */
    write(address: number, writedata: ArrayBuffer, callback: (success: boolean, result?: Error) => void): void;

    write(address: number, writedata: ArrayBuffer, callback?: (success: boolean, result?: Error) => void): any {
        if (callback != null) {
            return invokeCallback(callback, this.write(address, writedata));
        }
        let src = new Uint8Array(writedata.slice(0));
        return this._avs.base.assertConnection().then(() => {
            return this._queue(async () => {
                this._log(1, "write", () => "begin(address=" + (hexDump(address)) + ")", src);
                if (!this._avs.base.configured) {
                    throw new Error("Device is not configured");
                }
                for (let pos = 0; pos < src.byteLength; pos += AVM_TRANS_MAX_BYTES) {
                    let partialData = src.subarray(pos, pos + AVM_TRANS_MAX_BYTES);
                    this._log(2, "write", () => "partial(offset=" + (hexDump(pos)) + ")", partialData);
                    await this._trans(
                        0x04,   // Write, incrementing address
                        address + pos,
                        partialData,
                        undefined
                    );
                }
                this._log(1, "write", "end");
            });
        });
    }

    /**
     * AvalonMMペリフェラルリード(IORD, リトルエンディアンの32-bit符号無し整数)
     *
     * @param address   読み込み元ベースアドレス(バイト単位。ただし自動的に4バイトの倍数に切り捨てられる)
     * @param offset    オフセット(4バイトワード単位)
      */
    iord(address: number, offset: number): Promise<number>;

    /**
     * AvalonMMペリフェラルリード(IORD, リトルエンディアンの32-bit符号無し整数)
     *
     * @param address   読み込み元ベースアドレス(バイト単位。ただし自動的に4バイトの倍数に切り捨てられる)
     * @param offset    オフセット(4バイトワード単位)
     * @param callback  コールバック関数
      */
    iord(address: number, offset: number, callback: (success: boolean, result: number|Error) => void): void;

    iord(address: number, offset: number, callback?: (success: boolean, result: number|Error) => void): any {
        if (callback != null) {
            return invokeCallback(callback, this.iord(address, offset));
        }
        return this._avs.base.assertConnection().then(() => {
            return this._queue(async () => {
                this._log(1, "iord", () => "begin(address=" + (hexDump(address)) + "+" + offset + ")");
                if (!this._avs.base.configured) {
                    throw new Error("Device is not configured");
                }
                let rxdata = await this._trans(
                    0x10,   // Read, non-incrementing address
                    (address & 0xfffffffc) + (offset << 2),
                    undefined,
                    4
                );
                let src = new Uint8Array(rxdata);
                let readData = ((src[3] << 24) | (src[2] << 16) | (src[1] << 8) | (src[0] << 0)) >>> 0;
                this._log(1, "iord", "end", readData);
                return readData;
            });
        });
    };

    /**
     * AvalonMMペリフェラルライト(IOWR, リトルエンディアンの32-bit整数)
     *
     * @param address   書き込み先ベースアドレス(バイト単位。ただし自動的に4バイトの倍数に切り捨てられる)
     * @param offset    オフセット(4バイトワード単位)
     * @param writedata 書き込むデータ
     */
    iowr(address: number, offset: number, writedata: number): Promise<void>;

    /**
     * AvalonMMペリフェラルライト(IOWR, リトルエンディアンの32-bit整数)
     *
     * @param address   書き込み先ベースアドレス(バイト単位。ただし自動的に4バイトの倍数に切り捨てられる)
     * @param offset    オフセット(4バイトワード単位)
     * @param writedata 書き込むデータ
     * @param callback  コールバック関数
     */
    iowr(address: number, offset: number, writedata: number, callback: (success: boolean, result?: Error) => void): void;

    iowr(address: number, offset: number, writedata: number, callback?: (success: boolean, result?: Error) => void): any {
        if (callback != null) {
            return invokeCallback(callback, this.iowr(address, offset, writedata));
        }
        return this._avs.base.assertConnection().then(() => {
            return this._queue(async () => {
                this._log(1, "iowr", () => "begin(address=" + (hexDump(address)) + "+" + offset + ")", writedata);
                if (!this._avs.base.configured) {
                    throw new Error("Device is not configured");
                }
                let src = new Uint8Array(4);
                src[0] = (writedata >>> 0) & 0xff;
                src[1] = (writedata >>> 8) & 0xff;
                src[2] = (writedata >>> 16) & 0xff;
                src[3] = (writedata >>> 24) & 0xff;
                await this._trans(
                    0x00,   // Write, non-incrementing address
                    (address & 0xfffffffc) + (offset << 2),
                    src,
                    undefined
                );
                this._log(1, "iowr", "end");
            });
        });
    }

    /**
     * AvalonMMオプション設定
     * @param option    オプション
     */
    option(option: AvmTransactionsOptions): Promise<void>;

    /**
     * AvalonMMオプション設定
     * @param option    オプション
     * @param callback  コールバック関数
     */
    option(option: AvmTransactionsOptions, callback: (success: boolean, result?: Error) => void): void;

    option(option: AvmTransactionsOptions, callback?: (success: boolean, result?: Error) => void): any {
        if (callback != null) {
            return invokeCallback(callback, this.option(option));
        }
        return this._avs.base.assertConnection().then(() => {
            return this._queue(function () {
                return this._avs.base.option(option);
            });
        });
    };

    /**
     * 非同期実行キューに追加する
     * @param action    Promiseオブジェクトを返却する関数
     */
    private _queue<T>(action: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            return this._lastAction = this._lastAction.then(action)
            .then(resolve, reject);
        });
    };

    /**
     * ログの出力
     * @param lvl   詳細度(0で常に出力。値が大きいほど詳細なメッセージを指す)
     * @param func  関数名
     * @param msg   メッセージまたはメッセージを返す関数
     * @param data  任意のデータ
     */
    private _log(lvl: number, func: string, msg: string|(() => string), data?: any) {
        if (AvmTransactions.verbosity >= lvl) {
            printLog("AvmTransactions", func, msg, data);
        }
    }

    /**
     * トランザクションの発行
     *
     * @param transCode トランザクションコード
     * @param address   アドレス
     * @param txdata    送信パケットに付加するデータ(受信時はundefined)
     * @param rxsize    受信するバイト数(送信時はundefined)
     */
    private async _trans(transCode: number, address: number, txdata?: Uint8Array, rxsize?: number): Promise<ArrayBuffer> {
        let len: number, pkt: Uint8Array;
        if (txdata != null) {
            len = txdata.byteLength;
            pkt = new Uint8Array(8 + len);
        } else {
            len = rxsize
            pkt = new Uint8Array(8);
        }
        pkt[0] = transCode;
        pkt[1] = 0x00;
        pkt[2] = (len >>> 8) & 0xff;
        pkt[3] = (len >>> 0) & 0xff;
        pkt[4] = (address >>> 24) & 0xff;
        pkt[5] = (address >>> 16) & 0xff;
        pkt[6] = (address >>> 8) & 0xff;
        pkt[7] = (address >>> 0) & 0xff;
        if (txdata != null) {
            pkt.set(txdata, 8);
        }
        this._log(2, "_trans", "send", pkt);
        let rxdata = await this._avs.transPacket(this._channel, pkt.buffer, rxsize || 4);
        this._log(2, "_trans", "recv", new Uint8Array(rxdata));
        if (rxsize != null) {
            if (rxdata.byteLength !== rxsize) {
                throw new Error("Received data length does not match");
            }
            return rxdata;
        }
        let res = new Uint8Array(rxdata);
        if (!(res[0] === (pkt[0] ^ 0x80) && res[2] === pkt[2] && res[3] === pkt[3])) {
            throw new Error("Illegal write response");
        }
    }
}
