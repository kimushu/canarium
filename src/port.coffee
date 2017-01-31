###*
@class Canarium.Port
  PERIDOTボード ホスト通信ポート基底クラス
@uses Canarium.HostComm
###
class Canarium.Port
  null

  #----------------------------------------------------------------
  # Public properties
  #

  ###*
  @property {number} portNumber
  @inheritdoc #_portNumber
  @readonly
  ###
  @property "portNumber",
    get: -> @_portNumber

  ###*
  @property {number} pollingInterval
  @inheritdoc #_pollingInterval
  @readonly
  ###
  @property "pollingInterval",
    get: -> @_pollingInterval

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
  @property {Canarium.HostComm} _hostComm
    ホスト通信クラスのインスタンス
  ###

  ###*
  @private
  @property {number} _portNumber
    ポート番号(0～65535)
  ###

  ###*
  @private
  @property {number} _pollingInterval
    ポーリング間隔(ms)
  ###

  #----------------------------------------------------------------
  # Protected methods
  #

  ###*
  @protected
  @template
  @method
    ホストが書き込み(ホスト→クライアント)
  @param {number} length
    要求バイト数
  @return {Promise}
    Promiseオブジェクト
  @return {ArrayBuffer/number} return.PromiseValue
    読み取ったデータ(resolve)またはエラーコード(reject)
  ###
  processHostWrite: (length) ->
    return Promise.reject(Canarium.Errno.ENOSYS)

  ###*
  @protected
  @template
  @method
    ホストが読み込み(クライアント→ホスト)
  @param {ArrayBuffer} buffer
    転送要求データ
  @return {Promise}
    Promiseオブジェクト
  @return {number} return.PromiseValue
    読み込み完了したバイト数(resolve)またはエラーコード(reject)
  ###
  processHostRead: (buffer) ->
    return Promise.reject(Canarium.Errno.ENOSYS)

  ###*
  @protected
  @method constructor
    コンストラクタ
  @param {Canarium.HostComm} _hostComm
    ホスト通信クラスのインスタンス
  @param {number} _portNumber
    ポート番号
  @param {number} _pollingInterval
    ポーリング間隔(ms)
  ###
  constructor: (@_hostComm, @_portNumber, @_pollingInterval) ->
    @_hostComm.registerPort(this)
    return

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
    Canarium._log("Port", func, msg, data) if @constructor.verbosity >= lvl
    return

