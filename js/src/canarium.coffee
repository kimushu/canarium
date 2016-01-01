###*
@class Canarium
  PERIDOTボードドライバ
###
class Canarium
  null

  #----------------------------------------------------------------
  # Public properties
  #

  ###*
  @property {string} version
    ライブラリのバージョン
  ###
  @property "version",
    value: "0.9.7"

  ###*
  @property {Object}  boardInfo
    接続しているボードの情報

  @property {string}  boardInfo.id
    'J72A' (J-7SYSTEM Works / PERIDOT board)

  @property {string}  boardInfo.serialcode
    'xxxxxx-yyyyyy-zzzzzz'
  ###
  @property "boardInfo",
    get: -> @_boardInfo

  ###*
  @property {number} serialBitrate
    デフォルトのビットレート({@link Canarium.BaseComm#bitrate}のアクセサとして定義)
  ###
  @property "serialBitrate",
    get: -> @_base.bitrate
    set: (v) -> @_base.bitrate = v

  ###
  @property {Canarium.Channel[]} channels
    チャネル[0～255]
  @readonly
  ###
  @property "channels",
    get: -> @_channels

  ###*
  @property {Canarium.I2CComm} i2c
    I2C通信制御クラスのインスタンス
  @readonly
  ###
  @property "i2c",
    get: -> @_i2c

  ###*
  @property {Canarium.AvsPackets} avs
    Avalon-STパケット層通信クラスのインスタンス
  @readonly
  ###
  @property "avs",
    get: -> @_avs

  ###*
  @property {Canarium.AvmTransactions} avm
    Avalon-MMトランザクション層通信クラスのインスタンス
  @readonly
  ###
  @property "avm",
    get: -> @_avm

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
  @property {Canarium.BaseComm} _base
    下位層通信クラスのインスタンス
  ###

  ###*
  @private
  @property {boolean} _configBarrier
    コンフィグレーション中を示すフラグ(再帰実行禁止用)
  ###

  ###*
  @private
  @property {boolean} _resetBarrier
    リセット中を示すフラグ(再帰実行禁止用)
  ###

  ###*
  @private
  @static
  @cfg {number}
    EEPROMのスレーブアドレス(7-bit表記)
  @readonly
  ###
  EEPROM_SLAVE_ADDR = 0b1010000

  ###*
  @private
  @static
  @cfg {number}
    EEPROMの最大バーストリード長(バイト数)
  @readonly
  ###
  SPLIT_EEPROM_BURST = 6

  ###*
  @private
  @static
  @cfg {number}
    コンフィグレーション開始のタイムアウト時間(ms)
  @readonly
  ###
  CONFIG_TIMEOUT_MS = 3000

  ###*
  @private
  @static
  @cfg {number}
    Avalon-MM 通信レイヤのチャネル番号
  @readonly
  ###
  AVM_CHANNEL = 0

  #----------------------------------------------------------------
  # Public methods
  #

  ###*
  @static
  @method
    接続対象デバイスを列挙する
    (PERIDOTでないデバイスも列挙される可能性があることに注意)
  @param {function(boolean,Object[]/Error)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト
  @return {Object[]} return.PromiseValue
    デバイスの配列(各要素は次のメンバを持つ)

    - name : UI向け名称(COMxxなど)
    - path : 内部管理向けパス
  ###
  @enumerate: (callback) ->
    return invokeCallback(callback, @enumerate()) if callback?
    return Canarium.BaseComm.enumerate()

  ###*
  @method constructor
    コンストラクタ
  ###
  constructor: ->
    @_boardInfo = null
    @_channels = null
    @_base = new Canarium.BaseComm()
    @_i2c = new Canarium.I2CComm(@_base)
    @_avs = new Canarium.AvsPackets(@_base)
    @_avm = new Canarium.AvmTransactions(@_avs, AVM_CHANNEL)
    @_configBarrier = false
    @_resetBarrier = false
    return

  ###*
  @method
    ボードに接続する
  @param {string} path
    接続先パス(enumerateが返すpath)
  @param {function(boolean,Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト(callback省略時)
  ###
  open: (portname, callback) ->
    return invokeCallback(callback, @open(portname)) if callback?
    return Promise.resolve(
    ).then(=>
      return @_base.connect(portname)
    ).then(=>
      return Promise.resolve(
      ).then(=>
        @_boardInfo = null
        @_base.configured = false
        return @_eepromRead(0x00, 4)
      ).then((readData) =>
        header = new Uint8Array(readData)
        # if header[] == ....
        #   max10mode = true
        unless header[0] == 0x4a and header[1] == 0x37 and header[2] == 0x57
          return Promise.reject(Error("EEPROM header is invalid"))
        @_log(1, "open", "done(version=#{hexDump(header[3])})")
        @_boardInfo = {version: header[3]}
        return  # Last PromiseValue
      ).catch((error) =>
        return @_base.disconnect().catch(=>).then(=> Promise.reject(error))
      ) # return Promise.resolve()...
    ) # return Promise.resolve()...

  ###*
  @method
    PERIDOTデバイスポートのクローズ
  @param {function(boolean,Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト(callback省略時)
  ###
  close: (callback) ->
    return invokeCallback(callback, @close()) if callback?
    return Promise.resolve(
    ).then(=>
      return @_base.disconnect()
    ).then(=>
      @_boardInfo = null
      @_base.configured = false
      return  # Last PromiseValue
    ) # return Promise.resolve()...

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
  @param {function(boolean,Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト(callback省略時)
  ###
  config: (boardInfo, rbfdata, callback) ->
    return invokeCallback(callback, @config(boardInfo, rbfdata)) if callback?
    return Promise.reject(Error("Configuration is now in progress")) if @_configBarrier
    @_configBarrier = true
    timeLimit = undefined
    return Promise.resolve(
    ).then(=>
      return if boardInfo or (@boardInfo.id and @boardInfo.serialcode)
      # まだボード情報が読み込まれていないので先に読み込む
      return @getinfo()
    ).then(=>
      # コンフィグレーション可否の判断を行う
      mismatch = (a, b) -> a and a != b
      if mismatch(boardInfo?.id, @boardInfo.id)
        return Promise.reject(Error("Board ID mismatch"))
      if mismatch(boardInfo?.serialcode, @boardInfo.serialcode)
        return Promise.reject(Error("Board serial code mismatch"))
    ).then(=>
      # モードチェック
      # (コマンド：即時応答ON)
      @_base.transCommand(0x3b)
    ).then((response) =>
      unless (response & 0x01) == 0x00
        # ASモード(NG)
        return Promise.reject(Error("Not PS mode"))
      # PSモード(OK)
      return
    ).then(=>
      # タイムアウト計算の基点を保存
      # (ここからCONFIG_TIMEOUT_MS以内で処理完了しなかったらタイムアウト扱い)
      timeLimit = new TimeLimit(CONFIG_TIMEOUT_MS)
    ).then(=>
      # コンフィグレーション開始リクエスト発行(モード切替)
      return tryPromise(timeLimit.left, =>
        # (コマンド：コンフィグモード, nCONFIGアサート, 即時応答ON)
        return @_base.transCommand(0x32).then((response) =>
          unless (response & 0x06) == 0x00
            return Promise.reject()
          # nSTATUS=L, CONF_DONE=L => OK
          return
        )
      ) # return tryPromise()
    ).then(=>
      # FPGAの応答待ち
      return tryPromise(timeLimit.left, =>
        # (コマンド：コンフィグモード, nCONFIGネゲート, 即時応答ON)
        return @_base.transCommand(0x33).then((response) =>
          unless (response & 0x06) == 0x02
            return Promise.reject()
          # nSTATUS=H, CONF_DONE=L => OK
          return
        )
      ) # return tryPromise()
    ).then(=>
      # コンフィグレーションデータ送信
      return @_base.transData(rbfdata)
    ).then(=>
      # コンフィグレーション完了チェック
      # (コマンド：コンフィグモード, 即時応答ON)
      return @_base.transCommand(0x33)
    ).then((response) =>
      unless (response & 0x06) == 0x06
        return Promise.reject(Error("FPGA configuration failed"))
      # nSTATUS=H, CONF_DONE=H => OK
      return
    ).then(=>
      # コンフィグレーション完了(モード切替)
      # (コマンド：ユーザーモード)
      return @_base.transCommand(0x39)
    ).then(=>
      @_base.configured = true
      return  # Last PromiseValue
    ).then(finallyPromise(=>
      @_configBarrier = false
    )...) # return Promise.resolve()...

  ###*
  @method
    ボードのマニュアルリセット
  @param {function(boolean,number/Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト(callback省略時)
  @return {number} return.PromiseValue
    レスポンスコマンド
  ###
  reset: (callback) ->
    return invokeCallback(callback, @reset()) if callback?
    return Promise.reject(Error("Reset is now in progress")) if @_resetBarrier
    @_resetBarrier = true
    return Promise.resolve(
    ).then(=>
      # コンフィグモード(リセットアサート)
      return @_base.transCommand(0x31)
    ).then(=>
      # 100ms待機
      return waitPromise(100)
    ).then(=>
      # ユーザモード(リセットネゲート)
      return @_base.transCommand(0x39)
    ).then((response) =>
      return response # Last PromiseValue
    ).then(finallyPromise(=>
      @_resetBarrier = false
    )...) # return Promise.resolve()...

  ###*
  @method
    ボード情報の取得
  @param {function(boolean,Object/Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト(callback省略時)
  @return {Object} return.PromiseValue
    ボード情報
  @return {string} return.PromiseValue.id
    ボードID
  @return {string} return.PromiseValue.serialCode
    シリアル番号
  ###
  getinfo: (callback) ->
    return invokeCallback(callback, @getinfo()) if callback?
    return Promise.resolve(
    ).then(=>
      switch @_boardInfo?.version
        when undefined
          return Promise.reject(Error("Boardinfo not loaded"))
        when 1
          # ver.1 ヘッダ
          return @_eepromRead(0x04, 8).then((readData) =>
            info = new Uint8Array(readData)
            @_log(1, "getinfo", "ver1", info)
            mid = (info[0] << 8) | (info[1] << 0)
            pid = (info[2] << 8) | (info[3] << 0)
            sid = (info[4] << 24) | (info[5] << 16) | (info[6] << 8) | (info[7] << 0)
            if mid == 0x0072
              s = "#{pid.hex(4)}#{sid.hex(8)}"
              @_boardInfo.id = "J72A"
              @_boardInfo.serialcode = "#{s.substr(0, 6)}-#{s.substr(6, 6)}-000000"
          ) # return @_eepromRead()
        when 2
          # ver.2 ヘッダ
          return @_eepromRead(0x04, 22).then((readData) =>
            info = new Uint8Array(readData)
            @_log(1, "getinfo", "ver2", info)
            bid = ""
            (bid += String.fromCharCode(info[i])) for i in [0...4]
            s = ""
            (s += String.fromCharCode(info[i])) for i in [4...22]
            @_boardInfo.id = "#{bid}"
            @_boardInfo.serialcode = "#{s.substr(0, 6)}-#{s.substr(6, 6)}-#{s.substr(12, 6)}"
          ) # return @_eepromRead()
        when 10
          # MAX10ヘッダ
          return @avm.read(MAX10BOOT_SWI_BASE + 8, 8).then((readData) =>
            @_log(1, "getinfo", "ver10", readData)
            @_boardInfo.id = "MAX 10"
            @_boardInfo.serialcode = "xxxxxxxx-xxxxxxxx" # dataから作る
          )
        else
          # 未知のヘッダバージョン
          return Promise.reject(Error("Unknown boardinfo version"))
    ).then(=>
      return @boardInfo # Last PromiseValue
    ) # return Promise.resolve()...

  ###*
  @method
    オプション設定
  @param {Object} option
    オプション
  @param {boolean}  option.forceConfigured
    コンフィグレーション済みとして扱うかどうか
  @param {function(boolean,Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト
  ###
  option: (option, callback) ->
    return invokeCallback(callback, @option(option)) if callback?
    return @_base.option(option)

  #----------------------------------------------------------------
  # Private methods
  #

  ###*
  @private
  @method
    EEPROMの読み出し
  @param {number} startaddr
    読み出し開始アドレス
  @param {number} readbytes
    読み出しバイト数
  @return {Promise}
    Promiseオブジェクト
  @return {ArrayBuffer} return.PromiseValue
    読み出し結果
  ###
  _eepromRead: (startaddr, readbytes) ->
    array = new Uint8Array(readbytes)
    if SPLIT_EEPROM_BURST? and readbytes > SPLIT_EEPROM_BURST
      # This is a workaround for Microchip's buggy 24AAxx chips
      # Reading over 6 bytes will be split into several reads
      return (x for x in [0...readbytes] by SPLIT_EEPROM_BURST).reduce(
        (sequence, offset) =>
          return sequence.then(=>
            return @_eepromRead(
              startaddr + offset
              Math.min(SPLIT_EEPROM_BURST, readbytes - offset)
            )
          ).then((partialData) =>
            array.set(new Uint8Array(partialData), offset)
            return
          ) # return sequence.then()...
        Promise.resolve()
      ).then(=>
        return array.buffer # Last PromiseValue
      ) # return (...).reduce()...
    lastError = null
    return Promise.resolve(
    ).then(=>
      @_log(1, "_eepromRead", "begin(addr=#{hexDump(startaddr)},bytes=#{hexDump(readbytes)})")
      # Start condition
      return @i2c.start()
    ).then(=>
      # Send slave address and direction (write)
      return @i2c.write(EEPROM_SLAVE_ADDR << 1).then((ack) =>
        return Promise.reject(Error("EEPROM is not found.")) unless ack
      )
    ).then(=>
      # Send EEPROM address
      return @i2c.write(startaddr & 0xff).then((ack) =>
        return Promise.reject(Error("Cannot write address in EEPROM")) unless ack
      )
    ).then(=>
      # Repeat start condition
      return @i2c.start()
    ).then(=>
      # Send slave address and direction (read)
      return @i2c.write((EEPROM_SLAVE_ADDR << 1) + 1).then((ack) =>
        return Promise.reject(Error("EEPROM is not found.")) unless ack
      )
    ).then(=>
      lastIndex = readbytes - 1
      return [0..lastIndex].reduce(
        (promise, index) =>
          return promise.then(=>
            return @i2c.read(index != lastIndex)
          ).then((byte) =>
            array[index] = byte
          )
        Promise.resolve()
      )
    ).catch((error) =>
      lastError = error
      return
    ).then(=>
      return @i2c.stop()
    ).then(=>
      return Promise.reject(lastError) if lastError
      @_log(1, "_eepromRead", "end", array)
      return array.buffer
    ) # return Promise.resolve()

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
  @return {undefined}
  ###
  @_log: (cls, func, msg, data) ->
    return if SUPPRESS_ALL_LOGS? and SUPPRESS_ALL_LOGS
    time = window.performance.now().toFixed(3)
    out = {
      time: time
      "#{cls}##{func}": msg
      stack: new Error().stack.split("\n    ").slice(1)
    }
    out.data = data if data
    console.log(out)
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
    Canarium._log("Canarium", func, msg, data) if @constructor.verbosity >= lvl
    return

