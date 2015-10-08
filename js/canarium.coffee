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

  ###
  @property {Canarium.Channel[]}
    チャネル[0～255]
  @readonly
  ###
  channels: null

  ###*
  @property {Canarium.I2CComm}
    I2C通信制御クラスのインスタンス
  @readonly
  ###
  i2c: null

  ###*
  @property {Canarium.AvsPackets}
    Avalon-STパケット層通信クラスのインスタンス
  @readonly
  ###
  avs: null

  ###*
  @property {Canarium.AvmTransactions}
    Avalon-MMトランザクション層通信クラスのインスタンス
  @readonly
  ###
  avm: null

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

  ###*
  @private
  @property {number}
    コンフィグレーション開始のタイムアウト時間(ms)
  @readonly
  ###
  CONFIG_TIMEOUT_MS = 3000

  ###*
  @private
  @property {number}
    Avalon Packets to Transactions Converterのチャネル番号
  @readonly
  ###
  PACKET2TRANS_CHANNEL = 0

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
    @avs = new Canarium.AvsPackets(@_base)
    @avm = new Canarium.AvmTransactions(@avs, PACKET2TRANS_CHANNEL)

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
            @_log("connect", "info:version=#{header[3].hex(2)}") if DEBUG >= 1
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
    return callback(false) unless @_base.connected
    startTime = null
    seq = new Function.Sequence()
    if boardInfo
      unless @boardInfo.id and @boardInfo.serialcode
        # まだボード情報が読み込まれていないので先に読み込む
        seq.add(=>
          @getinfo((result) -> seq.next(result))
        )
      # コンフィグレーション可否の判断を行う
      seq.add(=>
        mismatch = (a, b) -> a and a != b
        return seq.abort() if mismatch(boardInfo.id, @boardInfo.id)
        return seq.abort() if mismatch(boardInfo.serialcode, @boardInfo.serialcode)
        seq.next()
      )
    seq.add(=>
      # モードチェック
      @_base.transCommand(
        0x3b  # 即時応答ON
        (result, response) ->
          return seq.abort() unless result
          return seq.next() if (response & 0x01) == 0x00  # PSモード
          # ASモード
          seq.abort()
      )
    )
    seq.add(->
      startTime = window.performance.now()
      seq.next()
    )
    seq.add(=>
      # コンフィグレーション開始リクエスト発行(モード切替)
      @_base.transCommand(
        0x32  # コンフィグモード, nCONFIGアサート, 即時応答ON
        (result, response) ->
          return seq.abort() unless result
          return seq.next() if (response & 0x06) == 0x00  # nSTATUS=L, CONF_DONE=L
          dulation = parseInt(window.performance.now() - startTime)
          return seq.abort() if dulation > CONFIG_TIMEOUT_MS
          seq.redo()
      )
    )
    seq.add(=>
      # FPGAの応答待ち
      @_base.transCommand(
        0x33  # コンフィグモード, nCONFIGネゲート, 即時応答ON
        (result, response) ->
          return seq.abort() unless result
          return seq.next() if (response & 0x06) == 0x02  # nSTATUS=H, CONF_DONE=L
          dulation = parseInt(window.performance.now() - startTime)
          return seq.abort() if dulation > CONFIG_TIMEOUT_MS
          seq.redo()
      )
    )
    seq.add(=>
      # コンフィグレーションデータ送信
      @_base.transData(rbfdata, 0, (result) -> seq.next(result))
    )
    seq.add(=>
      # コンフィグレーション完了チェック
      @_base.transCommand(
        0x33  # コンフィグモード, 即時応答ON
        (result, response) ->
          return seq.abort() unless result
          return seq.next() if (response & 0x06) == 0x06  # nSTATUS=H, CONF_DONE=H
          seq.abort()
      )
    )
    seq.add(=>
      # コンフィグレーション完了(モード切替)
      @_base.transCommand(
        0x39  # ユーザーモード
        (result, response) -> seq.next(result)
      )
    )
    seq.final(->
      callback(seq.finished)
    ).start()
    return

  ###*
  @method
    ボードのマニュアルリセット
  @param {function(boolean):void} callback
    コールバック関数
  @return {void}
  ###
  reset: (callback) ->
    unless @_base.connected
      return callback(false)
    new Function.Sequence(
      (seq) =>
        @_base.transCommand(
          0x31  # コンフィグモード(リセットアサート)
          (result, response) ->
            return seq.abort() unless result
            window.setTimeout((-> seq.next()), 100)
        )
      (seq) =>
        @_base.transCommand(
          0x39  # ユーザモード(リセットネゲート)
          (result, response) ->
            return seq.abort() unless result
            # @_base.sendImmediate = false
            seq.next()
        )
    ).final(
      (seq) ->
        callback(seq.finished)
    ).start()
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
            @_log("getinfo", "info:(ver1)#{info.hexDump()}") if DEBUG >= 2
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
            @_log("getinfo", "info:(ver2)#{info.hexDump()}") if DEBUG >= 2
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
        @_log("getinfo", "error:unknown version")
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

  #----------------------------------------------------------------
  # Private methods
  #

  ###*
  @private
  @static
  @method
    ログの出力(全クラス共通)
  @param {string} cls
    クラス名
  @param {string} func
    関数名
  @param {string} msg
    メッセージ
  @param {Object} [data]
    任意のデータ
  @return {void}
  ###
  @_log: (cls, func, msg, data) ->
    return if SUPPRESS_LOGS? and SUPPRESS_LOGS
    out = {"#{cls}##{func}": msg, stack: new Error().stack.split("\n    ").slice(1)}
    out.data = data if data
    console.log(out)
    return

  ###*
  @private
  @method
    ログの出力
  @param {string} func
    関数名
  @param {string} msg
    メッセージ
  @param {Object} [data]
    任意のデータ
  @return {void}
  ###
  _log: (func, msg, data) ->
    Canarium._log("Canarium", func, msg, data)
    return

