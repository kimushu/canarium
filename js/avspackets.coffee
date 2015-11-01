###*
@class Canarium.AvsPackets
PERIDOTボードAvalon-STパケット層通信クラス
@uses Canarium.BaseComm
###
class Canarium.AvsPackets
  DEBUG = if DEBUG? then DEBUG else 0

  #----------------------------------------------------------------
  # Public properties
  #

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
  @param {function(boolean):void} callback
    コールバック関数
  @return {void}
  ###
  transPacket: (channel, txdata, rxsize, callback) ->
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
    @_log("transPacket", "info:(send)#{new Uint8Array(txdata).hexDump()}") if DEBUG >= 1
    @_base.transData(txdata, totalRxLen, (result, rxdata) =>
      return callback(false, null) unless result
      src = new Uint8Array(rxdata)
      @_log("transPacket", "info:(recv)#{src.hexDump()}") if DEBUG >= 1
      pos = header.length
      unless src.subarray(0, pos).join(",") == header.join(",")
        @_log("transPacket", "error:Illegal packetize control bytes", src.hexDump())
        return callback(false, null)
      dst = new Uint8Array(rxdata.byteLength - 4)
      len = 0
      xor = 0x00
      eop = false
      while pos < src.byteLength
        byte = src[pos++]
        switch byte
          when 0x7a, 0x7c # SOP, Channel
            break
          when 0x7b # EOP
            eop = true
            continue
          when 0x7d
            xor = 0x20
            continue
        dst[len++] = byte ^ xor
        xor = 0x00
        continue unless eop
        break unless pos == src.byteLength
        return callback(true, dst.buffer.slice(0, len))

      @_log("transPacket", "error:Illegal packetized bytestream", src.hexDump())
      callback(false, null)
    )
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
    Canarium._log("AvsPackets", func, msg, data)
    return

