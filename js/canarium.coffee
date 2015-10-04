###*
@class Canarium
PERIDOTボードドライバ
###
class Canarium
  DEBUG = DEBUG? or 0

  #----------------------------------------------------------------
  # Public properties
  #

  ###*
  @property {string}
    ライブラリのバージョン
  ###
  version: "0.9.9"

  ###*
  @property {Object}  boardInfo
    接続しているボードの情報

  @property {string}  boardInfo.id
    'J72A' (J-7SYSTEM Works / PERIDOT board)

  @property {string}  boardInfo.serialcode
    'xxxxxx-yyyyyy-zzzzzz'
  ###
  boardInfo: null

  ###*
  @property {number} serialBitrate
    デフォルトのビットレート({@link Canarium.BaseComm#bitrate}のアクセサとして定義)
  ###
  @property "serialBitrate",
    get: -> @_base.bitrate
    set: (v) -> @_base.bitrate = v

  ###*
  @property {Canarium.Channel[]}
    チャネル[0～255]
  @readonly
  ###
  channels: null

  ###*
  @property {Object}
    AvalonMMアクセス制御クラスのインスタンス
  @readonly
  ###
  avm: null

  ###*
  @property {Canarium.I2CComm}
    I2C通信制御クラスのインスタンス
  @readonly
  ###
  i2c: null

  #----------------------------------------------------------------
  # Private properties
  #

  ###*
  @private
  @property {Canarium.BaseComm}
    下位層通信クラスのインスタンス
  ###
  _base: null

  ###*
  @private
  @property {number}
    EEPROMのスレーブアドレス(7-bit表記)
  @readonly
  ###
  EEPROM_SLAVE_ADDR = 0b1010000

  #----------------------------------------------------------------
  # Public methods
  #

  ###*
  @static
  @method
  @inheritdoc Canarium.BaseComm#enumerate
  @localdoc
    {@link Canarium.BaseComm#enumerate}に転送されます
  ###
  @enumerate: (args...) ->
    Canarium.BaseComm.enumerate(args...)

  ###*
  @method
    コンストラクタ
  ###
  constructor: ->
    @_base = new Canarium.BaseComm()
    @i2c = new Canarium.I2CComm(@_base)

  ###*
  @inheritdoc Canarium.BaseComm#connect
  ###
  open: (portname, callback) ->
    if @_base.connected
      callback(false)
      return
    @boardInfo = null
    new Function.Sequence(
      (seq) =>
        @_base.connect(portname, (result) -> seq.next(result))
      (seq) =>
        @_eepromRead(0x00, 4, (result, readData) =>
          return seq.abort() unless result
          header = new Uint8Array(readData)
          if header[0] == 0x4a and header[1] == 0x37 and header[2] == 0x57
            console.log("Canarium#connect::version(#{header[3]})") if DEBUG >= 1
            @boardInfo = {version: header[3]}
            seq.next()
          seq.abort()
        )
    ).final(
      (seq) =>
        return @_base.disconnect(-> callback(false)) if seq.aborted
        callback(true)
    ).start()
    return

  ###*
  @method
    PERIDOTデバイスポートのクローズ
  @param {function(boolean):void} callback
    コールバック関数
  @return {void}
  ###
  close: (callback) ->
    unless @_base.connected
      callback(false)
      return
    @_base.disconnect((result) =>
      @boardInfo = null
      callback(result)
    )
    return

  ###*
  @method
    ボードのFPGAコンフィグレーション
  @param {Object/null}  boardInfo
    ボード情報(ボードIDやシリアル番号を限定したい場合)
  @param {string/null}  boardInfo.id
    ボードID
  @param {string/null}  boardInfo.serialCode
    シリアル番号
  @param {ArrayBuffer}  rbfdata
    rbfまたはrpdのデータ
  @param {function(boolean):void} callback
    コールバック関数
  @return {void}
  ###
  config: (boardInfo, rbfdata, callback) ->
    return

  ###*
  @method
    ボードのマニュアルリセット
  @param {function(boolean):void} callback
    コールバック関数
  @return {void}
  ###
  reset: (callback) ->
    return

  ###*
  @method
    ボード情報の取得
  @param {function(boolean):void} callback
    コールバック関数
  @return {void}
  ###
  getinfo: (callback) ->
    unless @_base.connected and @boardInfo?.version
      console.log(@_base)
      console.log(@boardInfo)
      callback(false)
      return
    seq = new Function.Sequence()
    switch @boardInfo.version
      when 1
        # ver.1 ヘッダ
        seq.add((seq) =>
          @_eepromRead(0x04, 8, (result, readData) =>
            return seq.abort() unless result
            info = new Uint8Array(readData)
            console.log("getinfo::ver1::read(#{info.hexDump()})") if DEBUG >= 2
            mid = (info[0] << 8) | (info[1] << 0)
            pid = (info[2] << 8) | (info[3] << 0)
            sid = (info[4] << 24) | (info[5] << 16) | (info[6] << 8) | (info[7] << 0)
            if mid == 0x0072
              s = "#{pid.hex(4)}#{sid.hex(8)}"
              @boardInfo.id = "J72A"
              @boardInfo.serialcode = "#{s.substr(0, 6)}-#{s.substr(6, 6)}-000000"
            seq.next()
          )
        )
      when 2
        # ver.2 ヘッダ
        seq.add((seq) =>
          @_eepromRead(0x04, 22, (result, readData) =>
            return seq.abort() unless result
            info = new Uint8Array(readData)
            console.log("getinfo::ver2::read(#{info.hexDump()})") if DEBUG >= 2
            bid = ""
            (bid += String.fromCharCode(info[i])) for i in [0...4]
            s = ""
            (s += String.fromCharCode(info[i])) for i in [4...22]
            @boardInfo.id = bid
            @boardInfo.serialcode = "#{s.substr(0, 6)}-#{s.substr(6, 6)}-#{s.substr(12, 6)}"
            seq.next()
          )
        )
      else
        # 未知のヘッダバージョン
        console.log("getinfo::unknown_version") if DEBUG >= 1
        callback(false)
        return
    seq.final((seq) ->
      callback(seq.finished)
    ).start()
    return

  ###*
  @private
  @method
    EEPROMの読み出し
  @param {number} startaddr
    読み出し開始アドレス
  @param {number} readbytes
    読み出しバイト数
  @param {function(boolean,ArrayBuffer)} callback
    コールバック関数
  ###
  _eepromRead: (startaddr, readbytes, callback) ->
    array = new Uint8Array(readbytes)
    index = -1
    new Function.Sequence(
      (seq) =>  # Start condition
        @i2c.start((result) => seq.next(result))
      (seq) =>  # Send slave address and direction (write)
        @i2c.write((EEPROM_SLAVE_ADDR << 1), (result, ack) =>
          seq.next(result and ack)
        )
      (seq) =>  # Send EEPROM address
        @i2c.write((startaddr & 0xff), (result, ack) =>
          seq.next(result and ack)
        )
      (seq) =>  # Repeat start condition
        @i2c.start((result) => seq.next(result))
      (seq) =>  # Send slave address and direction (read)
        @i2c.write((EEPROM_SLAVE_ADDR << 1) + 1, (result, ack) =>
          seq.next(result and ack)
        )
      (seq) =>  # Read bytes
        return seq.next() if readbytes == 0
        @i2c.read(readbytes > 1, (result, readdata) =>
          return seq.abort() unless result
          array[index += 1] = readdata
          readbytes -= 1
          seq.redo()
        )
    ).final(
      (seq) =>  # Stop condition
        @i2c.stop((result) ->
          return callback(false, null) if seq.aborted or not result
          callback(true, array.buffer)
        )
    ).start()

  ###*
  @class Canarium.AvsPacket
  Avalon-STパケットクラス
  ###
  class AvsPacket
    ###*
    ###

  ###*
  @class Canarium.Channel
  仮想通信ポート(チャネル)クラス
  ###
  class Channel
    ###*
    @property {Canarium}
      オーナーのCanariumクラスインスタンス
    @readonly
    @private
    ###
    _canarium: null

    ###*
    @property {Number}
      チャネル番号(0～255)
    @readonly
    ###
    index: null

    ###*
    @method
      コンストラクタ
    @param {Canarium} canarium
      オーナーのCanariumクラスインスタンス
    @param {Number}   index
      チャネル番号(0～255)
    @private
    ###
    constructor: (@_canarium, @index) ->

    ###*
    @method
      非同期データ送信要求をキューに入れます。
      複数の送信要求をキューに入れることができます。送信順序はキューに入れた順です。
    @param {Number[]/ArrayBuffer/String}  senddata
      送信するデータ
    @param {Function}     successCallback
      送信成功時のコールバック
    @param {Number/null}  [timeout]
      タイムアウト時間[ms] (省略時 or nullは無限待ち)
    @param {Function}     [errorCallback]
      エラー発生時のコールバック
    @return {boolean} true:キュー追加成功(送信成功とは異なる)、false:失敗
    ###
    send: (senddata, successCallback, timeout, errorCallback) ->
      null

    ###*
    @method
      データ受信イベントを登録します。一度受信するか失敗が確定すると解除されます。
      複数の受信待ちを同時に登録することはできません。
    @param {"arraybuffer"/"string"} readtype
      受信したデータを受け取る際のデータ型
    @param {Function}     successCallback
      受信成功時のコールバック (function(readdata))
    @param {Number/null}  [timeout]
      タイムアウト時間[ms] (省略時 or nullは無限待ち)
    @param {Function}     [errorCallback]
      エラー発生時のコールバック
    @return {boolean} true:登録成功(受信成功とは異なる)、false:失敗
    ###
    recv: (readtype, successCallback, timeout, errorCallback) ->
      null

  #----------------------------------------------------------------
  # Private methods
  #

  ###*
  @method
    開発者向けのエラーログを出力する
  @param {Object} data
    出力メッセージ等のデータ(型は自由)
  @return {void}
  @private
  ###
  _err: (data) ->
    console.log({
      "error": data,
      "stack": new Error().stack,
      "canarium": this
    })
    return

