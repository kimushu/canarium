import { invokeCallback, TimeLimit, printLog } from "./common";
import { BaseComm } from "./base_comm";

/**
 * I2C通信のタイムアウト時間
 */
const I2C_TIMEOUT_MS: number = 1000;

/**
 * PERIDOTボードI2C通信クラス
 */
export class I2CComm {
    /**
     * デバッグ出力の細かさ(0で出力無し)
     */
    static verbosity: number = 0;

    /**
     * @param _base 下位層通信クラスのインスタンス
     */
    constructor(private _base: BaseComm) {
    }

    /**
     * スタートコンディションの送信
     */
    start(): Promise<void>;

    /**
     * スタートコンディションの送信
     * 
     * @param callback  コールバック関数
     */
    start(callback: (success: boolean, result: void|Error) => void): void;

    start(callback?: (success: boolean, result: void|Error) => void): any {
        if (callback != null) {
            return invokeCallback(callback, this.start());
        }

        return (async () => {
            this._log(1, "start", "(start condition)");
            let timeLimit = new TimeLimit(I2C_TIMEOUT_MS);

            // Setup
            // (コマンド：SDA=Z, SCL=Z, 即時応答ON)
            await timeLimit.try(async () => {
                let response = await this._base.transCommand(0x3b);
                if ((response & 0x30) !== 0x30) {
                    throw null;
                }
            });

            // SDA -> L
            // (コマンド：SDA=L, SCL=Z, 即時応答ON)
            await this._base.transCommand(0x1b);

            // SCL -> L
            // (コマンド：SDA=L, SCL=L, 即時応答ON)
            await this._base.transCommand(0x0b);
        })();
    }

    /**
     * ストップコンディションの送信
     * (必ずSCL='L'が先行しているものとする)
     */
    stop(): Promise<void>;

    /**
     * ストップコンディションの送信
     * (必ずSCL='L'が先行しているものとする)
     * 
     * @param callback  コールバック関数
     */
    stop(callback: (success: boolean, result: void|Error) => void): void;

    stop(callback?: (success: boolean, result: void|Error) => void): any {
        if (callback != null) {
            return invokeCallback(callback, this.stop());
        }

        return (async () => {
            this._log(1, "stop", "(stop condition)");
            let timeLimit = new TimeLimit(I2C_TIMEOUT_MS);
            
            // Setup
            // (コマンド：SDA=L, SCL=L, 即時応答ON)
            await this._base.transCommand(0x0b);

            // SCL -> HiZ(H)
            // (コマンド：SDA=L, SCL=Z, 即時応答ON)
            await timeLimit.try(async () => {
                let response = await this._base.transCommand(0x1b);
                if ((response & 0x30) !== 0x10) {
                    throw null;
                }
            });
            
            // SDA -> HiZ(H)
            // (コマンド：SDA=Z, SCL=Z, 即時応答ON)
            await timeLimit.try(async () => {
                let response = await this._base.transCommand(0x3b);
                if ((response & 0x30) !== 0x30) {
                    throw null;
                }
            });

            // 即時応答OFF設定の復旧
            if (!this._base.sendImmediate) {
                // (コマンド：SDA=Z, SCL=Z, 即時応答OFF)
                await this._base.transCommand(0x39);
            }
        })();
    }

    /**
     * バイトリード
     * (必ずSCL='L'が先行しているものとする)
     * @param ack       ACK返却の有無(true:ACK, false:NAK)
     */
    read(ack: boolean): Promise<number>;

    /**
     * バイトリード
     * (必ずSCL='L'が先行しているものとする)
     * @param ack       ACK返却の有無(true:ACK, false:NAK)
     * @param callback  コールバック関数
     */
    read(ack: boolean, callback: (success: boolean, result: number|Error) => void): void;

    read(ack: boolean, callback?: (success: boolean, result: number|Error) => void): any {
        if (callback != null) {
            return invokeCallback(callback, this.read(ack));
        }
        return (async () => {
            let timeLimit = new TimeLimit(I2C_TIMEOUT_MS);

            // Read bits
            let readData = 0x00;
            for (let bitNum = 7; bitNum >= 0; --bitNum) {
                let bit = await timeLimit.try(() => this._readBit());
                this._log(2, "read", "bit#" + bitNum + "=" + bit);
                readData |= (bit << bitNum);
            }

            // Send ACK/NAK
            this._log(2, "read", ack ? "ACK" : "NAK");
            await timeLimit.try(() => this._writeBit(ack ? 0 : 1));

            this._log(1, "read", () => "data=0x" + (readData.toString(16)));
            return readData;
        })();
    }

    /**
     * バイトライト
     * (必ずSCL='L'が先行しているものとする)
     * @param writebyte 書き込むデータ(0～255)
     */
    write(writebyte: number): Promise<boolean>;

    /**
     * バイトライト
     * (必ずSCL='L'が先行しているものとする)
     * @param writebyte 書き込むデータ(0～255)
     * @param callback  コールバック関数
     */
    write(writebyte: number, callback: (success: boolean, result: boolean|Error) => void): void;

    write(writebyte: number, callback?: (success: boolean, result: boolean|Error) => void): any {
        if (callback != null) {
            return invokeCallback(callback, this.write(writebyte));
        }
        return (async () => {
            writebyte = parseInt(<any>writebyte);
            this._log(1, "write", () => "data=0x" + (writebyte.toString(16)));
            let timeLimit = new TimeLimit(I2C_TIMEOUT_MS);

            // Write bits
            for (let bitNum = 7; bitNum >= 0; --bitNum) {
                let bit = <0|1>((writebyte >>> bitNum) & 1);
                this._log(2, "write", "bit#" + bitNum + "=" + bit);
                await timeLimit.try(() => this._writeBit(bit));
            }

            // Receive ACK/NAK
            let bit = await timeLimit.try(() => this._readBit());
            let ack = (bit === 0);
            this._log(2, "write", ack ? "ACK" : "NAK");
            return ack;
        })();
    }

    /**
     * ログの出力
     * @param lvl   詳細度(0で常に出力。値が大きいほど詳細なメッセージを指す)
     * @param func  関数名
     * @param msg   メッセージまたはメッセージを返す関数
     * @param data  任意のデータ
     */
    private _log(lvl: number, func: string, msg: string|(() => string), data?: any) {
        if (I2CComm.verbosity >= lvl) {
            printLog("I2CComm", func, msg, data);
        }
    };

    /**
     * 1ビットリード
     * (必ずSCL='L'が先行しているものとする)
     */
    private async _readBit(): Promise<0|1> {
        let timeLimit = new TimeLimit(I2C_TIMEOUT_MS);
        let bit: 0|1 = 0;

        // Setup
        // (コマンド：SDA=Z, SCL=Z, 即時応答ON)
        this._log(3, "_readBit", "setup,SCL->HiZ");
        await timeLimit.try(async () => {
            let response = await this._base.transCommand(0x3b);
            if ((response & 0x10) !== 0x10) {
                throw null;
            }
            if ((response & 0x20) === 0x20) {
                bit = 1;
            }
        });

        // SCL -> L
        // (コマンド：SDA=Z, SCL=L, 即時応答ON)
        this._log(3, "_readBit", "SCL->L");
        await this._base.transCommand(0x2b);

        return bit;
    }

    /**
     * 1ビットライト
     * (必ずSCL='L'が先行しているものとする)
     * @param bit   書き込みビット値
     */
    private async _writeBit(bit: 0|1): Promise<void> {
        let mask = (bit !== 0 ? 1 : 0) << 5;
        let timeLimit = new TimeLimit(I2C_TIMEOUT_MS);

        // Setup
        // (コマンド：SDA=bit, SCL=L, 即時応答ON)
        this._log(3, "_writeBit", "setup");
        await this._base.transCommand(0x0b | mask);

        // SCL -> HiZ(H)
        // (コマンド：SDA=bit, SCL=Z, 即時応答ON)
        this._log(3, "_writeBit", "SCL->HiZ");
        await timeLimit.try(async () => {
            let response = await this._base.transCommand(0x1b | mask);
            if ((response & 0x10) !== 0x10) {
                throw null;
            }
        });

        // SDA -> HiZ(H)
        // (コマンド：SDA=Z, SCL=L, 即時応答ON)
        this._log(3, "_writeBit", "SCL->L");
        await this._base.transCommand(0x2b);
    }
}
