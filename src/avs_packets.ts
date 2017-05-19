import { BaseComm } from './base_comm';
import { printLog } from './common';

/**
 * PERIDOTボードAvalon-STパケット層通信クラス
 */
export class AvsPackets {
    /**
     * 下位層通信クラスのインスタンス
     */
    get base() { return this._base; }

    /**
     * デバッグ出力の細かさ(0で出力無し)
     */
    static verbosity: number = 0;

    /**
     * コンストラクタ
     * 
     * @param _base 下位層通信クラスのインスタンス
     */
    constructor(private _base: BaseComm) {
    }

    /**
     * Avalon-STパケットを送受信する。
     * チャネル選択およびSOP/EOPは自動的に付加される。
     * 現時点では、受信データに複数のチャネルがインタリーブすることは認めない。
     * @param channel   チャネル番号(0～255)
     * @param txdata    送信するパケットデータ
     * @param rxsize    受信するパケットのバイト数
     */
    transPacket(channel: number, txdata: Buffer, rxsize: number): Promise<Buffer> {
        function pushWithEscape(array, pos, byte) {
            if ((0x7a <= byte && byte <= 0x7d)) {
                array[pos++] = 0x7d;
                array[pos++] = byte ^ 0x20;
                return pos;
            }
            array[pos++] = byte;
            return pos;
        }
        channel &= 0xff;
        let src = txdata;
        let dst = Buffer.allocUnsafe(src.length * 2 + 5);
        let len = 0;
        dst[len++] = 0x7c;
        len = pushWithEscape(dst, len, channel);
        dst[len++] = 0x7a;
        let header = dst.slice(0, len);
        for (let i = 0; i < src.length - 1; ++i) {
            len = pushWithEscape(dst, len, src[i]);
        };
        dst[len++] = 0x7b;
        len = pushWithEscape(dst, len, src[src.length - 1]);
        txdata = dst.slice(0, len);
        let totalRxLen = rxsize + header.length + 1;
        this._log(1, 'transPacket', 'begin', {
            source: src,
            encoded: txdata
        });
        function eopFinder(rxdata: Buffer, offset: number) {
            for (let pos = offset; pos < rxdata.length; ++pos) {
                if ((rxdata[pos - 1] === 0x7b && rxdata[pos - 0] !== 0x7d) ||
                    (rxdata[pos - 2] === 0x7b && rxdata[pos - 1] === 0x7d)) {
                    return pos + 1;
                }
            }
            return; // Need more bytes
        }
        return this._base.transData(txdata, eopFinder)
        .then((rxdata) => {
            this._log(1, 'transPacket', 'recv', {
                encoded: rxdata
            });
            for (let i = 0; i < header.length; ++i) {
                if (rxdata[i] !== header[i]) {
                    throw new Error('Illegal packetize control bytes');
                }
            }
            src = rxdata.slice(header.length);
            dst = Buffer.allocUnsafe(rxsize);
            let pos = 0;
            let xor = 0x00;
            for (let i = 0; i < src.length; ++i) {
                let byte = src[i];
                if (pos === rxsize) {
                    throw new Error('Received data is too large');
                }
                if (byte === 0x7b) {
                    continue;
                }
                if (byte === 0x7d) {
                    xor = 0x20;
                } else {
                    dst[pos++] = byte ^ xor;
                    xor = 0x00;
                }
            }
            if (pos < rxsize) {
                throw new Error('Received data is too small');
            }
            this._log(1, 'transPacket', 'end', {
                decoded: dst
            });
            return dst;
        });
    }

    /**
     * ログの出力
     *
     * @param lvl      詳細度(0で常に出力。値が大きいほど詳細なメッセージを指す)
     * @param func      関数名
     * @param msg      メッセージまたはメッセージを返す関数
     * @param data      任意のデータ
     */
    private _log(lvl: number, func: string, msg: string|(() => string), data?: any): void {
        /* istanbul ignore next */
        if (AvsPackets.verbosity >= lvl) {
            printLog('AvsPackets', func, msg, data);
        }
    }
}
