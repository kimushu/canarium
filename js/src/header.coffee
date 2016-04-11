###
canarium.jsの先頭に配置されるスクリプト。
共通関数定義を行う。
###

# デバッグ向けのBuilt-inメソッド追加/上書き
# **** リリース用ビルドの時はfalseにすること ****
if false
  Uint8Array::hexDump = -> hexDump(this)

###
@private
@property {boolean}
  Chromeかどうかの判定
###
IS_CHROME = (chrome?.runtime?)

###
@private
@property {boolean}
  Node.jsかどうかの判定
###
IS_NODEJS = (!IS_CHROME and process? and require?)

###
@private
@property {Function}
  Promiseクラス
###
if IS_CHROME
  Promise = window.Promise
else if IS_NODEJS
  Promise = require("es6-promise").Promise

# 既にpropertyが定義されていた場合、canarium.jsロード後に
# 元の定義に戻すために一旦別名保存する。
# (戻す処理はfooter.coffeeにて行う)
oldProperty = Function::property

###
@private
@method
  Object.definePropertyによるプロパティ定義メソッド
@param {string} prop
  プロパティの名前
@param {Object} desc
  プロパティのディスクリプタ
###
Function::property = (prop, desc) ->
  Object.defineProperty @prototype, prop, desc

###*
@private
@method
  16進ダンプ表示の文字列に変換
@param {number/number[]/ArrayBuffer/Uint8Array} data
  変換するデータ
@param {number} [maxBytes]
  最長バイト数(省略時無制限)
@return {string}
  変換後の文字列
###
hexDump = (data, maxBytes) ->
  brace = true
  if typeof(data) == "number"
    brace = false
    data = [data]
  else if data instanceof ArrayBuffer
    data = new Uint8Array(data)
  else if data instanceof Uint8Array
    null  # No conversion needed
  else if data instanceof Array
    null  # No conversion needed
  else
    throw Error("Unsupported data type: #{data}")
  len = data.length
  len = Math.min(len, maxBytes) if maxBytes?
  hex = (v) -> "0x#{if v < 16 then "0" else ""}#{v?.toString?(16) or "??"}"
  r = (hex(data[i]) for i in [0...len]).join(",")
  r += "..." if data.length > len
  r = "[#{r}]" if brace
  return r

###*
@private
@method
  UTF-8文字列からArrayBufferに変換
@param {string} str
  UTF-8文字列
@return {ArrayBuffer}
  変換されたArrayBuffer
###
str2ab = (str) ->
  len = str.length
  ary = new Uint8Array(len * 4)
  pos = 0
  for i in [0...len]
    c = str.charCodeAt(i)
    if c < 0x80
      ary[pos++] = c
    else if c < 0x800
      ary[pos++] = 0xc0 | (c >>> 6)
      ary[pos++] = 0x80 | (c & 0x3f)
    else if c < 0x10000
      ary[pos++] = 0xe0 | (c >>> 12)
      ary[pos++] = 0x80 | ((c >>> 6) & 0x3f)
      ary[pos++] = 0x80 | (c & 0x3f)
    else
      ary[pos++] = 0xf0 | (c >>> 18)
      ary[pos++] = 0x80 | ((c >>> 12) & 0x3f)
      ary[pos++] = 0x80 | ((c >>> 6) & 0x3f)
      ary[pos++] = 0x80 | (c & 0x3f)
  buf = new Uint8Array(pos)
  buf.set(ary.subarray(0, pos), 0)
  return buf.buffer

###*
@private
@method
  Promiseオブジェクトからcallbackを呼び出し
@param {function(boolean,Object)/undefined} callback
  呼び出し先コールバック関数。省略時は引数promiseをそのまま返すだけの動作となる。
  第1引数はPromiseオブジェクトの実行成否(true/false)を示す。
  第2引数はthen節/catch節の引数をそのまま渡す。
@param {Promise} promise
  実行するPromiseオブジェクト
@return {undefined/Promise}
  Promiseオブジェクト(callbackがundefinedの場合のみ)
###
invokeCallback = (callback, promise) ->
  return promise unless callback
  promise.then((value) ->
    callback(true, value)
    return
  ).catch((reason) ->
    callback(false, reason)
    return
  )
  return

###*
@private
@method
  指定時間待機するPromiseオブジェクトを生成
@param {number} dulation
  待機時間(ミリ秒単位)
@param {Object} [value]
  成功時にPromiseValueとして渡されるオブジェクト
@return {Promise}
  Promiseオブジェクト
###
waitPromise = (dulation, value) ->
  return new Promise((resolve) ->
    setTimeout((-> resolve(value)), dulation)
  )

###*
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
###
tryPromise = (timeout, promiser, maxTries) ->
  count = 0
  return new Promise((resolve, reject) ->
    lastReason = undefined
    next = ->
      promiser().then(
        (value) ->
          resolve(value)
        (reason) ->
          lastReason = reason
          count++
          if maxTries? and count >= maxTries
            return reject(lastReason)
          setTimeout(
            -> next?()
            0
          )
      ) # promiser().then()
    setTimeout(
      ->
        next = null
        reject(lastReason or Error("Operation timed out after #{count} tries"))
      timeout
    )
    next()
  ) # return new Promise()

###*
@private
@method
  Promiseの成功失敗にかかわらず実行する関数のペアを生成
@return {Function[]}
  成功(fulfilled)と失敗(rejected)の関数ペア。
  promise.then(finallyPromise(-> 中身)...) として用いる。...を忘れないこと。
###
finallyPromise = (action) ->
  return [
    (value) ->
      action()
      return value
    (error) ->
      action()
      return Promise.reject(error)
  ] # return []

###*
@private
@method
  パフォーマンス計測用の現在時刻取得(ミリ秒単位)
@return {number}
  時刻情報
###
getCurrentTime = if IS_CHROME then (->
  return window.performance.now()
) else if IS_NODEJS then (->
  t = process.hrtime()
  return Math.round(t[0] * 1000000 + t[1] / 1000) / 1000
)

###*
@private
@class TimeLimit
  タイムアウト検出クラス
###
class TimeLimit
  ###*
  @method constructor
    コンストラクタ
  @param {number} timeout
    タイムアウト時間(ms)
  ###
  constructor: (@timeout) ->
    @start = @now
    return

  ###*
  @property {number} now
    現在時刻(残り時間ではない)
  @readonly
  ###
  @property("now", get: getCurrentTime)

  ###*
  @property {number} left
    残り時間(ms)
  @readonly
  ###
  @property("left", get: ->
    return Math.max(0, @timeout - parseInt(@now - @start))
  )

###*
@private
@class FIFOBuffer
  自動伸張FIFOバッファクラス
###
class FIFOBuffer
  ###*
  @method constructor
    コンストラクタ
  @param {number} [capacity=128]
    初期バイト数
  ###
  constructor: (capacity = 128) ->
    @buffer = new ArrayBuffer(capacity)
    @length = 0
    return

  ###*
  @method
    データを末尾に保存
  @param {Uint8Array/ArrayBuffer} data
    保存するデータ
  @return {undefined}
  ###
  push: (data) ->
    data = new Uint8Array(data) if data instanceof ArrayBuffer
    newLength = @length + data.length
    capacity = @buffer.byteLength
    if newLength > capacity
      capacity = 1 if capacity < 1
      capacity *= 2 while newLength > capacity
      newBuffer = new ArrayBuffer(capacity)
      new Uint8Array(newBuffer).set(new Uint8Array(@buffer))
      @buffer = newBuffer
    new Uint8Array(@buffer).set(data, @length)
    @length = newLength
    return

  ###*
  @method
    データを先頭から取り出し
  @param {number} length
    取り出すバイト数
  @return {ArrayBuffer}
    取り出したデータ
  ###
  shift: (length) ->
    length = @length if length > @length
    result = new Uint8Array(length)
    if length > 0
      array = new Uint8Array(@buffer)
      result.set(array.subarray(0, length))
      array.set(array.subarray(length, @length))
      @length -= length
    return result.buffer

