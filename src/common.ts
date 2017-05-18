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
/* istanbul ignore next */
export function printLog(cls: string, func: string, msg: string|(() => string), data?: any) {
    let out: any = {
        time: Date.now(),
        //stack: new Error().stack.split(/\n\s*/).slice(1),
    };
    out["" + cls + "#" + func] = (typeof(msg) === "function") ? msg() : msg;
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
/* istanbul ignore next */
export function hexDump(data: number | number[] | ArrayBuffer | Uint8Array, maxBytes?: number): string {
    let brace = true;
    if (typeof(data) === "number") {
        brace = false;
        data = [data];
    } else if (data instanceof ArrayBuffer) {
        data = new Uint8Array(data);
    } else if (data instanceof Uint8Array) {
    } else if (data instanceof Array) {
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
