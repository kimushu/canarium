###*
@class Canarium.HostComm
  PERIDOTボード ホスト通信クラス
@uses Canarium.AvmTransactions
@uses Canarium.Port
###
class Canarium.HostComm
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
  @property {Canarium.AvmTransactions} _avm
    Avalon-MMトランザクション層通信クラスのインスタンス
  ###

  ###*
  @private
  @property {number} _swiBase
    SWIペリフェラルのベースアドレス
  ###

  ###*
  @private
  @property {Object} _ports
    ポート番号をキーとするポートクラスインスタンスの連想配列
  ###

  ###*
  @private
  @property {number} _timerId
    ポーリング用タイマーのID
  ###

  ###*
  @private
  @property {number} _timerInterval
    ポーリング用タイマーの周期(ミリ秒)
  ###

  ###*
  @private
  @property {Object[]} _descs
    処理中のディスクリプタ配列(以下の説明は各要素のメンバ)
  @property {number} _descs.address
    ディスクリプタ先頭アドレス
  ###

  REG_CLASSID   = 0x00
  REG_TIMECODE  = 0x04
  REG_UID_LOW   = 0x08
  REG_UID_HIGH  = 0x0c
  REG_RESET_LED = 0x10
  REG_SPI       = 0x14
  REG_MESSAGE   = 0x18
  REG_SWI       = 0x1c

  #----------------------------------------------------------------
  # Protected methods
  #

  ###*
  @protected
  @method constructor
    コンストラクタ
  @param {Canarium.AvmTransactions} _avm
    Avalon-MMトランザクション層通信クラスのインスタンス
  @param {number} [_swiBase=0x10000000]
    SWIペリフェラルのベースアドレス
  ###
  constructor: (@_avm, @_swiBase = 0x10000000) ->
    @_ports = {}
    return

  ###*
  @protected
  @method
    ポートクラスの登録
  @param {Canarium.Port} port
    ポートクラスのインスタンス
  @return {undefined}
  ###
  registerPort: (port) ->
    n = port.portNumber
    throw Error("Port #{n} already registered") if @_ports[n]
    @_ports[n] = port

    i = port.pollingInterval
    if @_timerId? and @_timerInterval > i
      window.clearInterval(@_timerId)
      @_timerId = null
    unless @_timerId?
      @_timerId = window.setInterval((-> @_poll()), @_timerInterval = i)
    return

  #----------------------------------------------------------------
  # Private methods
  #

  ###*
  @private
  @method
    ソフトウェア割り込みの生成
  @return {Promise}
    Promiseオブジェクト
  ###
  _raiseInterrupt: ->
    return @_avm.iowr(@_swiBase, REG_SWI, 1)

  ###*
  @private
  @method
    メッセージの取得
  @return {Promise}
    Promiseオブジェクト
  @return {number} return.PromiseValue
    メッセージデータ
  ###
  _readMessage: ->
    return @_avm.iord(@_swiBase, REG_MESSAGE)

  ###
  @method
    次のディスクリプタを取得
  ###

  ###*
  @private
  @method
    ポーリング処理の実行
  @return {undefined}
  ###
  _poll: ->
    return

  _pollDescriptor: ->
    return unless @_avm.base.connected
    desc = {}
    Promise.resolve(
    ).then(=>
      # 次のディスクリプタのアドレスを取得
      nextPtr = @_descs[@_descs.length - 1]?.address or (@_swiBase + REG_MESSAGE)
      return @_avm.iord(nextPtr, 0)
    ).then((next) =>
      return Promise.reject() if next == 0
      # 次のディスクリプタが存在するので、ディスクリプタの中身を取得
      desc.address = next
      return @_avm.read(next + 4, 0x14)
    ).then((readData) =>
      array = new Uint8Array(readData)
    ).catch((error) =>
      throw error if error?
    )
    return

