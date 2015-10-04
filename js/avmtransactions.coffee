###*
@class Canarium.AvmTransactions
PERIDOTボードAvalon-MMトランザクション層通信クラス
@uses Canarium.AvsPackets
###
class Canarium.AvmTransactions

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

  #----------------------------------------------------------------
  # Public methods
  #

  ###*
  @method
    コンストラクタ
  @param {Canarium.AvsPackets} _avs
    Avalon-STパケット層通信クラスのインスタンス
  ###
  constructor: (@_avs) ->

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
    return

  #----------------------------------------------------------------
  # Private methods
  #

