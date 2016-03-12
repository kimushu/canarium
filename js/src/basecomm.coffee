###*
@class Canarium.BaseComm
  PERIDOTボード下位層通信クラス
@uses chrome.serial
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
    get: -> @_connected

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
  @property {boolean} _connected
  @inheritdoc #connected
  ###

  ###*
  @private
  @property {string} _path
  @inheritdoc #path
  ###

  ###*
  @private
  @property {number} _bitrate
  @inheritdoc #bitrate
  ###

  ###*
  @private
  @property {number} _cid
    シリアル接続ID
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
  @property {Function} _onReceive
    受信コールバック関数(thisバインド付きの関数オブジェクト)
  ###

  ###*
  @private
  @property {Function} _onReceiveError
    受信エラーコールバック関数(thisバインド付きの関数オブジェクト)
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
    getName = (port) ->
      name = port.displayName
      path = port.path
      return "#{name} (#{path})" if name
      return "#{path}"
    return new Promise((resolve) =>
      chrome.serial.getDevices((ports) ->
        devices = []
        devices.push({
          path: "#{port.path}",
          name: getName(port)
        }) for port in ports
        resolve(devices)
      )
    ) # return new Promise()

  ###*
  @method constructor
    コンストラクタ
  ###
  constructor: ->
    @_connected = false
    @_path = null
    @_bitrate = 115200
    @_sendImmediate = false
    @_configured = false
    @_cid = null
    @_onReceive = (info) => @_onReceiveHandler(info)
    @_onReceiveError = (info) => @_onReceiveErrorHandler(info)
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
    return Promise.reject(Error("Already connected")) if @_connected
    @_connected = true
    @_path = null
    return new Promise((resolve, reject) =>
      chrome.serial.connect(
        path,
        {bitrate: @_bitrate},
        (connectionInfo) =>
          ###
          Windows: 接続失敗時はundefinedでcallbackが呼ばれる @ chrome47
          ###
          return reject(Error(chrome.runtime.lastError)) unless connectionInfo

          @_path = "#{path}"
          @_sendImmediate = false
          @_configured = false
          @_cid = connectionInfo.connectionId
          @_rxBuffer = null
          @_receiver = null
          chrome.serial.onReceive.addListener(@_onReceive)
          chrome.serial.onReceiveError.addListener(@_onReceiveError)
          return resolve()
      )
    ).catch((error) =>
      @_connected = false
      return Promise.reject(error)
    )

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
    return Promise.reject(Error("Not connected")) unless @_connected
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
    return Promise.reject(Error("Not connected")) unless @_connected
    return new Promise((resolve, reject) =>
      chrome.serial.disconnect(@_cid, (result) =>
        return reject(Error(chrome.runtime.lastError)) unless result
        chrome.serial.onReceive.removeListener(@_onReceive)
        chrome.serial.onReceiveError.removeListener(@_onReceiveError)
        @_connected = false
        @_path = null
        @_cid = null
        return resolve()
      )
    )

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
    return Promise.reject(Error("Not connected")) unless @_connected
    return Promise.reject(Error("Operation is in progress")) if @_receiver
    promise = new Promise((resolve, reject) =>
      @_receiver = (rxdata, error) =>
        if rxdata?
          offset = @_rxBuffer?.byteLength or 0
          newArray = new Uint8Array(offset + rxdata.byteLength)
          newArray.set(new Uint8Array(@_rxBuffer)) if @_rxBuffer
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
          return new Promise((resolve, reject) =>
            data = txdata.slice(pos, pos + SERIAL_TX_MAX_LENGTH)
            size = data.byteLength
            chrome.serial.send(@_cid, data, (writeInfo) =>
              e = writeInfo.error
              return reject(Error("Serial error: #{e}")) if e?
              b = writeInfo.bytesSent
              return reject(Error("bytesSent(#{b}) != bytesRequested(#{size})")) if b != size
              @_log(1, "_transSerial", "sent", new Uint8Array(data))
              return resolve() unless SUCCESSIVE_TX_WAIT_MS > 0
              window.setTimeout(resolve, SUCCESSIVE_TX_WAIT_MS)
            ) # chrome.serial.send()
          ) # return new Promise()
        ) # return sequence.then()
      Promise.resolve()
    ).then(=>
      unless estimator
        @_receiver = null
        return new ArrayBuffer(0) # Last PromiseValue if !estimator
      @_log(1, "_transSerial", "wait", promise)
      return promise
    ) # return (...).reduce()...

  ###*
  @private
  @method
    シリアル受信時のデータ格納と処理予約を行う
  @param {Object} info
    受信情報
  @param {number} info.connectionId
    接続ID
  @param {ArrayBuffer} info.data
    受信データ
  @return {undefined}
  ###
  _onReceiveHandler: (info) ->
    return unless info.connectionId == @_cid and @_connected
    Promise.resolve(
    ).then(=>
      if @_receiver
        @_receiver(info.data)
      else
        @_log(1, "_onReceiveHandler", "dropped", new Uint8Array(info.data))
      return
    )
    return

  ###*
  @private
  @method
    受信エラーハンドラ
  @param {Object} info
    エラー情報
  @param {number} info.connectionId
    接続ID
  @param {"disconnected"/"timeout"/"device_lost"/"break"/
          "frame_error"/"overrun"/"buffer_overflow"/
          "parity_error"/"system_error"} info.error
    エラー種別を示す文字列
  @return {undefined}
  ###
  _onReceiveErrorHandler: (info) ->
    return unless info.connectionId == @_cid and @_connected
    Promise.resolve(
    ).then(=>
      # シリアル通信レベルでの通信エラーは、原則として復旧不可。
      # また、ケーブル切断によるエラーの場合、ドライバを切断しておかないと
      # Windowsでは次回接続時に支障がでるため自動的にdisconnectする。
      @disconnect()
      error = "Serial error: #{info.error}"
      if @_receiver
        @_receiver(null, Error(error))
      else
        @_log(1, "_onReceiveErrorHandler", "dropped", error)
    )
    return

