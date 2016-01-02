###*
@class Canarium.AvsPackets
  PERIDOTボードAvalon-STパケット層通信クラス
@uses Canarium.BaseComm
###
class Canarium.AvsPackets
  null

  #----------------------------------------------------------------
  # Public properties
  #

  ###*
  @property base
  @inheritdoc #_base
  @readonly
  ###
  @property "base",
    get: -> @_base

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
    Avalon-STパケットを送受信する。
    チャネル選択およびSOP/EOPは自動的に付加される。
    現時点では、受信データに複数のチャネルがインタリーブすることは認めない。
  @param {number} channel
    チャネル番号(0～255)
  @param {ArrayBuffer}  txdata
    送信するパケットデータ
  @param {number} rxsize
    受信するパケットのバイト数
  @return {Promise}
    Promiseオブジェクト
  @return {ArrayBuffer} return.PromiseValue
    受信したデータ
  ###
  transPacket: (channel, txdata, rxsize) ->
    pushWithEscape = (array, pos, byte) ->
      if 0x7a <= byte <= 0x7d
        array[pos++] = 0x7d
        array[pos++] = byte ^ 0x20
        return pos
      array[pos++] = byte
      return pos
    channel &= 0xff
    src = new Uint8Array(txdata)
    dst = new Uint8Array(txdata.byteLength * 2 + 5)
    len = 0
    dst[len++] = 0x7c # Channel
    len = pushWithEscape(dst, len, channel)
    dst[len++] = 0x7a # SOP
    header = dst.subarray(0, len)
    for byte in src.subarray(0, src.length - 1)
      len = pushWithEscape(dst, len, byte)
    dst[len++] = 0x7b # EOP
    len = pushWithEscape(dst, len, src[src.length - 1])
    txdata = dst.buffer.slice(0, len)
    totalRxLen = rxsize + header.length + 1
    @_log(1, "transPacket", "begin", {source: src, encoded: new Uint8Array(txdata)})

    eopFinder = (rxdata, offset) =>
      array = new Uint8Array(rxdata)
      for pos in [offset...array.length]
        if (array[pos - 1] == 0x7b and array[pos - 0] != 0x7d) or
           (array[pos - 2] == 0x7b and array[pos - 1] == 0x7d)
          return pos + 1
      return  # Need more bytes

    return @_base.transData(txdata, eopFinder).then((rxdata) =>
      src = new Uint8Array(rxdata)
      @_log(1, "transPacket", "recv", {encoded: src})
      unless src.subarray(0, header.length).join(",") == header.join(",")
        return Promise.reject(Error("Illegal packetize control bytes"))
      src = src.subarray(header.length)
      dst = new Uint8Array(rxsize)
      pos = 0
      xor = 0x00
      for byte in src
        if pos == rxsize
          return Promise.reject(Error("Received data is too large"))
        continue if byte == 0x7b
        if byte == 0x7d
          xor = 0x20
        else
          dst[pos++] = byte ^ xor
          xor = 0x00
      if pos < rxsize
        return Promise.reject(Error("Received data is too small"))
      @_log(1, "transPacket", "end", {decoded: dst})
      return dst.buffer # Last PromiseValue
    ) # return @_base.transData().then()

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
  @return {undefined}
  ###
  _log: (lvl, func, msg, data) ->
    Canarium._log("AvsPackets", func, msg, data) if @constructor.verbosity >= lvl
    return

