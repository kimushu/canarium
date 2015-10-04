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
    EEPROMのスレーブアドレス(7-bit)
  @readonly
  ###
  EEPROM_SLAVE_ADDR = 0x50

  #----------------------------------------------------------------
  # Public methods
  #

  ###*
  @static
  @method
  @inheritdoc Canarium.BaseComm#enumerate
  @localdoc {@link Canarium.BaseComm#enumerate}に転送されます
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
    @boardInfo = null

    new Function.Sequence(
      (seq) =>
        @_base.connect(portname, (result) -> seq.next(result))
      (seq) =>
        @_eepromread(0x00, 4, (result, buffer) =>
          return seq.abort() unless result
          header = new Uint8Array(buffer)
          if header[0] == 0x4a and header[1] == 0x37 and header[2] == 0x57
            @boardInfo = {version: header[3]}
            seq.next()
          seq.abort()
        )
    ).final(
      (seq) ->
        callback(seq.finished)
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
    if not @connected or @getinfoBarrier
      callback(false)
      return

    return

  ###*
  @method
    AvalonSTパケットの送受信
  @param {Number} channel
    チャネル番号(CPLDv1.1時点では0固定)
  @param {ArrayBuffer}  writedata
    書き込みデータ
  @param {Object} options
    パケット送信オプション
  @param {function(boolean,ArrayBuffer):void} callback
    コールバック関数
  @return {void}
  @private
  ###
  _transpacket: (channel, writedata, options, callback) ->
    # パケット送信予約
    @_packetsend(
      channel,
      writedata,
      (result) -> callback(false, null) unless result
    )
    # パケット受信予約
    @_packetrecv(
      channel,
      callback
    )
    return

  ###*
  @method
    AvalonSTパケットの送信
  ###
  _packetsend: (channel, data, callback) ->

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
  _eepromread: (startaddr, readbytes, callback) ->
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
        seq.next() if readbytes == 0
        @i2c.read(readbytes > 1, (result, readdata) =>
          seq.abort() unless result
          array[index += 1] = readdata
          readbytes -= 1
          seq.redo()
        )
      (seq) =>  # Stop condition
        @i2c.stop((result) => seq.next(result))
    ).final(
      (seq) ->
        return callback(false, null) if seq.aborted
        callback(true, array.buffer)
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

