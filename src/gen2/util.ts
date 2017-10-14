/**
 * Promiseからコールバック呼び出しへの変換 (Promise → callback(rejected_reason, fulfilled_value))
 * @param callback コールバック関数
 * @param promise コールバックを呼び出すためのPromiseオブジェクト
 */
export function invokeCallback<T>(callback: (err: Error, result?: T) => void, promise: Promise<T>): void {
    promise.then(
        (result) => callback(undefined, result),
        (reason) => callback(reason)
    );
}
