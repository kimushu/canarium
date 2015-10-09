###*
@class Canarium.AvmTransactions
PERIDOTボードAvalon-MMトランザクション層通信クラス
@uses Canarium.AvsPackets
###
class Canarium.AvmTransactions
  DEBUG = if DEBUG? then DEBUG else 0

  #----------------------------------------------------------------
  # Public properties
  #

  #----------------------------------------------------------------
  # Private properties
  #

  ###*
  @private
  @property {Canarium.AvsPackets}
    Avalon-STパケット層通信クラスのインスタンス
  ###
  _avs: null

  ###*
  @private
  @property {number}
    Avalon Packets to Transactions Converterのチャネル番号
  ###
  @_channel: null

  ###*
  @private
  @property {number}
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

  ###*
  @method
    AvalonMMメモリリード(IORD_DIRECT)
  @param {number} address
    読み込み元アドレス(バイト単位)
  @param {number} bytenum
    読み込むバイト数
  @param {function(boolean,ArrayBuffer):void} callback
    コールバック関数
  @return {void}
  ###
  read: (address, bytenum, callback) ->
    dst = new Uint8Array(bytenum)
    byteOffset = 0
    remainder = bytenum
    new Function.Sequence(
      (seq) =>
        len = Math.min(remainder, AVM_TRANS_MAX_BYTES)
        @_trans(
          0x14  # Read, incrementing address
          address + byteOffset
          null
          len
          (result, partialData) ->
            return seq.abort() unless result
            dst.set(new Uint8Array(partialData), byteOffset)
            byteOffset += len
            remainder -= len
            return seq.redo() if remainder > 0
            seq.next()
        )
    ).final(
      (seq) =>
        return callback(false, null) if seq.aborted
        callback(true, dst.buffer)
    ).start()
    return

  ###*
  @method
    AvalonMMメモリライト(IOWR_DIRECT)
  @param {number} address
    書き込み先アドレス(バイト単位)
  @param {ArrayBuffer} writedata
    書き込むデータ
  @param {function(boolean):void} callback
    コールバック関数
  @return {void}
  ###
  write: (address, writedata, callback) ->
    src = new Uint8Array(writedata)
    byteOffset = 0
    remainder = writedata.byteLength
    new Function.Sequence(
      (seq) =>
        len = Math.min(remainder, AVM_TRANS_MAX_BYTES)
        @_trans(
          0x04  # Write, incrementing address
          address + byteOffset
          src.subarray(byteOffset, len)
          null
          (result) ->
            return seq.abort() unless result
            byteOffset += len
            remainder -= len
            return seq.redo() if remainder > 0
            seq.next()
        )
    ).final(
      (seq) =>
        callback(seq.finished)
    ).start()
    return

  ###*
  @method
    AvalonMMペリフェラルリード(IORD)
  @param {number} address
    読み込み元ベースアドレス(バイト単位。ただし自動的に4バイトの倍数に切り捨てられる)
  @param {number} offset
    オフセット(4バイトワード単位)
  @param {function(boolean,number):void}  callback
    コールバック関数
  @return {void}
  ###
  iord: (address, offset, callback) ->
    @_trans(
      0x10  # Read, non-incrementing address
      (address & 0xfffffffc) + (offset << 2)
      null
      4
      (result, rxdata) ->
        return callback(false, null) unless result
        src = new Uint8Array(rxdata)
        readData = (src[3] << 24) |
                   (src[2] << 16) |
                   (src[1] <<  8) |
                   (src[0] <<  0)
        callback(true, readData)
    )
    return

  ###*
  @method
    AvalonMMペリフェラルライト(IOWR)
  @param {number} address
    書き込み先ベースアドレス(バイト単位。ただし自動的に4バイトの倍数に切り捨てられる)
  @param {number} offset
    オフセット(4バイトワード単位)
  @param {number} writedata
    書き込むデータ
  @param {function(boolean):void} callback
    コールバック関数
  @return {void}
  ###
  iowr: (address, offset, writedata, callback) ->
    src = new Uint8Array(4)
    src[0] = (writedata >>> 24) & 0xff
    src[1] = (writedata >>> 16) & 0xff
    src[2] = (writedata >>>  8) & 0xff
    src[3] = (writedata >>>  0) & 0xff
    @_trans(
      0x00  # Write, non-incrementing address
      (address & 0xfffffffc) + (offset << 2)
      src
      4
      (result) ->
        callback(result)
    )
    return

  ###*
  @method
    AvalonMMオプション設定 
  @param {Object} option
    オプション
  @param {boolean}  option.fastAcknowledge
    即時応答ビットを立てるかどうか
  @param {function(boolean):void} callback
    コールバック関数
  @return {void}
  ###
  option: (option, callback) ->
    new Function.Sequence(
      (seq) =>
        seq.next() unless option.fastAcknowledge?
        @_avs._base.sendImmediate = if option.fastAcknowledge then true else false
        @_avs._base.transCommand(
          0x39 | (if @_avs._base.sendImmediate then 0x02 else 0x00)
          (result, response) -> seq.next(result)
        )
    ).final(
      (seq) ->
        callback(seq.finished)
    ).start()
    return

  #----------------------------------------------------------------
  # Private methods
  #

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
    Canarium._log("AvmTransactions", func, msg, data)
    return

  ###*
  @private
  @method
    トランザクションの発行
  @param {number} transCode
    トランザクションコード
  @param {number} address
    アドレス
  @param {Uint8Array/null} txdata
    送信パケットに付加するデータ(受信時はnull)
  @param {null/number}  rxsize
    受信するバイト数(送信時はnull)
  @param {function(boolean,ArrayBuffer):void} callback
    コールバック関数
  @return {void}
  ###
  _trans: (transCode, address, txdata, rxsize, callback) ->
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
    @_log("_trans", "info:(send)#{pkt.hexDump()}") if DEBUG >= 1
    @_avs.transPacket(@_channel, pkt.buffer, (rxsize or 4), (result, rxdata) =>
      return callback(false, null) unless result
      src = new Uint8Array(rxdata)
      @_log("_trans", "info:(recv)#{src.hexDump()}") if DEBUG >= 1
      if rxsize
        unless rxdata.byteLength == rxsize
          @_log(
            "_trans"
            "error:Length of received data does not match"
            {read: rxdata.byteLength, expected: rxsize}
          )
          return callback(false, null)
        return callback(true, rxdata)
      unless src[0] == pkt[0] ^ 0x80 and src[2] == pkt[2] and src[3] == pkt[3]
        @_log("_trans", "error:Illegal write response", src.hexDump())
        return callback(false, null)
      callback(true, null)
    )
    return

