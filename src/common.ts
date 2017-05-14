/*
 * Canarium内部で用いられる共通関数の定義を行う。
 */

/**
 * ログの出力(全クラス共通)
 * @param cls   クラス名
 * @param func  関数名
 * @param msg   メッセージまたはメッセージを返す関数
 * @param data  任意のデータ
 */
export function printLog(cls: string, func: string, msg: string|(() => string), data?: any) {
    let out: any = {
        time: Date.now(),
        //stack: new Error().stack.split(/\n\s*/).slice(1),
    };
    out["" + cls + "#" + func] = (typeof(msg) == "function") ? msg() : msg;
    if (data) {
        out.data = data;
    }
    if (this._logger != null) {
        (this._logger)(out);
    } else {
        console.log(out);
    }
}

/**
 * 16進ダンプ表示の文字列に変換
 * @param data      変換するデータ
 * @param maxBytes  最長バイト数(省略時無制限)
 */
export function hexDump(data: number | number[] | ArrayBuffer | Uint8Array, maxBytes?: number): string {
    let brace = true;
    if (typeof(data) === "number") {
        brace = false;
        data = [data];
    } else if (data instanceof ArrayBuffer) {
        data = new Uint8Array(data);
    } else if (data instanceof Uint8Array) {
        null;
    } else if (data instanceof Array) {
        null;
    } else {
        throw new Error("Unsupported data type: " + data);
    }
    let len = data.length;
    if (maxBytes != null) {
        len = Math.min(len, maxBytes);
    }
    function hex(v) {
        return "0x" + (v < 16 ? "0" : "") + (v != null ? v.toString(16) : "??");
    }
    let r = "";
    for (let i = 0; i < len; ++i) {
        r += (i > 0 ? "," : "") + hex(data[i]);
    }
    if (data.length > len) {
        r += "...";
    }
    if (brace) {
        r = "[" + r + "]";
    }
    return r;
}

/**
 * UTF-8文字列からArrayBufferに変換
 * @param str   UTF-8文字列
 */
export function str2ab(str: string): ArrayBuffer {
    let len = str.length;
    let ary = new Uint8Array(len * 4);
    let pos = 0;
    for (let i = 0; i < len; ++i) {
        let c = str.charCodeAt(i);
        if (c < 0x80) {
            ary[pos++] = c;
        } else if (c < 0x800) {
            ary[pos++] = 0xc0 | (c >>> 6);
            ary[pos++] = 0x80 | (c & 0x3f);
        } else if (c < 0x10000) {
            ary[pos++] = 0xe0 | (c >>> 12);
            ary[pos++] = 0x80 | ((c >>> 6) & 0x3f);
            ary[pos++] = 0x80 | (c & 0x3f);
        } else {
            ary[pos++] = 0xf0 | (c >>> 18);
            ary[pos++] = 0x80 | ((c >>> 12) & 0x3f);
            ary[pos++] = 0x80 | ((c >>> 6) & 0x3f);
            ary[pos++] = 0x80 | (c & 0x3f);
        }
    }
    let buf = new Uint8Array(pos);
    buf.set(ary.subarray(0, pos), 0);
    return buf.buffer;
}

/**
 * Promiseオブジェクトからcallbackを呼び出し
@param {function(boolean,Object)/undefined} callback
  呼び出し先コールバック関数。省略時は引数promiseをそのまま返すだけの動作となる。
  第1引数はPromiseオブジェクトの実行成否(true/false)を示す。
  第2引数はthen節/catch節の引数をそのまま渡す。
@param {Promise} promise
  実行するPromiseオブジェクト
@return {undefined/Promise}
  Promiseオブジェクト(callbackがundefinedの場合のみ)
 */
export function invokeCallback<T>(callback: (success: boolean, result: T|Error) => void, promise: Promise<T>): void|Promise<T> {
    if (!callback) {
        return promise;
    }
    promise.then((value: T) => {
        callback(true, value);
    }, (reason: Error) => {
        callback(false, reason);
    });
};

/**
 * 指定時間待機するPromiseオブジェクトを生成
 * @param dulation  待機時間(ミリ秒単位)
 * @param value     成功時にPromiseValueとして渡されるオブジェクト
 */
export function waitPromise<T>(dulation: number, value?: T): Promise<T> {
    return new Promise((resolve) => {
        global.setTimeout(() => {
            return resolve(value);
        }, dulation);
    });
}

/**
 * 指定回数ループするPromiseオブジェクトを生成
 * @param start     ループ初期値
 * @param end       ループ終了値(この値を含まない)
 * @param step      増分
 * @param action    実行するアクション
 */
export function loopPromise<T>(start: number, end: number, step: number, action: (value: number) => Promise<T>): Promise<T> {
    function loop(value){
        return action(value).then((result) => {
            value += step;
            if ((step > 0 && value < end) || (step < 0 && value > end)) {
                return loop(value);
            }
            return result;
        })
    }
    return loop(start);
}

/**
@private
@method
  成功するまで繰り返すPromiseオブジェクトを生成
@param {number} timeout
  最大待機時間(ミリ秒単位)
@param {function():Promise} promiser
  繰り返す動作のPromiseを生成する関数
@param {number} [maxTries]
  最大繰り返し回数(省略時：無制限)
@return {Promise}
  生成されたPromiseオブジェクト
 *-/

tryPromise = function (timeout, promiser, maxTries) {
    var count;
    count = 0;
    return new Promise(function (resolve, reject) {
        var lastReason, next;
        lastReason = void 0;
        next = function () {
            return promiser().then(function (value) {
                return resolve(value);
            }, function (reason) {
                lastReason = reason;
                count++;
                if ((maxTries != null) && count >= maxTries) {
                    return reject(lastReason);
                }
                return setTimeout(function () {
                    return typeof next === "function" ? next() : void 0;
                }, 0);
            });
        };
        setTimeout(function () {
            next = null;
            return reject(lastReason || Error("Operation timed out after " + count + " tries"));
        }, timeout);
        return next();
    });
};


/**
 * Promiseの前後に必ず実行する事前アクション/事後アクションを結合したPromiseを生成
 * @param before    事前に実行するアクション(これが失敗するとそこで終了)
 * @param body      実行するアクション本体(beforeが成功すれば実行される)
 * @param after     事後に実行するアクション(アクション本体が失敗しても実行される)
 */
export function wrapPromise<T>(before: Function, body: () => Promise<T>|T, after: Function): Promise<T> {
    function doAfter() {
        return Promise.resolve()
        .then(() => {
            return after();
        })
        .catch(() => {});
    }
    return Promise.resolve()
    .then(() => {
        return before();
    })
    .then(() => {
        return Promise.resolve()
        .then(() => {
            return body();
        })
        .then(
            (result) => doAfter().then(() => result),
            (reason) => doAfter().then(() => { throw reason; })
        );
    });
}

/**
 * パフォーマンス計測用の現在時刻取得(ミリ秒単位)
 *-/
getCurrentTime = IS_CHROME ? (function () {
    return window.performance.now();
}) : IS_NODEJS ? (function () {
    var t;
    t = process.hrtime();
    return Math.round(t[0] * 1000000 + t[1] / 1000) / 1000;
}) : void 0;
//*/


/**
 * タイムアウト検出クラス
 */
export class TimeLimit {
    /** 開始時間 (ms) */
    private _start: number;

    /** 終了時間 (ms) */
    private _limit: number;
    
    /**
     * @param timeout   タイムアウト(ms)
     */
    constructor(private _timeout: number) {
        this._start = this.now();
        this._limit = this._start + _timeout;
    }

    /** 現在時間の取得 */
    now(): number {
        return Date.now();
    }

    /** 成功するかタイムアウトするまで繰り返す */
    try<T>(action: () => Promise<T>, wait?: number): Promise<T> {
        function loop(_this: TimeLimit){
            return action()
            .catch(() => {
                if (_this.now() < _this._limit) {
                    if (wait > 0) {
                        return waitPromise(wait)
                        .then(() => {
                            return loop;
                        });
                    }
                    return loop(_this);
                } else {
                    throw new Error(`Operation timed out (${_this._timeout} ms)`);
                }
            });
        }
        return loop(this);
    }
}

/**
@private
@class FIFOBuffer
  自動伸張FIFOバッファクラス
 *-/

FIFOBuffer = (function () {

    /**
    @method constructor
      コンストラクタ
    @param {number} [capacity=128]
      初期バイト数
     *-/
    function FIFOBuffer(capacity) {
        if (capacity == null) {
            capacity = 128;
        }
        this.buffer = new ArrayBuffer(capacity);
        this.length = 0;
        return;
    }


    /**
    @method
      データを末尾に保存
    @param {Uint8Array/ArrayBuffer} data
      保存するデータ
    @return {undefined}
     *-/

    FIFOBuffer.prototype.push = function (data) {
        var capacity, newBuffer, newLength;
        if (data instanceof ArrayBuffer) {
            data = new Uint8Array(data);
        }
        newLength = this.length + data.length;
        capacity = this.buffer.byteLength;
        if (newLength > capacity) {
            if (capacity < 1) {
                capacity = 1;
            }
            while (newLength > capacity) {
                capacity *= 2;
            }
            newBuffer = new ArrayBuffer(capacity);
            new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));
            this.buffer = newBuffer;
        }
        new Uint8Array(this.buffer).set(data, this.length);
        this.length = newLength;
    };


    /**
    @method
      データを先頭から取り出し
    @param {number} length
      取り出すバイト数
    @return {ArrayBuffer}
      取り出したデータ
     *-/

    FIFOBuffer.prototype.shift = function (length) {
        var array, result;
        if (length > this.length) {
            length = this.length;
        }
        result = new Uint8Array(length);
        if (length > 0) {
            array = new Uint8Array(this.buffer);
            result.set(array.subarray(0, length));
            array.set(array.subarray(length, this.length));
            this.length -= length;
        }
        return result.buffer;
    };

    return FIFOBuffer;

})();

}).call(this);
//*/
