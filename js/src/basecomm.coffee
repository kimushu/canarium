###*
@class Canarium.BaseComm
  PERIDOTボード下位層通信クラス
@uses Canarium.BaseComm.SerialWrapper
###
class Canarium.BaseComm
  null

  #----------------------------------------------------------------
  # Public properties
  #

  ###*
  @property {boolean} connected
    接続状態

    - true: 接続済み
    - false: 未接続
  @readonly
  ###
  @property "connected",
    get: -> @_connection?

  ###*
  @property {string} path
    接続しているシリアル通信デバイスのパス
  @readonly
  ###
  @property "path",
    get: -> "#{@_path}"

  ###*
  @property {number} bitrate
    ビットレート(bps)
  ###
  @property "bitrate",
    get: -> @_bitrate
    set: (v) -> @_bitrate = parseInt(v)

  ###*
  @property {boolean} sendImmediate
    即時応答ビットを立てるかどうか
  @readonly
  ###
  @property "sendImmediate",
    get: -> @_sendImmediate

  ###*
  @property {boolean} configured
    コンフィグレーション済みかどうか
  @readonly
  ###
  @property "configured",
    get: -> @_configured

  ###*
  @property {function()} onClosed
    クローズされた時に呼び出されるコールバック関数
    (明示的にclose()した場合と、ボードが強制切断された場合の両方で呼び出される)
  ###
  @property "onClosed",
    get: -> @_onClosed
    set: (v) -> @_onClosed = v

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
  @property {Canarium.BaseComm.SerialWrapper} _connection
    シリアル接続クラスのインスタンス
  ###

  ###*
  @private
  @property {number} _bitrate
  @inheritdoc #bitrate
  ###

  ###*
  @private
  @property {boolean} _sendImmediate
  @inheritdoc #sendImmediate
  ###

  ###*
  @private
  @property {boolean} _configured
  @inheritdoc #configured
  ###

  ###*
  @private
  @property {ArrayBuffer} _rxBuffer
    受信中データ
  ###

  ###*
  @private
  @property {function(ArrayBuffer=,Error=)} _receiver
    受信処理を行う関数
  ###

  ###*
  @private
  @static
  @cfg {number}
    1回のシリアル送信の最大バイト数
  @readonly
  ###
  SERIAL_TX_MAX_LENGTH = 1024

  ###*
  @private
  @static
  @cfg {number}
    連続シリアル送信の間隔(ミリ秒)
  @readonly
  ###
  SUCCESSIVE_TX_WAIT_MS = null # 4

  #----------------------------------------------------------------
  # Public methods
  #

  ###*
  @static
  @method
    接続対象デバイスを列挙する
    (PERIDOTでないデバイスも列挙される可能性があることに注意)
  @return {Promise}
    Promiseオブジェクト
  @return {Object[]} return.PromiseValue
    デバイスの配列(各要素は次のメンバを持つ)

    - name : UI向け名称(COMxxなど)
    - path : 内部管理向けパス
  ###
  @enumerate: ->
    getFriendlyName = (port) ->
      name = port.manufacturer
      path = port.path
      return "#{name} (#{path})" if name and name != ""
      return "#{path}"
    return BaseComm.SerialWrapper.list().then((ports) ->
      devices = []
      devices.push({
        path: "#{port.path}"
        name: getFriendlyName(port)
      }) for port in ports
      return devices
    ) # return serialWrapper.list().then()

  ###*
  @method constructor
    コンストラクタ
  ###
  constructor: ->
    @_connection = null
    @_bitrate = 115200
    @_sendImmediate = false
    @_configured = false
    return

  ###*
  @method
    ボードに接続する
  @param {string} path
    接続先パス(enumerateが返すpath)
  @return {Promise}
    Promiseオブジェクト
  ###
  connect: (path) ->
    return Promise.reject(Error("Already connected")) if @_connection?
    @_connection = new BaseComm.SerialWrapper(path, {baudRate: @_bitrate})
    @_receiver = null
    return @_connection.open().then(=>
      @_connection.onClosed = =>
        @_connection = null
        (@_onClosed)?()
        return
      @_connection.onReceived = (data) =>
        @_receiver?(data)
        return
      return
    ).catch((error) =>
      @_connection = null
      @_receiver = null
      return Promise.reject(error)
    ) # return @_connection.open().then()...

  ###*
  @method
    オプション設定
  @param {Object} option
    オプション
  @param {boolean} option.sendImmediate
    即時応答ビットを有効にするかどうか
  @param {boolean} option.forceConfigured
    コンフィグレーション済みとして扱うかどうか
  @return {Promise}
    Promiseオブジェクト
  ###
  option: (option) ->
    return Promise.reject(Error("Not connected")) unless @_connection?
    return Promise.resolve(
    ).then(=>
      return unless (value = option.fastAcknowledge)?
      @_sendImmediate = !!value
      return @transCommand(0x39 | (if value then 0x02 else 0x00))
    ).then(=>
      return unless (value = option.forceConfigured)?
      @_configured = !!value
      return
    ).then(=>
      return  # Last PromiseValue
    ) # return Promise.resolve()...

  ###*
  @method
    ボードから切断する
  @return {Promise}
    Promiseオブジェクト
  ###
  disconnect: ->
    return @assertConnection().then(=>
      @_receiver = null
      return @_connection.close()
    )

  ###*
  @method
    接続されていることを確認する
  @return {Promise}
    Promiseオブジェクト
  ###
  assertConnection: ->
    return Promise.reject(Error("Not connected")) unless @_connection?
    return Promise.resolve()

  ###*
  @method
    制御コマンドの送受信を行う
  @param {number} command
    コマンドバイト
  @return {Promise}
    Promiseオブジェクト
  @return {number} return.PromiseValue
    受信コマンド
  ###
  transCommand: (command) ->
    txarray = new Uint8Array(2)
    txarray[0] = 0x3a
    txarray[1] = command
    return @_transSerial(
      txarray.buffer,
      (rxdata) =>
        return unless rxdata.byteLength >= 1
        return 1
    ).then((rxdata) =>
      return (new Uint8Array(rxdata))[0]
    ) # return @_transSerial().then()

  ###*
  @method
    データの送受信を行う
  @param {ArrayBuffer/null} txdata
    送信するデータ(制御バイトは自動的にエスケープされる。nullの場合は受信のみ)
  @param {function(ArrayBuffer,number):number/undefined/Error} [estimator]
    受信完了まで繰り返し呼び出される受信処理関数。
    引数は受信データ全体と、今回の呼び出しで追加されたデータのオフセット。
    省略時は送信のみで完了とする。戻り値の解釈は以下の通り。

    - number : 指定バイト数を受信して受信完了
    - undefined : 追加データを要求
    - Error : エラー発生時のエラー情報
  @return {Promise}
    Promiseオブジェクト
  @return {ArrayBuffer} return.PromiseValue
    受信データ
  ###
  transData: (txdata, estimator) ->
    if txdata
      src = new Uint8Array(txdata)
      dst = new Uint8Array(txdata.byteLength * 2)
      len = 0
      for byte in src
        if byte == 0x3a or byte == 0x3d
          dst[len] = 0x3d # Escape
          len += 1
          byte ^= 0x20
        dst[len] = byte
        len += 1
      txdata = dst.buffer.slice(0, len)
    return @_transSerial(txdata, estimator)

  #----------------------------------------------------------------
  # Private methods
  #

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
    Canarium._log("BaseComm", func, msg, data) if @constructor.verbosity >= lvl
    return

  ###*
  @private
  @method
    シリアル通信の送受信を行う
  @param {ArrayBuffer/null} txdata
    送信するデータ(nullの場合は受信のみ)
  @param {function(ArrayBuffer,number):number/undefined/Error} [estimator]
    受信完了まで繰り返し呼び出される受信処理関数。
    引数は受信データ全体と、今回の呼び出しで追加されたデータのオフセット。
    省略時は送信のみで完了とする。戻り値の解釈は以下の通り。

    - number : 指定バイト数を受信して受信完了
    - undefined : 追加データを要求
    - Error : エラー発生時のエラー情報
  @return {Promise}
    Promiseオブジェクト
  @return {ArrayBuffer} return.PromiseValue
    受信したデータ(指定バイト数分)
  ###
  _transSerial: (txdata, estimator) ->
    return Promise.reject(Error("Not connected")) unless @_connection?
    return Promise.reject(Error("Operation is in progress")) if @_receiver?
    promise = new Promise((resolve, reject) =>
      @_receiver = (rxdata, error) =>
        if rxdata?
          offset = @_rxBuffer?.byteLength or 0
          newArray = new Uint8Array(offset + rxdata.byteLength)
          newArray.set(new Uint8Array(@_rxBuffer)) if @_rxBuffer?
          newArray.set(new Uint8Array(rxdata), offset)
          @_rxBuffer = newArray.buffer
          result = estimator(@_rxBuffer, offset)
        else
          result = error
        if result instanceof Error
          @_rxBuffer = null
          @_receiver = null
          return reject(result)
        if result?
          rxdata = @_rxBuffer.slice(0, result)
          @_rxBuffer = @_rxBuffer.slice(result)
          @_receiver = null
          return resolve(rxdata) # Last PromiseValue if estimator
    ) # promise = new Promise()
    txsize = txdata?.byteLength or 0
    return (x for x in [0...txsize] by SERIAL_TX_MAX_LENGTH).reduce(
      (sequence, pos) =>
        return sequence.then(=>
          data = txdata.slice(pos, pos + SERIAL_TX_MAX_LENGTH)
          size = data.byteLength
          return @_connection.write(data).then(=>
            @_log(1, "_transSerial", "sent", new Uint8Array(data))
          ).then(=>
            return unless SUCCESSIVE_TX_WAIT_MS > 0
            return waitPromise(SUCCESSIVE_TX_WAIT_MS)
          ) # return @_connection.write().then()...
        ) # return sequence.then()
      Promise.resolve()
    ).then(=>
      unless estimator?
        @_receiver = null
        return new ArrayBuffer(0) # Last PromiseValue if !estimator
      @_log(1, "_transSerial", "wait", promise)
      return promise
    ) # return (...).reduce()...

