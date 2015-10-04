###*
@class Canarium.I2CComm
PERIDOTボードI2C通信クラス
@uses Canarium.BaseComm
###
class Canarium.I2CComm
  DEBUG = DEBUG? or 0

  #----------------------------------------------------------------
  # Public properties
  #

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
    I2C通信のタイムアウト時間
  @readonly
  ###
  I2C_TIMEOUT_MS = 100

  #----------------------------------------------------------------
  # Public methods
  #

  ###*
  @method
    コンストラクタ
  @param {Canarium.BaseComm} _base
    下位層通信クラスのインスタンス
  ###
  constructor: (@_base) ->

  ###*
  @method
    スタートコンディションの送信
  @param {function(boolean):void} callback
    コールバック関数
  @return {void}
  ###
  start: (callback) ->
    console.log("i2c::start") if DEBUG >= 1
    setup = (done, abort, retry) =>
      console.log("i2c::start::setup") if DEBUG >= 2
      @_base.transCommand(
        0x3b  # SDA=Z, SCL=Z, 即時応答ON
        (result, response) ->
          return abort(false) unless result
          return retry() unless (response & 0x30) == 0x30
          done(true)
      )
    sdaLow = (done, abort, retry) =>
      console.log("i2c::start::sdaLow") if DEBUG >= 2
      @_base.transCommand(
        0x1b  # SDA=L, SCL=Z, 即時応答ON
        (result, response) ->
          return abort(false) unless result
          done(true)
      )
    sclLow = (done, abort, retry) =>
      console.log("i2c::start::sclLow") if DEBUG >= 2
      @_base.transCommand(
        0x0b  # SDA=L, SCL=L, 即時応答ON
        (result, response) ->
          return abort(false) unless result
          done(true)
      )
    _tryActions(
      [setup, sdaLow, sclLow]
      callback
      I2C_TIMEOUT_MS
    )
    return

  ###*
  @method
    ストップコンディションの送信
    (必ずSCL='L'が先行しているものとする)
  @param {function(boolean):void} callback
    コールバック関数
  @return {void}
  ###
  stop: (callback) ->
    console.log("i2c::stop") if DEBUG >= 1
    setup = (done, abort, retry) =>
      console.log("i2c::stop::setup") if DEBUG >= 2
      @_base.transCommand(
        0x0b  # SDA=L, SCL=L, 即時応答ON
        (result, response) ->
          return abort(false) unless result
          done(true)
      )
    sclRelease = (done, abort, retry) =>
      console.log("i2c::stop::sclRelease") if DEBUG >= 2
      @_base.transCommand(
        0x1b  # SDA=L, SCL=Z, 即時応答ON
        (result, response) ->
          return abort(false) unless result
          return retry() unless (response & 0x30) == 0x10
          done(true)
      )
    sdaRelease = (done, abort, retry) =>
      console.log("i2c::stop::sdaRelease") if DEBUG >= 2
      @_base.transCommand(
        0x3b  # SDA=Z, SCL=Z, 即時応答ON
        (result, response) ->
          return abort(false) unless result
          return retry() unless (response & 0x30) == 0x30
          done(true)
      )
    _tryActions(
      [setup, sclRelease, sdaRelease]
      callback
      I2C_TIMEOUT_MS
    )
    return

  ###*
  @method
    バイトリード
    (必ずSCL='L'が先行しているものとする)
  @param {boolean}  ack
    ACK返却の有無(true:ACK, false:NAK)
  @param {function(boolean, Number):void} callback
    コールバック関数
    function(boolean:通信成否, Number:読み込みデータ(0～255))
  @return {void}
  ###
  read: (ack, callback) ->
    console.log("i2c::read") if DEBUG >= 1
    bitNum = 8
    readData = 0x00
    readBits = (done, abort, retry) =>
      bitNum -= 1
      console.log("i2c::read::readBits[#{bitNum}]") if DEBUG >= 2
      @_readBit((result, bit) ->
        return abort(false) unless result
        readData = (readData << 1) | bit
        done(true)
      )
    sendAck = (done, abort, retry) =>
      console.log("i2c::read::sendAck") if DEBUG >= 2
      @_writeBit((if ack then 0 else 1), (result) ->
        return abort(false) unless result
        done(true)
      )
    _tryActions(
      (readBits for [7..0]).concat(sendAck)
      (result) -> callback(result, if result then readData else null)
      I2C_TIMEOUT_MS
    )
    return

  ###*
  @method
    バイトライト
    (必ずSCL='L'が先行しているものとする)
  @param {number} writebyte
    書き込むデータ(0～255)
  @param {function(boolean, boolean):void} callback
    コールバック関数
    function(boolean:通信成否, boolean:ACK受信有無)
  @return {void}
  ###
  write: (writebyte, callback) ->
    console.log("i2c::write(#{writebyte.hex(2)})") if DEBUG >= 1
    bitNum = 8
    writeData = 0 + writebyte
    writeBits = (done, abort, retry) =>
      bitNum -= 1
      bit = (writeData >>> 7) & 1
      writeData <<= 1
      console.log("i2c::write::writeBits[#{bitNum}]") if DEBUG >= 2
      @_writeBit(bit, (result) ->
        return abort(false) unless result
        done(true)
      )
    recvAck = (done, abort, retry) =>
      console.log("i2c::write::recvAck") if DEBUG >= 2
      @_readBit((result, bit) ->
        return abort(false) unless result
        done(true, bit)
      )
    _tryActions(
      (writeBits for [7..0]).concat(recvAck)
      (result, ack_n) -> callback(result, if result then (ack_n == 0) else null)
      I2C_TIMEOUT_MS
    )
    return

  #----------------------------------------------------------------
  # Private methods
  #

  ###*
  @private
  @method
    1ビットリード
    (必ずSCL='L'が先行しているものとする)
  @param {function(boolean,number)} callback
    コールバック関数
  ###
  _readBit: (callback) ->
    console.log("i2c::_readBit") if DEBUG >= 2
    bit = 0
    setup = (done, abort, retry) =>
      console.log("i2c::_readBit::setup") if DEBUG >= 3
      @_base.transCommand(
        0x3b  # SDA=Z, SCL=Z, 即時応答ON
        (result, response) ->
          return abort(false) unless result
          return retry() unless (response & 0x10) == 0x10
          bit = 1 if (response & 0x20) == 0x20
          done(true)
      )
    sclLow = (done, abort, retry) =>
      console.log("i2c::_readBit::sclLow") if DEBUG >= 3
      @_base.transCommand(
        0x2b  # SDA=Z, SCL=L, 即時応答ON
        (result, response) ->
          return abort(false) unless result
          done(true)
      )
    _tryActions(
      [setup, sclLow]
      (result) ->
        console.log("=> #{if result then bit else "(failed)"}") if DEBUG >= 2
        callback(result, if result then bit else null)
      I2C_TIMEOUT_MS
    )
    return

  ###*
  @private
  @method
    1ビットライト
    (必ずSCL='L'が先行しているものとする)
  @param {0/1}  bit
  @param {function(boolean)}  callback
    コールバック関数
  ###
  _writeBit: (bit, callback) ->
    console.log("i2c::_writeBit(#{bit})") if DEBUG >= 2
    setup = (done, abort, retry) =>
      console.log("i2c::_writeBit::setup") if DEBUG >= 3
      @_base.transCommand(
        0x0b + ((bit & 1) << 5) # SDA=bit, SCL=L, 即時応答ON
        (result, response) ->
          return abort(false) unless result
          done(true)
      )
    sclRelease = (done, abort, retry) =>
      console.log("i2c::_writeBit::sclRelease") if DEBUG >= 3
      @_base.transCommand(
        0x1b + ((bit & 1) << 5) # SDA=bit, SCL=Z, 即時応答ON
        (result, response) ->
          return abort(false) unless result
          return retry() unless (response & 0x10) == 0x10
          done(true)
      )
    sclLow = (done, abort, retry) =>
      console.log("i2c::_writeBit::sclLow") if DEBUG >= 3
      @_base.transCommand(
        0x2b  # SDA=Z, SCL=L, 即時応答ON
        (result, response) ->
          return abort(false) unless result
          done(true)
      )
    _tryActions(
      [setup, sclRelease, sclLow]
      callback
      I2C_TIMEOUT_MS
    )
    return

  ###*
  @static
  @private
  @method
    タイムアウト付きで非同期アクション(複数可)を試行する
  @param {Function[]} actions
    実行するアクションの配列(完了,中止,リトライの3つのコールバック関数を引数とする)
  @param {function(boolean)} callback
    すべてのアクションが完了したときのコールバック関数
  @param {number} timeout
    1アクション当たりのタイムアウト時間
    (window.performance.nowにより経過時間で計測される)
  @param {number} [period]
    リトライ周期(省略時は0ms…最小待ち)
  @return {void}
  ###
  _tryActions = (actions, callback, timeout, period) ->
    actions = [actions] unless actions instanceof Array
    period or= 0
    action = 0
    startTime = window.performance.now()
    done = (args...) ->
      action += 1
      return start() if action < actions.length
      callback(args...)
    abort = (args...) ->
      callback(args...)
    retry = ->
      elapsed = window.performance.now() - startTime
      console.log("timeout!")
      return abort() if elapsed > timeout
      window.setTimeout(start, period)
    start = => actions[action](done, retry, abort)
    start()
    return

