###*
@class Canarium.Serial
  PERIDOTボード シリアル通信ポートクラス
@extends Canarium.Port
###
class Canarium.Serial extends Canarium.Port
  null

  #----------------------------------------------------------------
  # Public properties
  #

  ###*
  @property {boolean} isOpened
    ポートがオープンされているかどうか
  @inheritdoc #_isOpened
  @readonly
  ###
  @property "isOpened",
    get: -> @_isOpened

  ###*
  @static
  @property {number}
    デバッグ出力の細かさ(0で出力無し)
  ###
  @verbosity: 0

  #----------------------------------------------------------------
  # Private properties
  #

  ###*
  @private
  @property {boolean} _isOpened
    ポートがオープンされているかどうか
  ###

  ###*
  @private
  @property {FIFOBuffer} _txBuffer
    送信バッファ
  ###

  ###*
  @private
  @property {FIFOBuffer} _rxBuffer
    受信バッファ
  ###

  ###*
  @private
  @property {Function/null} _rxWaiter
    受信待ち関数
  ###

  #----------------------------------------------------------------
  # Public methods
  #

  ###*
  @method constructor
    コンストラクタ
  @param {Canarium.HostComm} _hostComm
    ホスト通信クラスのインスタンス
  @param {number} [_portNumber=8250]
    ポート番号
  @param {number} [_pollingInterval=100]
    ポーリング間隔(ms)
  ###
  constructor: (_hostComm, _portNumber = 8250, _pollingInterval = 100) ->
    super(_hostComm, _portNumber, _pollingInterval)
    @_isOpened = false
    @_txBuffer = new FIFOBuffer()
    @_rxBuffer = new FIFOBuffer()
    @_rxWaiter = null
    return

  ###*
  @method open
    シリアルポートを開く
  @param {function(boolean,Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト
  ###
  open: (callback) ->
    return invokeCallback(callback, @open()) if callback?
    return Promise.reject("Port has been already opened") if @_isOpened
    @_isOpened = true
    return Promise.resolve()

  ###*
  @method write
    シリアルポートにデータを書き込む(即時の送信完了を保証しない)
  @param {Uint8Array/ArrayBuffer/string} buffer
    書き込むデータ
  @param {function(boolean,Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト
  ###
  write: (buffer, callback) ->
    return invokeCallback(callback, @write(buffer)) if callback?
    return Promise.reject("Port is not opened") unless @_isOpened
    buffer = str2ab(buffer) if typeof(buffer) == "string"
    @_txBuffer.push(buffer)
    return Promise.resolve()

  ###*
  @method read
    シリアルポートからデータを読み込む
  @param {number} length
    読み込むバイト数
  @param {function(boolean,ArrayBuffer/Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト
  @return {ArrayBuffer} return.PromiseValue
    受信したデータ
  ###
  read: (length, callback) ->
    return invokeCallback(callback, @read(length)) if callback?
    return Promise.reject("Port is not opened") unless @_isOpened
    return Promise.reject("Read operation is in progress") if @_rxWaiter
    if @_rxBuffer.length >= length
      return Promise.resolve(@_rxBuffer.shift(length))
    return new Promise((resolve, reject) =>
      @_rxWaiter = =>
        return if @_rxBuffer.length < length
        @_rxWaiter = null
        resolve(@_rxBuffer.shift(length))
    ) # return new Promise()

  ###*
  @method readline
    シリアルポートから1行分の文字列を読み込む
  @param {number} [delim=0xa]
    デリミタ(改行コード)
  @param {function(boolean,string/Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト
  @return {string} return.PromiseValue
    受信した文字列(改行文字を含む)
  ###
  readline: (delim = 0xa, callback) ->
    return invokeCallback(callback, @readline(delim)) if callback?
    return new Promise((resolve, reject) =>
      buffer = new Uint8Array(128)
      length = 0
      next = =>
        @read(1).then(
          (charBuffer) =>
            char = (new Uint8Array(charBuffer))[0]
            if length == buffer.byteLength
              newBuffer = new Uint8Array(buffer.byteLength * 2)
              newBuffer.set(buffer, 0)
              buffer = newBuffer
            buffer[length++] = char
            return next() unless char == delim
            return resolve(String.fromCharCode.apply(null, buffer.subarray(0, length)))
          (error) =>
            return reject(error)
        ) # @read().then()
        return
      next()
    ) # return new Promise()

  # TODO: pause()
  # TODO: resume()

  ###*
  @method flush
    送信バッファ/受信バッファのデータを廃棄する
  @param {function(boolean,Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト
  ###
  flush: (callback) ->
    return invokeCallback(callback, @flush()) if callback?
    return Promise.reject("Port is not opened") unless @_isOpened
    return Promise.reject("not implemented")  # FIXME

  ###*
  @method drain
    送信バッファ/受信バッファのデータを強制的に送受信して空にする
  @param {function(boolean,Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト
  ###
  drain: (callback) ->
    return invokeCallback(callback, @drain()) if callback?
    return Promise.reject("Port is not opened") unless @_isOpened
    return Promise.reject("not implemented")  # FIXME

  ###*
  @method close
    シリアルポートを閉じる
  @param {function(boolean,Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト
  ###
  close: (callback) ->
    return invokeCallback(callback, @close()) if callback?
    return Promise.reject("Port is not opened") unless @_isOpened
    @_isOpened = false
    return Promise.resolve()

  #----------------------------------------------------------------
  # Protected methods
  #

  ###*
  @protected
  @method
    ホストが書き込み(ホスト→クライアント)
  @param {number} length
    要求バイト数
  @return {Promise}
    Promiseオブジェクト
  @return {ArrayBuffer/number} return.PromiseValue
    読み取ったデータ(resolve)またはエラーコード(reject)
  ###
  processHostWrite: (length) ->
    length = Math.min(length, @_txBuffer.length)
    return Promise.resolve(@_txBuffer.shift(length)) if length > 0
    return Promise.reject(Canarium.Errno.EWOULDBLOCK)

  ###*
  @protected
  @method
    ホストが読み込み(クライアント→ホスト)
  @param {ArrayBuffer} buffer
    転送要求データ
  @return {Promise}
    Promiseオブジェクト
  @return {number} return.PromiseValue
    読み込み完了したバイト数(resolve)またはエラーコード(reject)
  ###
  processHostRead: (buffer) ->
    @_rxBuffer.push(buffer)
    @_rxWaiter?()
    return Promise.resolve(buffer.byteLength)

  #----------------------------------------------------------------
  # Private methods
  #

  ###*
  @private
  @method
    受信データダンプ(デバッグ用)
  @return {undefined}
  ###
  _dumpChars: ->
    @read(1).then((buffer) =>
      array = new Uint8Array(buffer)
      console.log("Serial(#{@portNumber})>#{array[0]}:#{String.fromCharCode.apply(null, array)}")
      @_dumpChars()
    )
    return

  ###*
  @private
  @method
    受信データダンプ(デバッグ用)
  @return {undefined}
  ###
  _dumpLines: ->
    @readline().then((line) =>
      console.log("Serial(#{@portNumber})>#{line}")
      @_dumpLines()
    )
    return

  ###*
  @private
  @method
    ログの出力
  @param {number} lvl
    詳細度(0で常に出力。値が大きいほど詳細なメッセージを指す)
  @param {string} func
    関数名
  @param {string} msg
    メッセージ
  @param {Object} [data]
    任意のデータ
  @return {undefined}
  ###
  _log: (lvl, func, msg, data) ->
    Canarium._log("Serial", func, msg, data) if @constructor.verbosity >= lvl
    return

