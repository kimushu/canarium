###*
@class Canarium.AvsPackets
PERIDOTボードAvalon-STパケット層通信クラス
@uses Canarium.BaseComm
###
class Canarium.AvsPackets

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
    channel &= 0xff
    src = new Uint8Array(txdata)
    dst = new Uint8Array(txdata.byteLength * 2 + 4)
    dst[0] = 0x7c # Channel
    dst[1] = channel
    dst[2] = 0x7a # SOP
    len = 3
    for byte in src
      if 0x7a <= byte <= 0x7d
        dst[len] = 0x7d # Escape
        len += 1
        byte ^= 0x20
      dst[len] = byte
      len += 1
    dst[len] = 0x7b # EOP
    len += 1
    txdata = dst.buffer.slice(0, len)
    @_base.transData(txdata, rxsize + 4, (result, rxdata) =>
      return callback(false, null) unless result
      src = new Uint8Array(rxdata)
      dst = new Uint8Array(rxdata.byteLength - 4)
      unless src[0] == 0x7c and src[1] == channel and src[2] == 0x7a
        return callback(false, null)
      pos = 3
      len = 0
      xor = 0x00
      while pos < src.byteLength
        byte = src[pos]
        pos += 1
        switch byte
          when 0x7a, 0x7c # SOP, Channel
            break
          when 0x7b # EOP
            return callback(true, dst.buffer.slice(0, len))
          when 0x7d
            xor = 0x20
            continue
        dst[len] = byte ^ xor
        len += 1
        xor = 0x00

      callback(false, null)
    )
    return

  #----------------------------------------------------------------
  # Private methods
  #

