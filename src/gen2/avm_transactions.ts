import { invokeCallback } from './util';
import { AvsReadableStream, AvsWritableStream } from './avs_streams';
require('promise.prototype.finally').shim();

/**
 * 1回のトランザクションで読み書きできる最大バイト数
 */
const AVM_TRANS_MAX_BYTES: number = 32768;

export class AvmTransactionsGen2 {
    private _promise: Promise<any> = Promise.resolve();

    constructor(private _sink: AvsWritableStream, private _source: AvsReadableStream) {
        console.assert(_sink.packetized);
        console.assert(_source.packetized);
    }

    /**
     * AvalonMMメモリリード(IORD_DIRECT)
     *
     * @param address       読み込み元アドレス(バイト単位)
     * @param byteLength    読み込むバイト数
     */
    read(address: number, byteLength: number): Promise<Buffer>;

    /**
     * AvalonMMメモリリード(IORD_DIRECT)
     *
     * @param address       読み込み元アドレス(バイト単位)
     * @param byteLength    読み込むバイト数
     * @param callback      コールバック関数
     */
    read(address: number, byteLength: number, callback: (err: Error, result?: Buffer) => void): void;

    read(address: number, byteLength: number, callback?: (err: Error, result?: Buffer) => void): Promise<Buffer>|void {
        if (callback != null) {
            return invokeCallback(callback, this.read(address, byteLength));
        }
        let buffer = Buffer.allocUnsafe(byteLength);
        let readPart = (offset: number) => {
            if (offset >= byteLength) {
                return Promise.resolve(buffer);
            }
            let partLength = Math.min(byteLength - offset, AVM_TRANS_MAX_BYTES);
            return this._doTransaction(
                0x14,
                (address + offset),
                partLength,
                null
            )
            .then((result) => {
                result.copy(buffer, offset);
                return readPart(offset + partLength);
            });
        };
        return readPart(0);
    }

    /**
     * AvalonMMメモリライト(IOWR_DIRECT)
     *
     * @param address   書き込み先アドレス(バイト単位)
     * @param writeData 書き込むデータ
     */
    write(address: number, writeData: Buffer): Promise<void>;

    /**
     * AvalonMMメモリライト(IOWR_DIRECT)
     *
     * @param address   書き込み先アドレス(バイト単位)
     * @param writeData 書き込むデータ
     * @param callback  コールバック関数
     */
    write(address: number, writeData: Buffer, callback: (err: Error) => void): void;

    write(address: number, writeData: Buffer, callback?: (err: Error) => void): Promise<void>|void {
        if (callback != null) {
            return invokeCallback(callback, this.write(address, writeData));
        }
        let byteLength = writeData.length;
        let writePart = (offset: number) => {
            if (offset >= byteLength) {
                return Promise.resolve();
            }
            let partLength = Math.min(byteLength - offset, AVM_TRANS_MAX_BYTES);
            return this._doTransaction(
                0x04,
                (address + offset),
                partLength,
                writeData.slice(offset, offset + partLength)
            )
            .then(() => {
                return writePart(offset + partLength);
            });
        };
        return writePart(0);
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
    iord(address: number, offset: number, callback: (err: Error, result?: number) => void): void;

    iord(address: number, offset: number, callback?: (err: Error, result?: number) => void): Promise<number>|void {
        if (callback != null) {
            return invokeCallback(callback, this.iord(address, offset));
        }
        return this._doTransaction(0x10, (address & 0xfffffffc) >>> 0, 4, null)
        .then((result) => {
            return result.readUInt32LE(0);
        });
    }

    /**
     * AvalonMMペリフェラルライト(IOWR, リトルエンディアンの32-bit整数)
     *
     * @param address   書き込み先ベースアドレス(バイト単位。ただし自動的に4バイトの倍数に切り捨てられる)
     * @param offset    オフセット(4バイトワード単位)
     * @param writeData 書き込むデータ
     */
    iowr(address: number, offset: number, writeData: number): Promise<void>;
    
    /**
     * AvalonMMペリフェラルライト(IOWR, リトルエンディアンの32-bit整数)
     *
     * @param address   書き込み先ベースアドレス(バイト単位。ただし自動的に4バイトの倍数に切り捨てられる)
     * @param offset    オフセット(4バイトワード単位)
     * @param writeData 書き込むデータ
     * @param callback  コールバック関数
     */
    iowr(address: number, offset: number, writeData: number, callback: (err: Error) => void): void;

    iowr(address: number, offset: number, writeData: number, callback?: (err: Error) => void): Promise<void>|void {
        if (callback != null) {
            return invokeCallback(callback, this.iowr(address, offset, writeData));
        }
        return this._doTransaction(0x00, (address & 0xfffffffc) >>> 0, 4, writeData)
        .then(() => {});
    }

    /**
     * パケット送受信テスト (No transactionパケット)
     * @param address   アドレス
     */
    testNoTransactionPacket(address: number): Promise<void>;

    /**
     * パケット送受信テスト (No transactionパケット)
     * @param address   アドレス
     * @param callback  コールバック関数
     */
    testNoTransactionPacket(address: number, callback: (err: Error) => void): void;

    testNoTransactionPacket(address: number, callback?: (err: Error) => void): Promise<void>|void {
        if (callback != null) {
            return invokeCallback(callback, this.testNoTransactionPacket(address));
        }
        return this._doTransaction(0x7f, address, 0, Buffer.alloc(0))
        .then(() => {});
    }

    /**
     * トランザクションの発行
     * @param code      トランザクションコード
     * @param address   アドレス
     * @param size      サイズ
     * @param writeData 書き込むデータ(BufferまたはUInt32LEで格納されるnumber)
     */
    private _doTransaction(code: number, address: number, size: number, writeData: Buffer|number): Promise<Buffer> {
        let promise = this._promise
        .then(() => {
            return new Promise<Buffer>((resolve, reject) => {
                let packet = Buffer.alloc(8 + (writeData != null ? size : 0));
                packet.writeUInt8(code, 0);
                packet.writeUInt16BE(size, 2);
                packet.writeUInt32BE(address >>> 0, 4);
                if (typeof(writeData) === 'number') {
                    packet.writeUInt32LE((writeData >>> 0), 8);
                } else if (writeData) {
                    writeData.copy(packet, 8);
                }
                this._sink.once('error', reject);
                this._source.once('error', reject);
                let recv = (result: Buffer) => {
                    this._source.removeListener('error', reject);
                    if (writeData == null) {
                        if (size !== result.length) {
                            return reject(new Error(`Received unexpected length of data (expected=${size}, actual=${result.length})`));
                        }
                        return resolve(result);
                    }
                    let reply = result.readUInt8(0);
                    if (reply !== (code ^ 0x80)) {
                        return reject(new Error(`Received unexpected code (expected=${code ^ 0x80}, actual=${reply})`));
                    }
                    let sizeDone = result.readUInt16BE(2);
                    if (sizeDone !== size) {
                        return reject(new Error(`Received unexpected size (expected=${size}, actual=${sizeDone}`));
                    }
                    return resolve(result);
                };
                this._source.once('data', recv);
                this._sink.write(packet, (err) => {
                    if (err) {
                        this._source.removeListener('data', recv);
                        return reject(err);
                    }
                    this._sink.removeListener('error', reject);
                });
            });
        });
        this._promise = promise.finally();
        return promise;
    }
}
