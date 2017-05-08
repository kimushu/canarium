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
    value: "__VERSION__"

  ###*
  @property {Object}  boardInfo
    接続しているボードの情報

  @property {string}  boardInfo.id
    ボードの識別子(以下のうちいずれか)

    - 'J72A' (PERIDOT Standard)
    - 'J72N' (PERIDOT NewGen)
    - 'J72B' (Virtual - コンフィグレーションレイヤをFPGA側に内蔵)
    - 'J72X' (Generic - Avalon-MMブリッジのみ使う汎用型)

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

  ###*
  @property {boolean} connected
    接続状態({@link Canarium.BaseComm#connected}のアクセサとして定義)

    - true: 接続済み
    - false: 未接続
  @readonly
  ###
  @property "connected",
    get: -> @_base.connected

  ###*
  @property {boolean} configured
    コンフィグレーション状態({@link Canarium.BaseComm#configured}のアクセサとして定義)

    - true: コンフィグレーション済み
    - false: 未コンフィグレーション
  @readonly
  ###
  @property "configured",
    get: -> @_base.configured

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
  @property {Canarium.RpcClient} rpcClient
    RPCクライアントクラスのインスタンス
  @readonly
  ###
  @property "rpcClient",
    get: -> @_rpcClient

  ###*
  @property {number} swiBase
    ホスト通信用ペリフェラル(SWI)のベースアドレス
    ({@link Canarium.AvmTransactions#swiBase}のアクセサとして定義)
  ###
  @property "swiBase",
    get: -> @_avm.swiBase
    set: (v) -> @_avm.swiBase = v

  ###*
  @property {function()} onClosed
  @inheritdoc Canarium.BaseComm#onClosed
  ###
  @property "onClosed",
    get: -> @_base.onClosed
    set: (v) -> @_base.onClosed = v

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
  @cfg {number} EEPROM_SLAVE_ADDR = 0b1010000
    EEPROMのスレーブアドレス(7-bit表記)
  @readonly
  ###
  EEPROM_SLAVE_ADDR = 0b1010000

  ###*
  @private
  @static
  @cfg {number} SPLIT_EEPROM_BURST = 6
    EEPROMの最大バーストリード長(バイト数)
  @readonly
  ###
  SPLIT_EEPROM_BURST = 6

  ###*
  @private
  @static
  @cfg {number} CONFIG_TIMEOUT_MS = 3000
    コンフィグレーション開始のタイムアウト時間(ms)
  @readonly
  ###
  CONFIG_TIMEOUT_MS = 3000

  ###*
  @private
  @static
  @cfg {number} RECONFIG_TIMEOUT_MS = 3000
    リコンフィグレーションのタイムアウト時間(ms)
  @readonly
  ###
  RECONFIG_TIMEOUT_MS = 3000

  ###*
  @private
  @static
  @cfg {number} AVM_CHANNEL = 0
    Avalon-MM 通信レイヤのチャネル番号
  @readonly
  ###
  AVM_CHANNEL = 0

  ###*
  @private
  @static
  @cfg {string} BOARDID_STANDARD = "J72A"
    標準PERIDOTのボードID
  @readonly
  ###
  BOARDID_STANDARD = "J72A"

  ###*
  @private
  @static
  @cfg {string} BOARDID_NEWGEN = "J72N"
    PERIDOT-NewGenのボードID
  @readonly
  ###
  BOARDID_NEWGEN = "J72N"

  ###*
  @private
  @static
  @cfg {string} BOARDID_VIRTUAL = "J72B"
    VirtualモードHostbridgeのボードID
  @readonly
  ###
  BOARDID_VIRTUAL = "J72B"

  ###*
  @private
  @static
  @cfg {string} BOARDID_GENERIC = "J72X"
    GenericモードHostbridgeのボードID
  @readonly
  ###
  BOARDID_GENERIC = "J72X"

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
    @_base = new Canarium.BaseComm()
    @_i2c = new Canarium.I2CComm(@_base)
    @_avs = new Canarium.AvsPackets(@_base)
    @_avm = new Canarium.AvmTransactions(@_avs, AVM_CHANNEL)
    @_rpcClient = new Canarium.RpcClient(@_avm)
    @_configBarrier = false
    @_resetBarrier = false
    return

  ###*
  @method
    ボードに接続する
  @param {string} path
    接続先パス(enumerateが返すpath)
  @param {Object} [boardInfo]
    接続先ボードのIDやrbfデータなど(省略時はIDチェックやコンフィグレーションをしない)
  @param {string} [boardInfo.id]
    接続を許容するID(省略時はIDのチェックをしない)
  @param {string} [boardInfo.serialcode]
    接続を許容するシリアル番号(省略時はシリアル番号のチェックをしない)
  @param {ArrayBuffer} [boardInfo.rbfdata]
    接続後に書き込むrbfやrpdのデータ(省略時は接続後にコンフィグレーションをしない)
  @param {function(boolean,Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト(callback省略時)
  ###
  open: (path, boardInfo, callback) ->
    if typeof(boardInfo) == "function"
      callback = boardInfo
      boardInfo = null
    return invokeCallback(callback, @open(path, boardInfo)) if callback?
    return Promise.resolve(
    ).then(=>
      return @_base.connect(path)
    ).then(=>
      return Promise.resolve(
      ).then(=>
        @_boardInfo = null
        return @_eepromRead(0x00, 4)
      ).then((readData) =>
        header = new Uint8Array(readData)
        unless header[0] == 0x4a and header[1] == 0x37 and header[2] == 0x57
          return Promise.reject(Error("EEPROM header is invalid"))
        @_log(1, "open", "done(version=#{hexDump(header[3])})")
        @_boardInfo = {version: header[3]}
        return @_base.transCommand(0x39)
      ).then((response) =>
        # CONF_DONEならコンフィグレーション済みとして設定する
        return @_base.option({forceConfigured: (response & 0x04) != 0})
      ).then(=>
        # 接続先ボードの検証
        return @_validate(boardInfo)
      ).then(=>
        return unless boardInfo?.rbfdata?
        # コンフィグレーションの実行
        return @config(null, boardInfo.rbfdata)
      ).then(=>
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
      return  # Last PromiseValue
    ) # return Promise.resolve()...

  ###*
  @method
    ボードのFPGAコンフィグレーション
  @param {Object/null} boardInfo
    ボード情報(ボードIDやシリアル番号を限定したい場合)
  @param {string} [boardInfo.id]
    ボードID (省略時は"J72A")
  @param {string} [boardInfo.serialcode]
    シリアル番号
  @param {ArrayBuffer} rbfdata
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
      # コンフィグレーション可否の判断を行う
      info = {id: boardInfo?.id ? BOARDID_STANDARD, serialcode: boardInfo?.serialcode}
      return @_validate(info)
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
    ).then((response) =>
      # CONF_DONEならコンフィグレーション済みとして設定する
      return @_base.option({forceConfigured: (response & 0x04) != 0})
    ).then(=>
      return  # Last PromiseValue
    ).then(finallyPromise(=>
      @_configBarrier = false
    )...) # return Promise.resolve()...

  ###*
  @method
    ボードのFPGA再コンフィグレーション
  @since 0.9.20
  ###
  reconfig: (callback) ->
    return invokeCallback(callback, @reconfig()) if callback?
    return Promise.reject(Error("(Re)configuration is now in progress")) if @_configBarrier
    @_configBarrier = true
    timeLimit = undefined
    return Promise.resolve(
    ).then(=>
      return if @_boardInfo?.id?
      return @getinfo()
    ).then(=>
      # ボード種別を確認
      return Promise.reject(
        Error("reconfig() cannot be used on this board")
      ) if @_boardInfo?.id == BOARDID_STANDARD
    ).then(=>
      # タイムアウト計算の基点を保存
      # (ここからRECONFIG_TIMEOUT_MS以内で処理完了しなかったらタイムアウト扱い)
      timeLimit = new TimeLimit(RECONFIG_TIMEOUT_MS)
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
  @return {string} return.PromiseValue.serialcode
    シリアル番号
  ###
  getinfo: (callback) ->
    return invokeCallback(callback, @getinfo()) if callback?
    return Promise.resolve(
    ).then(=>
      return @_base.assertConnection()
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
              @_boardInfo.id = BOARDID_STANDARD
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
        else
          # 未知のヘッダバージョン
          return Promise.reject(Error("Unknown boardinfo version"))
    ).then(=>
      return @boardInfo # Last PromiseValue
    ) # return Promise.resolve()...

  ###*
  @method
    ボード上のファイルを開く
  @param {string} path
    パス
  @param {number/Object} flags
    フラグ(数字指定またはECMAオブジェクト指定)
  @param {boolean} flags.O_WRONLY
    書き込み専用
  @param {boolean} flags.O_RDONLY
    読み込み専用
  @param {boolean} flags.O_RDWR
    読み書き両用
  @param {boolean} flags.O_APPEND
    追記モード
  @param {boolean} flags.O_CREAT
    作成モード
  @param {boolean} flags.O_NONBLOCK
    非ブロッキングモード
  @param {boolean} flags.O_TRUNC
    切り詰め(truncate)モード
  @param {number} [mode]
    ファイル作成時のパーミッション
  @param {number} [interval]
    RPCポーリング周期
  @param {function(boolean,Canarium.RemoteFile/Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト(callback省略時)
  @return {Canarium.RemoteFile} return.PromiseValue
    開かれたファイルに対する操作クラスのインスタンス
  ###
  openRemoteFile: (path, flags, mode, interval, callback) ->
    if typeof(mode) == "function"
      [mode, interval, callback] = [null, null, mode]
    else if typeof(interval) == "function"
      [interval, callback] = [null, interval]
    return invokeCallback(callback, @openRemoteFile(path, flags, mode, interval)) if callback?
    return Canarium.RemoteFile.open(@_rpcClient, path, flags, mode, interval)

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
  @method
    接続先ボードのID/シリアル番号検証
  @param {Object} boardInfo
    検証するボード情報
  @param {string} [boardInfo.id]
    許可するボードID(省略時は検証しない)
  @param {string} [boardInfo.serialcode]
    許可するシリアル番号(省略時は検証しない)
  @return {Promise}
    Promiseオブジェクト(不一致が発生した場合、rejectされる)
  @return {undefined} return.PromiseValue
  ###
  _validate: (boardInfo) ->
    return Promise.resolve(
    ).then(=>
      return @_base.assertConnection()
    ).then(=>
      return if !boardInfo or (@boardInfo?.id and @boardInfo?.serialcode)
      # まだボード情報が読み込まれていないので先に読み込む
      return @getinfo()
    ).then(=>
      # 許可/不許可の判断を行う
      mismatch = (a, b) -> a? and a != b
      if mismatch(boardInfo?.id, @boardInfo.id)
        return Promise.reject(Error("Board ID mismatch"))
      if mismatch(boardInfo?.serialcode, @boardInfo.serialcode)
        return Promise.reject(Error("Board serial code mismatch"))
      return  # Last PromiseValue (許可)
    ) # return Promise.resolve().then()...

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
    time = getCurrentTime().toFixed(3)
    out = {
      time: time
      "#{cls}##{func}": msg
      stack: new Error().stack.split(/\n\s*/).slice(1)
    }
    out.data = data if data
    if @_logger?
      @_logger(out)
    else
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
