import { RpcClient } from "./rpc_client";
import { RemoteError } from "./remote_error";
import { printLog } from "./common";

/**
 * RPCポーリング周期のデフォルト値
 */
const REMOTEFILE_DEFAULT_INTERVAL = 200;

/**
 * ファイルオープン用フラグ
 */
export interface FileOpenFlags {
    /** 書き込み専用 */
    O_WRONLY?: boolean;

    /** 読み込み専用 */
    O_RDONLY?: boolean;

    /** 読み書き両用 */
    O_RDWR?: boolean;

    /** 追記モード */
    O_APPEND?: boolean;

    /** 作成モード */
    O_CREAT?: boolean
    ;
    /** 非ブロッキングモード */
    O_NONBLOCK?: boolean;

    /** 切り詰め(truncate)モード */
    O_TRUNC?: boolean;
}

/**
 * シーク用基点
 */
export interface FileSeekWhence {
    /** 先頭から数える */
    SEEK_SET?: boolean;

    /** 現在位置から数える */
    SEEK_CUR?: boolean;

    /** 末尾から数える */
    SEEK_END?: boolean;
}

/**
 * PERIDOTボード側ファイル操作クラス
 */
export class RemoteFile {
    /**
     * 仮想ファイルディスクリプタ
     */
    get vfd() { return this._vfd; }

    /**
     * 仮想ファイルディスクリプタ
     */
    private _vfd: number;

    /**
     * デバッグ出力の細かさ(0で出力無し)
     */
    static verbosity: number = 0;

    static get O_RDONLY()   { return 0; }
    static get O_WRONLY()   { return 1; }
    static get O_RDWR()     { return 2; }
    static get O_APPEND()   { return 0x0008; }
    static get O_CREAT()    { return 0x0200; }
    static get O_TRUNC()    { return 0x0400; }
    static get O_NONBLOCK() { return 0x4000; }

    /**
     * RPCによるopenの呼び出し
     * @param rpcClient RPCクライアントクラスのインスタンス
     * @param path      パス
     * @param flags     フラグ(数字指定またはECMAオブジェクト指定)
     * @param mode      ファイル作成時のパーミッション
     * @param interval  RPCポーリング周期
     */
    static async open(rpcClient: RpcClient, path: string, flags: number|FileOpenFlags, mode: number = 511, interval = REMOTEFILE_DEFAULT_INTERVAL): Promise<RemoteFile> {
        if (Object.prototype.toString.call(path) !== "[object String]") {
            throw new TypeError("path must be a string");
        }
        if (flags == null) {
            throw new TypeError("flags must be a number or Object");
        }
        if (typeof(mode) !== "number") {
            throw new TypeError("mode must be a number");
        }
        if (typeof(flags) !== "number") {
            let n = this.O_RDONLY;
            if (flags.O_WRONLY) {
                n = this.O_WRONLY;
            }
            if (flags.O_RDWR) {
                n = this.O_RDWR;
            }
            if (flags.O_APPEND) {
                n |= this.O_APPEND;
            }
            if (flags.O_CREAT) {
                n |= this.O_CREAT;
            }
            if (flags.O_NONBLOCK) {
                n |= this.O_NONBLOCK;
            }
            if (flags.O_TRUNC) {
                n |= this.O_TRUNC;
            }
            flags = n;
        }
        let result = await rpcClient.doCall("fs.open", {path, flags, mode}, interval);
        return new this(rpcClient, result.fd);
    }

    /**
     * ファイルを閉じる(closeのリモート呼び出し)
     */
    async close(): Promise<void> {
        if (this._fd == null) {
            throw new Error("File not opened");
        }
        await this._rpcClient.doCall("fs.close", {fd: this._fd});
        this._fd = null;
    }

    /**
     * ファイルからデータを読み込む
     *
     * @param length        読み込むバイト数
     * @param autoContinue  読み込んだバイト数がlengthに達するまで繰り返すか否か
     */
    async read(length: number, autoContinue: boolean = false): Promise<ArrayBuffer> {
        if (typeof(length) !== "number") {
            throw new TypeError("length must be a number");
        }
        let buffers = [];
        let total_read = 0;
        do {
            if (this._fd == null) {
                throw new Error("File not opened");
            }

            try {
                let result = await this._rpcClient.doCall("fs.read", {
                    fd: this._fd,
                    length: length - total_read
                });

                let read_length = result.length;
                if (read_length > 0) {
                    buffers.push(Buffer.from(result.data.read(0, read_length)));
                    total_read += read_length;
                }
            } catch (error) {
                if (error instanceof RemoteError) {
                    if (error.code === RemoteError.EAGAIN && total_read > 0) {
                        break;
                    }
                }
                throw error;
            }
        } while (autoContinue && total_read < length);

        let buffer = new ArrayBuffer(total_read);
        let combined = Buffer.from(buffer);
        let offset = 0;
        for (let i = 0; i < buffers.length; ++i) {
            let part = buffers[i];
            part.copy(combined, offset);
            offset += part.length;
        }
        return buffer;
    }

    /**
     * ファイルにデータを書き込む
     * 
     * @param data          書き込むデータ
     * @param autoContinue  書き込んだバイト数がlengthに達するまで繰り返すか否か
     */
    async write(data: ArrayBuffer, autoContinue: boolean = false): Promise<number> {
        if (!(data instanceof ArrayBuffer)) {
            throw new TypeError("data must be an ArrayBuffer");
        }
        let total_written = 0;
        do {
            if (this._fd == null) {
                throw new Error("File not opened");
            }

            try {
                let result = await this._rpcClient.doCall("fs.write", {
                    fd: this._fd,
                    data: Buffer.from(data, total_written)
                });

                total_written += result.length;
            } catch (error) {
                if (error instanceof RemoteError) {
                    if (error.code === RemoteError.EAGAIN && total_written > 0) {
                        break;
                    }
                }
                throw error;
            }
        } while (autoContinue && total_written < data.byteLength);
        return total_written;
    }

    /**
     * ファイルポインタの移動
     * @param offset    移動量
     * @param whence    移動の基点を示す値(SEEK_SET=0,SEEK_CUR=1,SEEK_END=2)またはECMAオブジェクト
     */
    async lseek(offset: number, whence: number|FileSeekWhence): Promise<number> {
        if (typeof(offset) !== "number") {
            throw new TypeError("offset must be a number");
        }
        if (typeof(whence) !== "number" && whence != null) {
            if (whence.SEEK_SET && !whence.SEEK_CUR && !whence.SEEK_END) {
                whence = 0;
            } else if (!whence.SEEK_SET && whence.SEEK_CUR && !whence.SEEK_END) {
                whence = 1;
            } else if (!whence.SEEK_SET && !whence.SEEK_CUR && whence.SEEK_END) {
                whence = 2;
            }
        }
        if (typeof(whence) !== "number") {
            throw new TypeError("whence must be a number or object with SEEK_xxx key");
        }
        let result = await this._rpcClient.doCall("fs.lseek", {
            fd: this._fd,
            offset: offset,
            whence: whence
        });
        return result.offset;
    }

    async fstat(): Promise<any> {
        throw new Error("Not implemented");
    }

    async ioctl(): Promise<any> {
        throw new Error("Not implemented");
    }

    /**
     * コンストラクタ
     *
     * @param _rpcClient    RPCクライアントクラスのインスタンス
     * @param _fd           ファイルディスクリプタ
     */
    private constructor(private _rpcClient: RpcClient, private _fd: number) {
    }


    /**
     * ログの出力
     * @param lvl   詳細度(0で常に出力。値が大きいほど詳細なメッセージを指す)
     * @param func  関数名
     * @param msg   メッセージまたはメッセージを返す関数
     * @param data  任意のデータ
     */
    private _log(lvl: number, func: string, msg: string|(() => string), data?: any) {
        if (RemoteFile.verbosity >= lvl) {
            printLog("RemoteFile", func, msg, data);
        }
    }
}
