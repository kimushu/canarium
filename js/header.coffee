###
canarium.jsの先頭に配置されるスクリプト。
共通関数定義を行う。
###

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
  hex = (v) -> "0x#{if v < 16 then "0" else ""}#{v.toString(16)}"
  r = hex(data[v]) for v in [0..len]
  r += "..." if data.length > len
  r = "[#{r}]" if brace
  return r

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

class TimeLimit
  constructor: (@timeout) ->
    @start = @now
    return

  @property("now", get: ->
    return window.performance.now()
  )

  @property("left", get: ->
    return Math.max(0, @timeout - parseInt(@now - @start))
  )

###*
@private
@method
  成功するまで繰り返すPromiseオブジェクトを作成
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
  # tryPromise.count or= 0
  # tryPromise.pended or= 0
  # self = tryPromise.count++
  # pend = tryPromise.pended++
  # fin = false
  # log = (msg) ->
  #   return
  #   console.log({
  #     msg: " ".repeat(pend) + "[#{self}] #{parseInt(window.performance.now())} #{msg}"
  #     stack: new Error().stack.split("\n    ").slice(1)
  #   })
  # log("tryPromise(#{timeout} ms)")
  return new Promise((resolve, reject) ->
    lastReason = undefined
    window.setTimeout(
      ->
        # tryPromise.pended--
        # if fin
        #   log("already done")
        # else
        #   log("timeout!")
        reject(lastReason or Error("Operation timed out after #{count} tries"))
      timeout
    )
    next = ->
      # log("try##{count}")
      promiser().then(
        (value) ->
          # fin = true
          # log("succ##{count}")
          # tryPromise.pended--
          resolve(value)
        (reason) ->
          # fin = true
          # log("fail##{count}")
          lastReason = reason
          count++
          if maxTries? and count >= maxTries
            # log("over")
            # tryPromise.pended--
            return reject(lastReason)
          next()
      ) # promiser().then()
    next()
  ) # return new Promise()

