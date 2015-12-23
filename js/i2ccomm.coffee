###*
@class Canarium.I2CComm
  PERIDOTボードI2C通信クラス
@uses Canarium.BaseComm
###
class Canarium.I2CComm
  null

  #----------------------------------------------------------------
  # Public properties
  #

  ###*
  @static
  @property {number}
    デバッグ出力の細かさ(0で出力無し)
  ###
  @verbosity: 3

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
  @static
  @cfg {number}
    I2C通信のタイムアウト時間
  @readonly
  ###
  I2C_TIMEOUT_MS = 100 * 10

  #----------------------------------------------------------------
  # Public methods
  #

  ###*
  @method constructor
    コンストラクタ
  @param {Canarium.BaseComm} _base
    下位層通信クラスのインスタンス
  ###
  constructor: (@_base) ->
    return

  ###*
  @method
    スタートコンディションの送信
  @param {function(boolean,Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト(callback省略時)
  ###
  start: (callback) ->
    return invokeCallback(callback, @start()) if callback?
    timeLimit = undefined
    return Promise.resolve(
    ).then(=>
      @_log(1, "start", "(start condition)")
      timeLimit = new TimeLimit(I2C_TIMEOUT_MS)
      # Setup
      return tryPromise(timeLimit.left, =>
        # (コマンド：SDA=Z, SCL=Z, 即時応答ON)
        return @_base.transCommand(0x3b).then((response) =>
          unless (response & 0x30) == 0x30
            return Promise.reject()
          return
        )
      ) # return tryPromise()
    ).then(=>
      # SDA -> L
      # (コマンド：SDA=L, SCL=Z, 即時応答ON)
      return @_base.transCommand(0x1b)
    ).then(=>
      # SCL -> L
      # (コマンド：SDA=L, SCL=L, 即時応答ON)
      return @_base.transCommand(0x0b)
    ).then(=>
      return  # Last PromiseValue
    ) # return Promise.resolve()...

  ###*
  @method
    ストップコンディションの送信
    (必ずSCL='L'が先行しているものとする)
  @param {function(boolean,Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト(callback省略時)
  ###
  stop: (callback) ->
    return invokeCallback(callback, @stop()) if callback?
    timeLimit = undefined
    return Promise.resolve(
    ).then(=>
      @_log(1, "stop", "(stop condition)")
      timeLimit = new TimeLimit(I2C_TIMEOUT_MS)
      # Setup
      # (コマンド：SDA=L, SCL=L, 即時応答ON)
      return @_base.transCommand(0x0b)
    ).then(=>
      # SCL -> HiZ(H)
      # (コマンド：SDA=L, SCL=Z, 即時応答ON)
      return tryPromise(timeLimit.left, =>
        return @_base.transCommand(0x1b).then((response) =>
          return Promise.reject() unless (response & 0x30) == 0x10
        )
      )
    ).then(=>
      # SDA -> HiZ(H)
      # (コマンド：SDA=Z, SCL=Z, 即時応答ON)
      return tryPromise(timeLimit.left, =>
        return @_base.transCommand(0x3b).then((response) =>
          return Promise.reject() unless (response & 0x30) == 0x30
        )
      )
    ).then(=>
      # 即時応答OFF設定の復旧
      return if @_base.sendImmediate
      # (コマンド：SDA=Z, SCL=Z, 即時応答OFF)
      return @_base.transCommand(0x39)
    ).then(=>
      return  # Last PromiseValue
    ) # return Promise.resolve()...

  ###*
  @method
    バイトリード
    (必ずSCL='L'が先行しているものとする)
  @param {boolean} ack
    ACK返却の有無(true:ACK, false:NAK)
  @param {function(boolean,number/Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト(callback省略時)
  @return {number} return.PromiseValue
    読み込みデータ(0～255)
  ###
  read: (ack, callback) ->
    return invokeCallback(callback, @read(ack)) if callback?
    ack = !!ack
    timeLimit = undefined
    readData = 0x00
    return Promise.resolve(
    ).then(=>
      # Read bits
      timeLimit = new TimeLimit(I2C_TIMEOUT_MS)
      return [7..0].reduce(
        (promise, bitNum) =>
          return promise.then(=>
            return tryPromise(
              timeLimit.left
              => @_readBit()
              1
            )
          ).then((bit) =>
            @_log(2, "read", "bit##{bitNum}=#{bit}")
            readData |= (bit << bitNum)
          )
        Promise.resolve()
      )
    ).then(=>
      # Send ACK/NAK
      return tryPromise(
        timeLimit.left
        =>
          @_log(2, "read", if ack then "ACK" else "NAK")
          @_writeBit(if ack then 0 else 1)
        1
      )
    ).then(=>
      @_log(1, "read", "data=0x#{readData.toString(16)}")
      return readData # Last PromiseValue
    ) # return Promise.resolve()...

  ###*
  @method
    バイトライト
    (必ずSCL='L'が先行しているものとする)
  @param {number} writebyte
    書き込むデータ(0～255)
  @param {function(boolean,number/Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト(callback省略時)
  @return {boolean} return.PromiseValue
    ACK受信の有無(true:ACK, false:NAK)
  ###
  write: (writebyte, callback) ->
    return invokeCallback(callback, @write(writebyte)) if callback?
    writebyte = parseInt(writebyte)
    timeLimit = undefined
    return Promise.resolve(
    ).then(=>
      # Write bits
      @_log(1, "write", "data=0x#{writebyte.toString(16)}")
      timeLimit = new TimeLimit(I2C_TIMEOUT_MS)
      return [7..0].reduce(
        (sequence, bitNum) =>
          bit = (writebyte >>> bitNum) & 1
          return sequence.then(=>
            @_log(2, "write", "bit##{bitNum}=#{bit}")
            return tryPromise(
              timeLimit.left
              => @_writeBit(bit)
              1
            )
          ) # return sequence.then()
        Promise.resolve()
      ) # return [...].reduce()...
    ).then(=>
      # Receive ACK/NAK
      return tryPromise(
        timeLimit.left
        => @_readBit()
        1
      )
    ).then((bit) =>
      ack = (bit == 0)
      @_log(2, "write", if ack then "ACK" else "NAK")
      return ack  # Last PromiseValue
    ) # return Promise.resolve()...

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
  @return {void}
  ###
  _log: (lvl, func, msg, data) ->
    Canarium._log("I2CComm", func, msg, data) if @constructor.verbosity >= lvl
    return

  ###*
  @private
  @method
    1ビットリード
    (必ずSCL='L'が先行しているものとする)
  @return {Promise}
    Promiseオブジェクト
  @return {0/1} return.PromiseValue
    読み出しビット値
  ###
  _readBit: ->
    timeLimit = undefined
    bit = 0
    return Promise.resolve(
    ).then(=>
      timeLimit = new TimeLimit(I2C_TIMEOUT_MS)
      # Setup
      # (コマンド：SDA=Z, SCL=Z, 即時応答ON)
      @_log(3, "_readBit", "setup,SCL->HiZ")
      return tryPromise(timeLimit.left, =>
        return @_base.transCommand(0x3b).then((response) =>
          return Promise.reject() unless (response & 0x10) == 0x10
          bit = 1 if (response & 0x20) == 0x20
        )
      )
    ).then(=>
      # SCL -> L
      # (コマンド：SDA=Z, SCL=L, 即時応答ON)
      @_log(3, "_readBit", "SCL->L")
      return @_base.transCommand(0x2b)
    ).then(=>
      return bit  # Last PromiseValue
    ) # return Promise.resolve()...

  ###*
  @private
  @method
    1ビットライト
    (必ずSCL='L'が先行しているものとする)
  @return {0/1} bit
    書き込みビット値
  @return {Promise}
    Promiseオブジェクト
  ###
  _writeBit: (bit) ->
    timeLimit = undefined
    bit = (if (bit != 0) then 1 else 0) << 5
    return Promise.resolve(
    ).then(=>
      timeLimit = new TimeLimit(I2C_TIMEOUT_MS)
      # Setup
      # (コマンド：SDA=bit, SCL=L, 即時応答ON)
      @_log(3, "_writeBit", "setup")
      return @_base.transCommand(0x0b | bit)
    ).then(=>
      # SCL -> HiZ(H)
      # (コマンド：SDA=bit, SCL=Z, 即時応答ON)
      @_log(3, "_writeBit", "SCL->HiZ")
      return tryPromise(timeLimit.left, =>
        return @_base.transCommand(0x1b | bit).then((response) =>
          return Promise.reject() unless (response & 0x10) == 0x10
        )
      )
    ).then(=>
      # SDA -> HiZ(H)
      # (コマンド：SDA=Z, SCL=L, 即時応答ON)
      @_log(3, "_writeBit", "SCL->L")
      return @_base.transCommand(0x2b)
    ).then(=>
      return  # Last PromiseValue
    ) # return Promise.resolve()...

