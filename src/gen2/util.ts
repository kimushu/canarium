
export function invokeCallback<T>(callback: (err: Error, result?: T) => void, promise: Promise<T>): void {
    promise.then(
        (result) => callback(undefined, result),
        (reason) => callback(reason)
    );
}
