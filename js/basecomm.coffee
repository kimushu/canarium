###*
@class Canarium.BaseComm
PERIDOTボード下位層通信クラス
@uses chrome.serial
###
class Canarium.BaseComm
  DEBUG = DEBUG? or 0

  #----------------------------------------------------------------
  # Public properties
  #

  ###*
  @property {boolean}
    接続状態(true:接続済み, false:未接続)
  ###
  connected: false

  ###*
  @property {string}
    接続しているシリアル通信デバイスのパス
  ###
  path: null

  ###*
  @property {number}
    ビットレート(bps)
  ###
  bitrate: 115200

  #----------------------------------------------------------------
  # Private properties
  #

  ###*
  @private
  @property {number}
    シリアル接続ID
  ###
  _cid: null

  ###*
  @private
  @property {Function}
    受信コールバック関数(thisバインド付きの関数オブジェクト)
  ###
  _onReceive: null

  ###*
  @private
  @property {Function}
    受信エラーコールバック関数(thisバインド付きの関数オブジェクト)
  ###
  _onReceiveError: null

  ###*
  @private
  @property {Object[]}
    受信待ちキュー
  ###
  _rxQueue: null

  ###*
  @private
  @property {ArrayBuffer[]}
    受信データバッファの配列
  ###
  _rxBuffers: null

  ###*
  @private
  @property {number}
    受信データの合計サイズ
  ###
  _rxTotalLength: null

  ###*
  @private
  @property {number}
    1回のシリアル送信の最大バイト数
  @readonly
  ###
  SERIAL_TX_MAX_LENGTH = 1024

  ###*
  @private
  @property {number}
    連続シリアル送信の間隔(ミリ秒)
  @readonly
  ###
  SUCCESSIVE_TX_WAIT_MS = 4

  ###*
  @private
  @property {boolean}
    chrome.serialのイベントハンドラのコンテキストから分離するか否か(デバッグ用)
  @readonly
  ###
  SPLIT_EVENT_CONTEXT = false

  #----------------------------------------------------------------
  # Public methods
  #

  ###*
  @static
  @method
    接続対象デバイスを列挙する
    (PERIDOTでないデバイスも列挙される可能性があることに注意)
  @param {function(boolean,Object[]):void}  callback
    コールバック関数(配列の各要素は次のメンバを持つ)

    - name : UI向け名称(COMxxなど)
    - path : 内部管理向けパス
  @return {void}
  ###
  @enumerate: (callback) ->
    chrome.serial.getDevices((ports) ->
      devices = []
      devices.push({
        path: "#{port.path}",
        name: "#{port.displayName or port.path}"
      }) for port in ports
      callback(true, devices)
    )
    return

  ###*
  @method
    コンストラクタ
  ###
  constructor: ->
    @_onReceive = (info) => @_onReceiveHandler(info)
    @_onReceiveError = (info) => @_onReceiveErrorHandler(info)

  ###*
  @method
    ボードに接続する
  @param {string} path
    接続先パス(enumerateが返すpath)
  @param {function(boolean):void} callback
    コールバック関数
  @return {void}
  ###
  connect: (path, callback) ->
    if @connected
      callback(false)
      return
    @connected = true
    @path = null
    chrome.serial.connect(
      path,
      {bitrate: @bitrate},
      (connectionInfo) =>
        ###
        Windows: 接続失敗時はundefinedでcallbackが呼ばれる @ chrome47
        ###
        unless connectionInfo
          chrome.runtime.lastError  # エラー読み捨て
          @connected = false
          return callback(false)
        @path = "#{path}"
        @_cid = connectionInfo.connectionId
        @_rxQueue = []
        @_rxBuffers = []
        @_rxTotalLength = 0
        chrome.serial.onReceive.addListener(@_onReceive)
        chrome.serial.onReceiveError.addListener(@_onReceiveError)
        callback(true)
    )
    return

  ###*
  @method
    ボードから切断する
  @param {function(boolean):void} callback
    コールバック関数
  @return {void}
  ###
  disconnect: (callback) ->
    unless @connected
      callback(false)
      return
    chrome.serial.disconnect(@_cid, (result) =>
      return callback(false) unless result
      chrome.serial.onReceive.removeListener(@_onReceive)
      chrome.serial.onReceiveError.removeListener(@_onReceiveError)
      @connected = false
      @path = null
      @_cid = null
      @_rxQueue = null
      @_rxBuffers = null
      @_rxTotalLength = null
      callback(true)
    )
    return

  ###*
  @method
    制御コマンドの送受信を行う
  @param {number} command
    コマンドバイト
  @param {function(boolean,number):void}  callback
    コールバック関数
  @return {void}
  ###
  transCommand: (command, callback) ->
    txarray = new Uint8Array(2)
    txarray[0] = 0x3a
    txarray[1] = command
    @_transSerial(
      txarray.buffer,
      1,
      (result, rxdata) ->
        return callback(false, null) unless result
        rxArray = new Uint8Array(rxdata)
        callback(true, rxArray[0])
    )
    return

  ###*
  @method
    データの送受信を行う
  @param {ArrayBuffer/null} txdata
    送信するデータ(制御バイトは自動的にエスケープされる。nullの場合は受信のみ)
  @param {number} rxsize
    受信するバイト数
  @param {function(boolean,ArrayBuffer):void} callback
    コールバック関数
  @return {void}
  ###
  transData: (txdata, rxsize, callback) ->
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
    @_transSerial(txdata, rxsize, callback)
    return

  #----------------------------------------------------------------
  # Private methods
  #

  ###*
  @private
  @method
    シリアル通信の送受信を行う
  @param {ArrayBuffer/null} txdata
    送信するデータ(nullの場合は受信のみ)
  @param {number} rxsize
    受信するバイト数
  @param {function(boolean,ArrayBuffer):void} callback
    コールバック関数
  @return {void}
  ###
  _transSerial: (txdata, rxsize, callback) ->
    unless @connected
      callback(false, null)
      return
    @_rxQueue.push({length: rxsize, callback: callback}) if rxsize > 0
    pos = 0
    remainder = txdata?.byteLength or 0
    new Function.Sequence(
      (seq) =>
        return seq.next() if remainder == 0
        len = Math.min(remainder, SERIAL_TX_MAX_LENGTH)
        partialData = txdata.slice(pos, pos + len)
        console.log({"BaseComm::(send@#{pos})": new Uint8Array(partialData).hexDump()}) if DEBUG >= 1
        chrome.serial.send(@_cid, partialData, (writeInfo) =>
          return seq.abort() unless writeInfo.bytesSent == len
          pos += len
          remainder -= len
          return seq.next() if remainder == 0
          window.setTimeout((-> seq.redo()), SUCCESSIVE_TX_WAIT_MS)
        )
    ).final(
      (seq) =>
        callback(seq.finished) if rxsize == 0
    ).start()
    return

  ###*
  @private
  @method
    シリアル受信時の処理を行う
  @param {Object} info
    受信情報
  @param {number} info.connectionId
    接続ID
  @param {ArrayBuffer} info.data
    受信データ
  @return {void}
  ###
  _onReceiveHandler: (info) ->
    return unless info.connectionId == @_cid and @connected
    @_addRxBuffer(info.data)
    if SPLIT_EVENT_CONTEXT
      window.setTimeout((=> @_onReceiveHandler2()), 0)
    else
      @_onReceiveHandler2()
    return

  _onReceiveHandler2: ->
    while @_rxQueue.length > 0
      length = @_rxQueue[0].length
      break if length > @_rxTotalLength
      queue = @_rxQueue.shift()
      buffer = @_sliceRxBuffer(length)
      console.log({"BaseComm::(recv)": new Uint8Array(buffer).hexDump()}) if DEBUG >= 1
      queue.callback.call(undefined, true, buffer)
    return

  ###*
  @private
  @method
    受信データバッファの末尾にデータを追加する
  @param {ArrayBuffer} data
    受信データ
  @return {void}
  ###
  _addRxBuffer: (data) ->
    @_rxBuffers.push(data.slice(0))
    @_rxTotalLength += data.byteLength
    return

  ###*
  @private
  @method
    受信データバッファの先頭からデータを取り出す
  @param {number} length
    取り出すバイト数
  @return {ArrayBuffer/null}
    取り出したデータ(バッファ不足時はnull)
  ###
  _sliceRxBuffer: (length) ->
    return null if length > @_rxTotalLength
    array = new Uint8Array(length)
    pos = 0
    rem = length
    while rem > 0
      partBuf = @_rxBuffers[0]
      partLen = partBuf.byteLength
      if partLen <= rem
        @_rxBuffers.shift()
      else
        array = new Uint8Array(partLen - rem)
        array.set(new Uint8Array(partBuf, rem))
        @_rxBuffers[0] = array.buffer
        partLen = rem
      array.set(new Uint8Array(partBuf, 0, partLen), pos)
      pos += partLen
      rem -= partLen
    @_rxTotalLength -= length
    return array.buffer

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
  @return {void}
  ###
  _onReceiveErrorHandler: (info) ->
    return unless info.connectionId == @_cid and @connected
    if SPLIT_EVENT_CONTEXT
      window.setTimeout((=> @_onReceiveErrorHandler2()), 0)
    else
      @_onReceiveErrorHandler2()
    return

  _onReceiveErrorHandler2: ->
    # シリアル通信レベルでの通信エラーは、原則として復旧不可。
    # また、ケーブル切断によるエラーの場合、ドライバを切断しておかないと
    # Windowsでは次回接続時に支障がでるため自動的にdisconnectする。
    @disconnect(-> return)
    # キューされた受信待ちキューをすべてエラー終了とする
    @_rxBuffers = []
    @_rxTotalLength = 0
    while queue = @_rxQueue.shift()
      queue.callback.call(undefined, false, null)
    return

