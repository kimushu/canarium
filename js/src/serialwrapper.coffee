###*
@class Canarium.BaseComm.SerialWrapper
  シリアル通信のラッパ(Chrome/NodeJS両対応用)
@uses chrome.serial
@uses SerialPort
###
class Canarium.BaseComm.SerialWrapper
  null

  #----------------------------------------------------------------
  # Public properties
  #

  ###*
  @property {function():undefined} onClosed
    ポートが閉じられたときに呼び出されるコールバック関数
    (不意の切断とclose()呼び出しのどちらで閉じても呼び出される)
  ###

  ###*
  @property {function(ArrayBuffer):undefined} onReceived
    データを受信したときに呼び出されるコールバック関数
    (もし登録されていない場合、受信したデータは破棄される)
  ###

  #----------------------------------------------------------------
  # Private variables
  #

  nodeModule = require("serialport") if IS_NODEJS

  cidMap = {} if IS_CHROME

  SEND_RETRY_INTERVAL = 50

  ###*
  @private
  @property {number} SEND_RETRY_INTERVAL
    データが送信しきれなかった場合に続きを再送信するまでの待ち時間
    (ms単位、Chromeのみ)
  ###

  #----------------------------------------------------------------
  # Public methods
  #

  ###*
  @static
  @method
    ポートを列挙する
  @return {Promise}
    Promiseオブジェクト
  @return {Object[]} return.PromiseValue
    ポート情報の配列
  @return {string} return.PromiseValue.path
    パス (必ず格納される)
  @return {string} return.PromiseValue.manufacturer
    製造者 (環境によってはundefinedになりうる)
  @return {string} return.PromiseValue.serialNumber
    シリアル番号 (環境によってはundefinedになりうる)
  @return {string} return.PromiseValue.vendorId
    Vendor ID (環境によってはundefinedになりうる)
  @return {string} return.PromiseValue.productId
    Product ID (環境によってはundefinedになりうる)
  ###
  @list: if IS_CHROME then (->
    return new Promise((resolve, reject) =>
      chrome.serial.getDevices((ports) =>
        return resolve({
          path: "#{port.path}"
          manufacturer: "#{port.displayName}"
          serialNumber: undefined
          vendorId: "#{port.vendorId}"
          productId: "#{port.productId}"
        } for port in ports)
      )
    )
  ) else if IS_NODEJS then (->
    return new Promise((resolve, reject) =>
      nodeModule.list((error, ports) =>
        return reject(Error(error)) if error?
        return resolve({
          path: "#{port.comName}"
          manufacturer: "#{port.manufacturer}"
          serialNumber: "#{port.serialNumber}"
          vendorId: "#{port.vendorId}"
          productId: "#{port.productId}"
        } for port in ports when port.pnpId? or port.locationId?)
      )
    )
  )

  ###*
  @method constructor
    コンストラクタ
  @param {string} _path
    接続先ポートのパス
  @param {Object} _options
    接続時のオプション
  @param {number} [_options.baudRate=115200]
    ボーレート
  @param {number} [_options.dataBits=8]
    データのビット幅
  @param {number} [_options.stopBits=1]
    ストップビット幅
  ###
  constructor: (@_path, @_options) ->
    @_options or= {}
    @_options.baudRate or= 115200
    @_options.dataBits or= 8
    @_options.stopBits or= 1
    @onClosed = undefined
    @onReceived = undefined
    @SEND_RETRY_INTERVAL = SEND_RETRY_INTERVAL
    return

  ###*
  @method
    接続する
  @return {Promise}
    Promiseオブジェクト
  @return {undefined} return.PromiseValue
  ###
  open: if IS_CHROME then (->
    return new Promise((resolve, reject) =>
      opts = {
        bitrate: @_options.baudRate
        #dataBits: {7: "seven", 8: "eight"}[@_options.dataBits]
        #stopBits: {1: "one", 2: "two"}[@_options.stopBits]
        receiveTimeout: 500
      }
      chrome.serial.connect(@_path, opts, (connectionInfo) =>
        return reject(Error(chrome.runtime.lastError.message)) unless connectionInfo?
        @_cid = connectionInfo.connectionId
        cidMap[@_cid] = this
        return resolve()
      )
    ) # return new Promise()
  ) else if IS_NODEJS then (->
    return new Promise((resolve, reject) =>
      unless @_sp?
        opts = {
          dataCallback: (data) => @_dataHandler(data)
          disconnectedCallback: => @_closeHandler()
        }
        opts[k] = v for k, v of @_options
        @_sp = new nodeModule.SerialPort(@_path, opts, false, -> return)
      @_sp.open((error) =>
        return reject(Error(error)) if error?
        return resolve()
      )
    ) # return new Promise()
  )

  ###*
  @method
    データの書き込み(送信)
  @param {ArrayBuffer} data
    送信するデータ
  @return {Promise}
    Promiseオブジェクト
  @return {undefined} return.PromiseValue
  ###
  write: if IS_CHROME then ((data) ->
    return new Promise((resolve, reject) =>
      return reject(Error("disconnected")) unless @_cid?
      retry = =>
        return resolve() if data.byteLength == 0
        chrome.serial.send(@_cid, data, (sendInfo) =>
          return reject(Error(sendInfo.error)) if sendInfo.error?
          return resolve() sendInfo.bytesSent >= data.byteLength
          data = data.slice(sendInfo.bytesSent)
          setTimeout(retry, @SEND_RETRY_INTERVAL)
        )
      retry()
    ) # return new Promise()
  ) else if IS_NODEJS then ((data) ->
    return new Promise((resolve, reject) =>
      return reject(Error("disconnected")) unless @_sp?
      @_sp.write(new Buffer(new Uint8Array(data)), (error) =>
        return reject(error) if error?
        return resolve()
      )
    ) # return new Promise()
  )

  ###*
  @method
    接続を一時停止状態にする
  @return {Promise}
    Promiseオブジェクト
  @return {undefined} return.PromiseValue
  ###
  pause: if IS_CHROME then (->
    return new Promise((resolve, reject) =>
      return reject(Error("disconnected")) unless @_cid?
      chrome.serial.setPaused(@_cid, true, =>
        return resolve()
      )
    ) # return new Promise()
  ) else if IS_NODEJS then (->
    return new Promise((resolve, reject) =>
      return reject(Error("disconnected")) unless @_sp?
      @_sp.pause()
      return resolve()
    ) # return new Promise()
  )

  ###*
  @method
    接続の一時停止を解除する
  @return {Promise}
    Promiseオブジェクト
  @return {undefined} return.PromiseValue
  ###
  resume: if IS_CHROME then (->
    return new Promise((resolve, reject) =>
      return reject(Error("disconnected")) unless @_cid?
      chrome.serial.setPaused(@_cid, false, =>
        return resolve()
      )
    ) # return new Promise()
  ) else if IS_NODEJS then (->
    return new Promise((resolve, reject) =>
      return reject(Error("disconnected")) unless @_sp?
      @_sp.resume()
      return resolve()
    ) # return new Promise()
  )

  ###*
  @method
    送受信待ちのバッファを破棄する(送受信データが欠落する可能性がある)
  @return {Promise}
    Promiseオブジェクト
  @return {undefined} return.PromiseValue
  ###
  flush: if IS_CHROME then (->
    return new Promise((resolve, reject) =>
      return reject(Error("disconnected")) unless @_cid?
      chrome.serial.flush(@_cid, (result) =>
        return reject(Error("unknown_error")) unless result
        return resolve()
      )
    ) # return new Promise()
  ) else if IS_NODEJS then (->
    return new Promise((resolve, reject) =>
      return reject(Error("disconnected")) unless @_sp?
      @_sp.flush((error) =>
        return reject(error) if error?
        return resolve()
      )
    ) # return new Promise()
  )

  ###*
  @method
    送受信待ちのバッファを強制的に吐き出す(送受信データは欠落しない)
  @return {Promise}
    Promiseオブジェクト
  @return {undefined} return.PromiseValue
  ###
  drain: if IS_CHROME then (->
    return new Promise((resolve, reject) =>
      return reject(Error("disconnected")) unless @_cid?
      # FIXME: chrome.serialでは、drainに相当するAPIが用意されていない
      return resolve()
    ) # return new Promise()
  ) else if IS_NODEJS then (->
    return new Promise((resolve, reject) =>
      return reject(Error("disconnected")) unless @_sp?
      @_sp.drain((error) =>
        return reject(error) if error?
        return resolve()
      )
    ) # return new Promise()
  )

  ###*
  @method
    切断する
  @return {Promise}
    Promiseオブジェクト
  @return {undefined} return.PromiseValue
  ###
  close: if IS_CHROME then (->
    return new Promise((resolve, reject) =>
      return reject(Error("disconnected")) unless @_cid?
      chrome.serial.disconnect(@_cid, (result) =>
        return reject(Error("unknown_error")) unless result
        delete cidMap[@_cid]
        @_cid = null
        (@onClosed)?()
        return resolve()
      )
    ) # return new Promise()
  ) else if IS_NODEJS then (->
    return new Promise((resolve, reject) =>
      return reject(Error("disconnected")) unless @_sp?
      @_sp.close((error) =>
        return reject(error) if error?
        @_sp.fd = undefined # This is a workaround for incorrect close of fd=0
        @_sp = null
        (@onClosed)?()
        return resolve()
      )
    ) # return new Promise()
  )

  #----------------------------------------------------------------
  # Private methods
  #

  ###*
  @private
  @method
    データ受信ハンドラ(NodeJSのみ)
  @param {Buffer} data
    受信したデータ
  @return {undefined}
  ###
  _dataHandler: if IS_NODEJS then ((data) ->
    (@onReceived)?(new Uint8Array(data).buffer)
    return
  )

  ###*
  @private
  @method
    切断検知ハンドラ(NodeJSのみ)
  @return {undefined}
  ###
  _closeHandler: if IS_NODEJS then (->
    @close().catch(=> return)
    return
  )

  ###*
  @private
  @static
  @method
    データ受信ハンドラ(chromeのみ)
  @param {Object} info
    受信情報
  @param {number} info.connectionId
    受信したコネクションの番号
  @param {ArrayBuffer} info.data
    受信したデータ
  @return {undefined}
  ###
  @_receiveHandler: if IS_CHROME then ((info) ->
    self = cidMap[info.connectionId]
    return unless self?
    (self.onReceived)?(info.data)
    return
  )

  ###*
  @private
  @static
  @method
    エラー受信ハンドラ(chromeのみ)
  @param {Object} info
    受信情報
  @param {number} info.connectionId
    エラーが発生したコネクションの番号
  @param {string} info.error
    発生したエラーの種類
  @return {undefined}
  ###
  @_receiveErrorHandler: if IS_CHROME then ((info) ->
    self = cidMap[info.connectionId]
    return unless self?
    switch info.error
      when "timeout"
        # ignore
        null
      when "disconnected", "device_lost", "break", "frame_error", "system_error"
        # disconnected
        self.close()
    return
  )

  chrome.serial.onReceive.addListener(@_receiveHandler) if IS_CHROME
  chrome.serial.onReceiveError.addListener(@_receiveErrorHandler) if IS_CHROME

