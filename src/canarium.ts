import * as path from "path";
import { hexDump, invokeCallback, loopPromise, printLog, waitPromise, wrapPromise, TimeLimit } from "./common";
import { BaseComm, BoardCandidate } from "./base_comm";
import { I2CComm } from "./i2c_comm";
import { AvsPackets } from "./avs_packets";
import { AvmTransactions } from "./avm_transactions";
import { RpcClient } from "./rpc_client";
import { FileOpenFlags, RemoteFile } from "./remote_file";

/**
 * EEPROMのスレーブアドレス(7-bit表記)
 */
const EEPROM_SLAVE_ADDR = 0b1010000;

/**
 * EEPROMの最大バーストリード長(バイト数)
 */
const SPLIT_EEPROM_BURST = 6;

/**
 * コンフィグレーション開始のタイムアウト時間(ms)
 */
const CONFIG_TIMEOUT_MS = 3000;

/**
 * コンフィグレーションのタイムアウト時間(ms)
 */
const RECONFIG_TIMEOUT_MS = 3000;

/**
 * Avalon-MM 通信レイヤのチャネル番号
 */
const AVM_CHANNEL = 0;

/**
 * 標準PERIDOTのボードID
 */
const BOARDID_STANDARD = "J72A";

/**
 * PERIDOT-NewGenのボードID
 */
const BOARDID_NEWGEN = "J72N";

/**
 * VirtualモードHostbridgeのボードID
 */
const BOARDID_VIRTUAL = "J72B";

/**
 * GenericモードHostbridgeのボードID
 */
const BOARDID_GENERIC = "J72X";

/**
 * ボード情報
 */
export interface BoardInfo {
    /**
     * ボードの識別子(以下のうちいずれか)
     * - 'J72A' (PERIDOT Standard)
     * - 'J72N' (PERIDOT NewGen)
     * - 'J72B' (Virtual - コンフィグレーションレイヤをFPGA側に内蔵)
     * - 'J72X' (Generic - Avalon-MMブリッジのみ使う汎用型)
     */
    id?: "J72A"|"J72N"|"J72B"|"J72X";

    /**
     * シリアル番号('xxxxxx-yyyyyy-zzzzzz')
     */
    serialcode?: string;

    /**
     * ボード情報のバージョン
     */
    version?: number;
}

export interface BoardInfoAtOpen extends BoardInfo {
    /**
     * 接続後に書き込むrbfやrpdのデータ
     */
    rbfdata?: ArrayBuffer;
}

/**
 * PERIDOTボードドライバ
 */
export class Canarium {
    /**
     * ライブラリのバージョン
     */
    get version() {
        if (this._version == null) {
            this._version = require(path.join(__dirname, "..", "..", "package.json")).version;
        }
        return this._version;
    }
    private _version: string;

    /**
     * 接続しているボードの情報
     */
    get boardInfo() { return this._boardInfo; }

    /**
     * 接続しているボードの情報
     */
    private _boardInfo: BoardInfo;

    /**
     * デフォルトのビットレート
     */
    get serialBitrate() { return this._base.bitrate; }
    set serialBitrate(value) { this._base.bitrate = value; }

    /**
     * 接続状態(true: 接続済み, false: 未接続)
     */
    get connected() { return this._base.connected; }

    /**
     * コンフィグレーション状態(true: コンフィグレーション済み, false: 未コンフィグレーション)
     */
    get configured() { return this._base.configured; }

    /**
     * 下位層通信クラスのインスタンス
     */
    get base() { return this._base; }

    /**
     * 下位層通信クラスのインスタンス
     */
    private _base: BaseComm = new BaseComm();

    /**
     * I2C通信制御クラスのインスタンス
     */
    get i2c() { return this._i2c; }

    /**
     * I2C通信制御クラスのインスタンス
     */
    private _i2c: I2CComm = new I2CComm(this._base);

    /**
     * Avalon-STパケット層通信クラスのインスタンス
     */
    get avs() { return this._avs; }

    /**
     * Avalon-STパケット層通信クラスのインスタンス
     */
    private _avs: AvsPackets = new AvsPackets(this._base);

    /**
     * Avalon-MMトランザクション層通信クラスのインスタンス
     */
    get avm() { return this._avm; }

    /**
     * Avalon-MMトランザクション層通信クラスのインスタンス
     */
    private _avm: AvmTransactions = new AvmTransactions(this._avs, AVM_CHANNEL);

    /**
     * RPCクライアントクラスのインスタンス
     */
    get rpcClient() { return this._rpcClient; }

    /**
     * RPCクライアントクラスのインスタンス
     */
    private _rpcClient: RpcClient = new RpcClient(this._avm);

    /**
     * ホスト通信用ペリフェラル(SWI)のベースアドレス
     */
    get swiBase() { return this._avm.swiBase; }
    set swiBase(value) { this._avm.swiBase = value; }

    /**
     * クローズされた時に呼び出されるコールバック関数
     * (明示的にclose()した場合と、ボードが強制切断された場合の両方で呼び出される)
     */
    get onClosed() { return this._base.onClosed; }
    set onClosed(value) { this._base.onClosed = value; }

    /**
     * デバッグ出力の細かさ(0で出力無し)
     */
    static verbosity: number = 0;

    /**
     * コンフィグレーション中を示すフラグ(再帰実行禁止用)
     */
    private _configBarrier: boolean = false;

    /**
     * リセット中を示すフラグ(再帰実行禁止用)
     */
    private _resetBarrier: boolean = false;

    /**
     * 接続対象デバイスを列挙する
     * (PERIDOTでないデバイスも列挙される可能性があることに注意)
     */
    static enumerate(): Promise<BoardCandidate[]>;

    /**
     * 接続対象デバイスを列挙する
     * (PERIDOTでないデバイスも列挙される可能性があることに注意)
     *
     * @param callback  コールバック関数
     */
    static enumerate(callback: (success: boolean, result: BoardCandidate[]|Error) => void): void;

    static enumerate(callback?: (success: boolean, result: BoardCandidate[]|Error) => void): any {
        if (callback != null) {
            return invokeCallback(callback, this.enumerate());
        }
        return BaseComm.enumerate();
    }

    /**
     * ボードに接続する
     * 
     * @param path      接続先パス(enumerateが返すpath)
     * @param boardInfo 接続先ボードのIDやrbfデータなど(省略時はIDチェックやコンフィグレーションをしない)
     */
    open(path: string, boardInfo?: BoardInfoAtOpen): Promise<void>;

    /**
     * ボードに接続する
     * 
     * @param path      接続先パス(enumerateが返すpath)
     * @param boardInfo 接続先ボードのIDやrbfデータなど(省略時はIDチェックやコンフィグレーションをしない)
     * @param callback  コールバック関数
     */
    open(path: string, boardInfo?: BoardInfoAtOpen, callback?: (success: boolean, result: void|Error) => void): void;

    open(path: string, boardInfo?: BoardInfoAtOpen, callback?: (success: boolean, result: void|Error) => void): any {
        if (typeof(boardInfo) === "function") {
            callback = boardInfo;
            boardInfo = null;
        }
        if (callback != null) {
            return invokeCallback(callback, this.open(path, boardInfo));
        }
        return Promise.resolve()
        .then(() => {
            return this._base.connect(path);
        })
        .then(() => {
            this._boardInfo = null;
            return this._eepromRead(0x00, 4);
        })
        .then((result) => {
            let header = new Uint8Array(result);
            /* istanbul ignore if */
            if (!(header[0] === 0x4a && header[1] === 0x37 && header[2] === 0x57)) {
                throw new Error("EEPROM header is invalid");
            }
            this._log(1, "open", /* istanbul ignore next */ () => "done(version=" + (hexDump(header[3])) + ")");
            this._boardInfo = {
                version: header[3]
            };
            return this._base.transCommand(0x39);
        })
        .then((response) => {
            return this._base.option({
                forceConfigured: (response & 0x04) !== 0
            });
        })
        .then(() => {
            return this._validate(boardInfo);
        })
        .then(() => {
            if (boardInfo != null && boardInfo.rbfdata != null) {
                return this.config(null, boardInfo.rbfdata);
            }
        })
        .catch((error) => {
            if (this._base.connected) {
                return this._base.disconnect().then(() => {
                    throw error;
                });
            }
            throw error;
        });
    }

    /**
     * PERIDOTデバイスポートのクローズ
     */
    close(): Promise<void>;

    /**
     * PERIDOTデバイスポートのクローズ
     * 
     * @param callback  コールバック関数
     */
    close(callback: (success: boolean, result: void|Error) => void): void;

    close(callback?: (success: boolean, result: void|Error) => void): any {
        if (callback != null) {
            return invokeCallback(callback, this.close());
        }
        return this._base.disconnect()
        .then(() => {
            this._boardInfo = null;
        });
    }

    /**
     * ボードのFPGAコンフィグレーション
     * 
     * @param boardInfo ボード情報(ボードIDやシリアル番号を限定したい場合)
     * @param rbfdata   rbfまたはrpdのデータ
     */
    config(boardInfo: BoardInfo|void, rbfdata: ArrayBuffer): Promise<void>;

    /**
     * ボードのFPGAコンフィグレーション
     * 
     * @param boardInfo ボード情報(ボードIDやシリアル番号を限定したい場合)
     * @param rbfdata   rbfまたはrpdのデータ
     * @param callback  コールバック関数
     */
    config(boardInfo: BoardInfo|void, rbfdata: ArrayBuffer, callback: (success: boolean, result: void|Error) => void): void;

    config(boardInfo: BoardInfo|void, rbfdata: ArrayBuffer, callback?: (success: boolean, result: void|Error) => void): any {
        if (callback != null) {
            return invokeCallback(callback, this.config(boardInfo, rbfdata));
        }
        let timeLimit: TimeLimit;
        return Promise.resolve()
        .then(() => {
            if (this._configBarrier) {
                throw new Error("Configuration is now in progress");
            }
            this._configBarrier = true;
            let response;

            // コンフィグレーション可否の判断を行う
            let info: BoardInfo = (boardInfo != null ? {
                id: (<BoardInfo>boardInfo).id,
                serialcode: (<BoardInfo>boardInfo).serialcode
            } : {
                id: BOARDID_STANDARD
            });
            return this._validate(info);
        })
        .then(() => {
            // モードチェック
            // (コマンド：即時応答ON)
            return this._base.transCommand(0x3b);
        })
        .then((response) => {
            if ((response & 0x01) !== 0x00) {
                // ASモード(NG)
                throw new Error("Not PS mode");
            }
            // PSモード(OK)

            // タイムアウト計算の基点を保存
            // (ここからCONFIG_TIMEOUT_MS以内で処理完了しなかったらタイムアウト扱い)
            timeLimit = new TimeLimit(CONFIG_TIMEOUT_MS);

            // コンフィグレーション開始リクエスト発行(モード切替)
            return timeLimit.try(() => {
                // (コマンド：コンフィグモード, nCONFIGアサート, 即時応答ON)
                return this._base.transCommand(0x32)
                .then((response) => {
                    if ((response & 0x06) !== 0x00) {
                        throw null;
                    }
                    // STATUS=L, CONF_DONE=L => OK
                });
            });
        })
        .then(() => {
            // FPGAの応答待ち
            return timeLimit.try(() => {
                // (コマンド：コンフィグモード, nCONFIGネゲート, 即時応答ON)
                return this._base.transCommand(0x33)
                .then((response) => {
                    if ((response & 0x06) !== 0x02) {
                        throw null;
                    }
                    // nSTATUS=H, CONF_DONE=L => OK
                });
            });
        })
        .then(() => {
            // コンフィグレーションデータ送信
            return this._base.transData(rbfdata);
        })
        .then(() => {
            // コンフィグレーション完了チェック
            // (コマンド：コンフィグモード, 即時応答ON)
            return this._base.transCommand(0x33);
        })
        .then((response) => {
            if ((response & 0x06) !== 0x06) {
                throw new Error("FPGA configuration failed");
            }
            // nSTATUS=H, CONF_DONE=H => OK

            // コンフィグレーション完了(モード切替)
            // (コマンド：ユーザーモード)
            return this._base.transCommand(0x39);
        })
        .then((response) => {
            // CONF_DONEならコンフィグレーション済みとして設定する
            return this._base.option({
                forceConfigured: (response & 0x04) !== 0
            });
        })
        .then(() => {
            this._configBarrier = false;
        }, (error) => {
            this._configBarrier = false;
            throw error;            
        });
    }

    /**
     * ボードのFPGA再コンフィグレーション
     * @since 0.9.20
     */
    reconfig(): Promise<void>;

    /**
     * ボードのFPGA再コンフィグレーション
     * @since 0.9.20
     * @param callback  コールバック関数
     */
    reconfig(callback: (success: boolean, result: void|Error) => void): void;

    reconfig(callback?: (success: boolean, result: void|Error) => void): any {
        if (callback != null) {
            return invokeCallback(callback, this.reconfig());
        }
        if (this._configBarrier) {
            throw new Error("(Re)configuration is now in progress");
        }
        return wrapPromise(() => {
            this._configBarrier = true;
        }, () => {
            let timeLimit: TimeLimit;
            return Promise.resolve()
            .then(() => {
                // ボード種別を確認
                if (this._boardInfo == null || this._boardInfo.id == null) {
                    return this.getinfo();
                }
            })
            .then(() => {
                if (this._boardInfo == null || this._boardInfo.id === BOARDID_STANDARD) {
                    throw new Error("reconfig() cannot be used on this board");
                }

                // タイムアウト計算の基点を保存
                // (ここからRECONFIG_TIMEOUT_MS以内で処理完了しなかったらタイムアウト扱い)
                timeLimit = new TimeLimit(RECONFIG_TIMEOUT_MS);

                // コンフィグレーション開始リクエスト発行(モード切替)
                return timeLimit.try(() => {
                    // (コマンド：コンフィグモード, nCONFIGアサート, 即時応答ON)
                    return this._base.transCommand(0x32)
                    .then((response) => {
                        if ((response & 0x06) !== 0x00) {
                            throw null;
                        }
                        // nSTATUS=L, CONF_DONE=L => OK
                    });
                });
            })
            .then(() => {
                // FPGAの応答待ち
                return timeLimit.try(() => {
                    // (コマンド：コンフィグモード, nCONFIGネゲート, 即時応答ON)
                    return this._base.transCommand(0x33)
                    .then((response) => {
                        if ((response & 0x06) !== 0x02) {
                            throw null;
                        }
                    });
                });
            });
        }, () => {
            this._configBarrier = false;
        });
    }

    /**
     * ボードのマニュアルリセット
     */
    reset(): Promise<number>;

    /**
     * ボードのマニュアルリセット
     * 
     * @param callback  コールバック関数
     */
    reset(callback: (success: boolean, result: number|Error) => void): void;

    reset(callback?: (success: boolean, result: number|Error) => void): any {
        if (callback != null) {
            return invokeCallback(callback, this.reset());
        }
        if (this._resetBarrier) {
            throw new Error("Reset is now in progress");
        }
        return wrapPromise(() => {
            this._resetBarrier = true;
        }, () => {
            return Promise.resolve()
            .then(() => {
                // コンフィグモード(リセットアサート)
                return this._base.transCommand(0x31);
            })
            .then(() => {
                // 100ms待機
                return waitPromise(100);
            })
            .then(() => {
                // ユーザモード(リセットネゲート)
                return this._base.transCommand(0x39);
            })
            .then((response) => {
                return response;
            });
        }, () => {
            this._resetBarrier = false;
        });
    }


    /**
     * ボード情報の取得
     */
    getinfo(): Promise<BoardInfo>;

    /**
     * ボード情報の取得
     * 
     * @param callback  コールバック関数
     */
    getinfo(callback: (success: boolean, result: BoardInfo|Error) => void): void;
 
    getinfo(callback?: (success: boolean, result: BoardInfo|Error) => void): any {
        if (callback != null) {
            return invokeCallback(callback, this.getinfo());
        }
        return Promise.resolve()
        .then(() => {
            return this._base.assertConnection();
        })
        .then(() => {
            switch (this._boardInfo != null ? this._boardInfo.version : null) {
                /* istanbul ignore next */
                case null:
                    throw new Error("Boardinfo not loaded");
                case 1:
                    // ver.1 ヘッダ
                    return this._eepromRead(0x04, 8)
                    .then((readdata) => {
                        let info = new Uint8Array(readdata);
                        this._log(1, "getinfo", "ver1", info);
                        let mid = (info[0] << 8) | (info[1] << 0);
                        let pid = (info[2] << 8) | (info[3] << 0);
                        let sid = (info[4] << 24) | (info[5] << 16) | (info[6] << 8) | (info[7] << 0);
                        if (mid === 0x0072) {
                            let s = ("000" + pid.toString(16)).substr(-4) +
                                    ("0000000" + sid.toString(16)).substr(-8);
                            this._boardInfo.id = BOARDID_STANDARD;
                            this._boardInfo.serialcode = (s.substr(0, 6)) + "-" + (s.substr(6, 6)) + "-000000";
                        }
                    });
                case 2:
                    // ver.2 ヘッダ
                    return this._eepromRead(0x04, 22)
                    .then((readdata) => {
                        let info = new Uint8Array(readdata);
                        this._log(1, "getinfo", "ver2", info);
                        let bid = "";
                        for (let i = 0; i < 4; ++i) {
                            bid += String.fromCharCode(info[i]);
                        }
                        let s = "";
                        for (let i = 4; i < 22; ++i) {
                            s += String.fromCharCode(info[i]);
                        }
                        this._boardInfo.id = <any>bid;
                        this._boardInfo.serialcode = (s.substr(0, 6)) + "-" + (s.substr(6, 6)) + "-" + (s.substr(12, 6));
                    });
                default:
                    // 未知のヘッダバージョン
                    throw new Error("Unknown boardinfo version");
            }
        })
        .then(() => {
            return this._boardInfo;
        });
    }

    /**
     * ボード上のファイルを開く
     * @param path     パス
     * @param flags    フラグ(数字指定またはECMAオブジェクト指定)
     * @param mode     ファイル作成時のパーミッション
     * @param interval RPCポーリング周期
     */
    openRemoteFile(path: string, flags: number|FileOpenFlags, mode?: number, interval?: number): Promise<RemoteFile>;

    /**
     * ボード上のファイルを開く
     * @param path     パス
     * @param flags    フラグ(数字指定またはECMAオブジェクト指定)
     * @param mode     ファイル作成時のパーミッション
     * @param interval RPCポーリング周期
     * @param callback コールバック関数
     */
    openRemoteFile(path: string, flags: number|FileOpenFlags, mode?: number, interval?: number, callback?: (success: boolean, result: RemoteFile|Error) => void): void;

    openRemoteFile(path: string, flags: number|FileOpenFlags, mode?: number, interval?: number, callback?: (success: boolean, result: RemoteFile|Error) => void): any {
        if (typeof(mode) === "function") {
            callback = mode;
            interval = null;
            mode = null;
        } else if (typeof(interval) === "function") {
            callback = interval;
            interval = null;
        }
        if (callback != null) {
            return invokeCallback(callback, this.openRemoteFile(path, flags, mode, interval));
        }
        return RemoteFile.open(this._rpcClient, path, flags, mode, interval);
    }

    /**
     * EEPROMの読み出し
     * @param startaddr 読み出し開始アドレス
     * @param readbytes 読み出しバイト数
     */
    private _eepromRead(startaddr: number, readbytes: number): Promise<ArrayBuffer> {
        return wrapPromise(() => null, () => {
            let array = new Uint8Array(readbytes);
            let split = SPLIT_EEPROM_BURST || readbytes;
            return loopPromise(0, readbytes, split, (offset) => {
                let length = Math.min(split, readbytes - offset);
                let ack;

                this._log(1, "_eepromRead", /* istanbul ignore next */ () => "begin(addr=" + (hexDump(startaddr)) + ",bytes=" + (hexDump(readbytes)) + ")");

                return Promise.resolve()
                .then(() => {
                    // Start condition
                    return this.i2c.start();
                })
                .then(() => {
                    // Send slave address and direction (write)
                    return this.i2c.write(EEPROM_SLAVE_ADDR << 1);
                })
                .then((ack) => {
                    if (!ack) {
                        throw new Error("EEPROM is not found.");
                    }

                    // Send EEPROM address
                    return this.i2c.write(startaddr & 0xff);
                })
                .then((ack) => {
                    if (!ack) {
                        throw new Error("Cannot write address in EEPROM");
                    }

                    // Repeat start condition
                    return this.i2c.start();
                })
                .then(() => {
                    // Send slave address and direction (read)
                    return this.i2c.write((EEPROM_SLAVE_ADDR << 1) + 1);
                })
                .then((ack) => {
                    if (!ack) {
                        throw new Error("EEPROM is not found.");
                    }

                    return loopPromise(0, length, 1, (index) => {
                        return this.i2c.read(index < (length - 1))
                        .then((byte) => {
                            array[offset + index] = byte;
                        });
                    });
                });
            })
            .then(() => {
                this._log(1, "_eepromRead", "end", array);
                return array.buffer;
            })
        }, () => {
            return this.i2c.stop();
        });
    }

    /**
     * 接続先ボードのID/シリアル番号検証(不一致が発生した場合、rejectされる)
     * 
     * @param boardInfo 検証するボード情報
     */
    private _validate(boardInfo?: BoardInfo): Promise<void> {
        return Promise.resolve()
        .then(() => {
            return this._base.assertConnection();
        })
        .then(() => {
            if (boardInfo == null) {
                // すべて許可
                return;
            }
            return Promise.resolve()
            .then(() => {
                if (this._boardInfo.id == null || this._boardInfo.serialcode == null) {
                    // まだボード情報が読み込まれていないので先に読み込む
                    return this.getinfo();
                }
            })
            .then(() => {
                // 許可/不許可の判断を行う
                function mismatch(a, b) {
                    return (a != null ? a !== b : false);
                }
                if (mismatch(boardInfo.id, this._boardInfo.id)) {
                    throw new Error("Board ID mismatch");
                }
                if (mismatch(boardInfo.serialcode, this._boardInfo.serialcode)) {
                    throw new Error("Board serial code mismatch");
                }
            });
        });
    }

    /**
     * ログ出力関数
     */
    private static _logger: Function;

    /**
     * ログの出力
     * @param lvl   詳細度(0で常に出力。値が大きいほど詳細なメッセージを指す)
     * @param func  関数名
     * @param msg   メッセージ
     * @param data  任意のデータ
     */
    private _log(lvl: number, func: string, msg: string|(() => string), data?: any) {
        if (Canarium.verbosity >= lvl) {
            printLog("Canarium", func, msg, data);
        }
    }
}
