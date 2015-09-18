###*
@class Canarium
PERIDOT通信クラス
###
class Canarium

  #----------------------------------------------------------------
  # Public properties
  #

  ###*
  @property {string}
    ライブラリのバージョン
  ###
  version: "0.9.9"

  ###*
  @property {Object}  boardInfo
    接続しているボードの情報

  @property {string}  boardInfo.id
    'J72A' (J-7SYSTEM Works / PERIDOT board)

  @property {string}  boardInfo.serialcode
    'xxxxxx-yyyyyy-zzzzzz'
  ###
  boardInfo: null

  ###*
  @property {number}
    デフォルトのビットレート
  ###
  serialBitrate: 115200

  ###*
  @property {Channel[]}
    チャネル[0～255]
  @readonly
  ###
  channels: null

  #----------------------------------------------------------------
  # Private properties
  #

  ###*
  @property {number}
    chrome.serialのコネクションID
  @private
  ###
  connectionId: null

  #----------------------------------------------------------------
  # Private methods
  #

  ###*
  @method
    開発者向けのエラーログを出力する
  @param {Object} data
    出力メッセージ等のデータ(型は自由)
  @return {void}
  @private
  ###
  err: (data) ->
    console.log({"error": data, "canarium": this})
    undefined

  #----------------------------------------------------------------
  # Public methods
  #

  ###*
  @method
    PERIDOTデバイスポートのオープン
  @param {string} portname
    接続するポート名(chrome.serial.getDevicesのports[].pathを指定)
  @param {function(boolean):void} callback
    コールバック関数
  @return {void}
  ###
  open: (portname, callback) ->
    if @connected
      callback(false) # 接続済みの場合は失敗として扱う
      return

    @boardInfo = null
    undefined

  ###*
  @method
    PERIDOTデバイスポートのクローズ
  @param {function(boolean):void} callback
    コールバック関数
  @return {void}
  ###
  close: (callback) ->
    undefined

  ###*
  @method
    ボードのFPGAコンフィグレーション
  @param {Object/null}  boardInfo
    ボード情報(ボードIDやシリアル番号を限定したい場合)
  @param {string/null}  boardInfo.id
    ボードID
  @param {string/null}  boardInfo.serialCode
    シリアル番号
  @param {ArrayBuffer}  rbfdata
    rbfまたはrpdのデータ
  @param {function(boolean):void} callback
    コールバック関数
  @return {void}
  ###
  config: (boardInfo, rbfdata, callback) ->
    undefined

  ###*
  @method
    ボードのマニュアルリセット
  @param {function(boolean):void} callback
    コールバック関数
  @return {void}
  ###
  reset: (callback) ->
    undefined

  ###*
  @method
    ボード情報の取得
  @param {function(boolean):void} callback
    コールバック関数
  @return {void}
  ###
  getinfo: (callback) ->
    if not @connected or @getinfoBarrier
      callback(false)
      return

    undefined

  ###*
  @class Channel
  仮想通信ポート(チャネル)クラス
  ###

  class Channel

    ###*
    @property {Canarium}
      オーナーのCanariumクラスインスタンス
    @readonly
    @private
    ###
    canarium: null

    ###*
    @property {Number}
      チャネル番号(0～255)
    @readonly
    ###
    index: null

    ###*
    @method
      コンストラクタ
    @param {Canarium} canarium
      オーナーのCanariumクラスインスタンス
    @param {Number}   index
      チャネル番号(0～255)
    @private
    ###
    constructor: (@canarium, @index) ->

    ###*
    @method
      非同期データ送信要求をキューに入れます。
      複数の送信要求をキューに入れることができます。送信順序はキューに入れた順です。
    @param {Number[]/ArrayBuffer/String}  senddata
      送信するデータ
    @param {Function}     successCallback
      送信成功時のコールバック
    @param {Number/null}  [timeout]
      タイムアウト時間[ms] (省略時 or nullは無限待ち)
    @param {Function}     [errorCallback]
      エラー発生時のコールバック
    @return {Boolean} true:キュー追加成功(送信成功とは異なる)、false:失敗
    ###
    send: (senddata, successCallback, timeout, errorCallback) ->
      null

    ###*
    @method
      データ受信イベントを登録します。一度受信するか失敗が確定すると解除されます。
      複数の受信待ちを同時に登録することはできません。
    @param {"arraybuffer"/"string"} readtype
      受信したデータを受け取る際のデータ型
    @param {Function}     successCallback
      受信成功時のコールバック (function(readdata))
    @param {Number/null}  [timeout]
      タイムアウト時間[ms] (省略時 or nullは無限待ち)
    @param {Function}     [errorCallback]
      エラー発生時のコールバック
    @return {Boolean} true:登録成功(受信成功とは異なる)、false:失敗
    ###
    recv: (readtype, successCallback, timeout, errorCallback) ->
      null

