###*
@class Canarium.AvmTransactions
  PERIDOTボードAvalon-MMトランザクション層通信クラス
@uses Canarium.AvsPackets
###
class Canarium.AvmTransactions
  null

  #----------------------------------------------------------------
  # Public properties
  #

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
  @property {Canarium.AvsPackets} _avs
    Avalon-STパケット層通信クラスのインスタンス
  ###

  ###*
  @private
  @property {number} _channel
    Avalon Packets to Transactions Converterのチャネル番号
  ###

  ###*
  @private
  @property {Promise} _lastAction
    キューされている動作の最後尾を示すPromiseオブジェクト
  ###

  ###*
  @private
  @static
  @cfg {number}
    1回のトランザクションで読み書きできる最大バイト数
  @readonly
  ###
  AVM_TRANS_MAX_BYTES = 32768

  #----------------------------------------------------------------
  # Public methods
  #

  ###*
  @method constructor
    コンストラクタ
  @param {Canarium.AvsPackets} _avs
    Avalon-STパケット層通信クラスのインスタンス
  @param {number} _channel
    パケットのチャネル番号
  ###
  constructor: (@_avs, @_channel) ->
    @_lastAction = Promise.resolve()
    return

  ###*
  @method
    AvalonMMメモリリード(IORD_DIRECT)
  @param {number} address
    読み込み元アドレス(バイト単位)
  @param {number} bytenum
    読み込むバイト数
  @param {function(boolean,ArrayBuffer/Error)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト
  @return {ArrayBuffer} return.PromiseValue
    受信したデータ
  ###
  read: (address, bytenum, callback) ->
    return invokeCallback(callback, @read(address, bytenum)) if callback?
    return @_queue(=>
      @_log(1, "read", "begin(address=#{hexDump(address)})")
      return Promise.reject("Device is not configured") unless @_avs.base.configured
      dest = new Uint8Array(bytenum)
      return (x for x in [0...bytenum] by AVM_TRANS_MAX_BYTES).reduce(
        (sequence, pos) =>
          return sequence.then(=>
            partialSize = Math.min(bytenum - pos, AVM_TRANS_MAX_BYTES)
            @_log(2, "read", "partial(offset=#{hexDump(pos)},size=#{hexDump(partialSize)})")
            return @_trans(
              0x14  # Read, incrementing address
              address + pos
              undefined
              partialSize
            ).then((partialData) =>
              dest.set(new Uint8Array(partialData), pos)
            ) # return @_trans().then()
          ) # return sequence.then()
        Promise.resolve()
      ).then(=>
        @_log(1, "read", "end", dest)
        return dest.buffer  # Last PromiseValue
      ) # return (...).reduce()...
    ) # return @_queue()

  ###*
  @method
    AvalonMMメモリライト(IOWR_DIRECT)
  @param {number} address
    書き込み先アドレス(バイト単位)
  @param {ArrayBuffer} writedata
    書き込むデータ
  @param {function(boolean,Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト
  ###
  write: (address, writedata, callback) ->
    return invokeCallback(callback, @write(address, writedata)) if callback?
    src = new Uint8Array(writedata.slice(0))
    return @_queue(=>
      @_log(1, "write", "begin(address=#{hexDump(address)})", src)
      return Promise.reject("Device is not configured") unless @_avs.base.configured
      return (x for x in [0...src.byteLength] by AVM_TRANS_MAX_BYTES).reduce(
        (sequence, pos) =>
          return sequence.then(=>
            partialData = src.subarray(pos, pos + AVM_TRANS_MAX_BYTES)
            @_log(2, "write", "partial(offset=#{hexDump(pos)})", partialData)
            return @_trans(
              0x04  # Write, incrementing address
              address + pos
              partialData
              undefined
            ) # return @_trans()
          ) # return sequence.then()
        Promise.resolve()
      ).then(=>
        @_log(1, "write", "end")
        return  # Last PromiseValue
      ) # return (...).reduce()...
    ) # return @_queue()

  ###*
  @method
    AvalonMMペリフェラルリード(IORD)
  @param {number} address
    読み込み元ベースアドレス(バイト単位。ただし自動的に4バイトの倍数に切り捨てられる)
  @param {number} offset
    オフセット(4バイトワード単位)
  @param {function(boolean,number/Error)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト
  @return {number} return.PromiseValue
    受信したデータ(リトルエンディアンの32-bit符号有り整数)
  ###
  iord: (address, offset, callback) ->
    return invokeCallback(callback, @iord(address, offset)) if callback?
    return @_queue(=>
      @_log(1, "iord", "begin(address=#{hexDump(address)}+#{offset})")
      return Promise.reject("Device is not configured") unless @_avs.base.configured
      return @_trans(
        0x10  # Read, non-incrementing address
        (address & 0xfffffffc) + (offset << 2)
        undefined
        4
      ).then((rxdata) =>
        src = new Uint8Array(rxdata)
        readData = (src[3] << 24) |
                   (src[2] << 16) |
                   (src[1] <<  8) |
                   (src[0] <<  0)
        @_log(1, "iord", "end", readData)
        return readData # Last PromiseValue
      ) # return @_trans().then()
    ) # return @_queue()

  ###*
  @method
    AvalonMMペリフェラルライト(IOWR)
  @param {number} address
    書き込み先ベースアドレス(バイト単位。ただし自動的に4バイトの倍数に切り捨てられる)
  @param {number} offset
    オフセット(4バイトワード単位)
  @param {number} writedata
    書き込むデータ(リトルエンディアン)
  @param {function(boolean,Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト
  ###
  iowr: (address, offset, writedata, callback) ->
    return invokeCallback(callback, @iowr(address, offset, writedata)) if callback?
    return @_queue(=>
      @_log(1, "iowr", "begin(address=#{hexDump(address)}+#{offset})", writedata)
      return Promise.reject("Device is not configured") unless @_avs.base.configured
      src = new Uint8Array(4)
      src[0] = (writedata >>>  0) & 0xff
      src[1] = (writedata >>>  8) & 0xff
      src[2] = (writedata >>> 16) & 0xff
      src[3] = (writedata >>> 24) & 0xff
      return @_trans(
        0x00  # Write, non-incrementing address
        (address & 0xfffffffc) + (offset << 2)
        src
        undefined
      ).then(=>
        @_log(1, "iowr", "end")
        return  # Last PromiseValue
      ) # return @_trans().then()
    ) # return @_queue()

  ###*
  @method
    AvalonMMオプション設定
  @param {Object} option
    オプション
  @param {boolean} option.fastAcknowledge
    即時応答ビットを立てるかどうか
  @param {boolean} option.forceConfigured
    コンフィグレーション済みとして扱うかどうか
  @param {function(boolean,Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト
  ###
  option: (option, callback) ->
    return invokeCallback(callback, @option(option)) if callback?
    return @_queue(=>
      return @_avs.base.option(option)
    )

  #----------------------------------------------------------------
  # Private methods
  #

  ###*
  @private
  @method
    非同期実行キューに追加する
  @param {function():Promise} action
    Promiseオブジェクトを返却する関数
  @return {Promise}
    Promiseオブジェクト
  ###
  _queue: (action) ->
    return new Promise((resolve, reject) =>
      @_lastAction = @_lastAction.then(action).then(resolve, reject)
    )

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
    Canarium._log("AvmTransactions", func, msg, data) if @constructor.verbosity >= lvl
    return

  ###*
  @private
  @method
    トランザクションの発行
  @param {number} transCode
    トランザクションコード
  @param {number} address
    アドレス
  @param {Uint8Array/undefined} txdata
    送信パケットに付加するデータ(受信時はundefined)
  @param {undefined/number}  rxsize
    受信するバイト数(送信時はundefined)
  @return {Promise}
    Promiseオブジェクト
  @return {ArrayBuffer} return.PromiseValue
    受信したデータ
  ###
  _trans: (transCode, address, txdata, rxsize) ->
    len = txdata?.byteLength or rxsize
    pkt = new Uint8Array(8 + (txdata?.byteLength or 0))
    pkt[0] = transCode
    pkt[1] = 0x00
    pkt[2] = (len >>> 8) & 0xff
    pkt[3] = (len >>> 0) & 0xff
    pkt[4] = (address >>> 24) & 0xff
    pkt[5] = (address >>> 16) & 0xff
    pkt[6] = (address >>>  8) & 0xff
    pkt[7] = (address >>>  0) & 0xff
    pkt.set(txdata, 8) if txdata
    @_log(2, "_trans", "send", pkt)
    return @_avs.transPacket(@_channel, pkt.buffer, (rxsize or 4)).then((rxdata) =>
      @_log(2, "_trans", "recv", new Uint8Array(rxdata))
      if rxsize
        unless rxdata.byteLength == rxsize
          return Promise.reject(Error("Received data length does not match"))
        return rxdata
      res = new Uint8Array(rxdata)
      unless res[0] == pkt[0] ^ 0x80 and res[2] == pkt[2] and res[3] == pkt[3]
        return Promise.reject(Error("Illegal write response"))
      return
    ) # return @_avs.transPacket().then()

