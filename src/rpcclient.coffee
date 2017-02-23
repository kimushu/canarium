###*
@class Canarium.RpcClient
  PERIDOTボードRPCクライアントクラス
@uses Canarium.AvmTransactions
@uses Canarium.RemoteError
###
class Canarium.RpcClient
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
  @property {Object[]} _pendingCalls
    リクエスト送信待ち行列(callの要求順にキューされる)
  ###

  ###*
  @private
  @property {Object} _ongoingCalls
    応答待ちのcall情報(各callのタグをキーとした連想配列)
  ###

  ###*
  @private
  @property {number} _timerId
    ポーリング用タイマーのID (タイマー無効時はnull)
  ###

  ###*
  @private
  @property {number} _timerInterval
    ポーリング用タイマーの周期(ms) (タイマー無効時はnull)
  ###

  {BSON} = require("bson")
  bson = new BSON()

  SWI_REG_MSG = 6 # 0x18
  SWI_REG_SWI = 7 # 0x1c

  PERIDOT_RPCSRV_IF_VER = 0x0101
  JSONRPC_VERSION = "2.0"

  MIN_POLLING_INTERVAL_MS = 50
  MAX_POLLING_INTERVAL_MS = 1000

  #----------------------------------------------------------------
  # Public methods
  #

  ###*
  @method constructor
    コンストラクタ
  @param {Canarium.AvmTransactions} _avm
    Avalon-MMトランザクション層通信クラスのインスタンス
  ###
  constructor: (@_avm) ->
    @_pendingCalls = []     # Added in queued order
    @_ongoingCalls = {}     # Indexed by tag
    @_lastTag = 0
    @_timerId = null
    @_timerInterval = null
    @_timerHandler = @_poll.bind(this)
    @_srvInfoPtr = null
    @_hostId = null
    return

  ###*
  @method
    リモートメソッド呼び出しの実行
  @param {string} method
    メソッド名
  @param {Object/function(number)} params
    パラメータ、またはパラメータを返す関数
  @param {number} [interval]
    ポーリング周期(ms)
  @return {Promise}
    Promiseオブジェクト
    (エラー発生時はCanarium.RemoteErrorオブジェクトをreasonとしてRejectされる)
  @return {Object} return.PromiseValue
    返却データ
  ###
  doCall: (method, params, interval = MAX_POLLING_INTERVAL_MS) ->
    return new Promise((resolve, reject) =>
      tag = @_getNewTag()
      @_pendingCalls.push({method, params, interval, tag, resolve, reject})
      @_updateTimer()
    ) # return new Promise()

  #----------------------------------------------------------------
  # Private methods
  #

  ###*
  @private
  @method
    ポーリング用タイマーの作成/更新を行う
  @return {undefined}
  ###
  _updateTimer: ->
    interval = @_pendingCalls[0]?.interval ? Infinity
    for call of @_ongoingCalls
      interval = Math.min(interval, call.interval)
    interval = Math.max(interval, MIN_POLLING_INTERVAL_MS)

    if @_timerInterval != interval
      global.clearInterval(@_timerId) if @_timerId?
      @_timerId = null
      @_timerInterval = null
      if interval != Infinity
        @_timerId = global.setInterval(@_timerHandler, interval)
        @_timerInterval = interval
    return

  ###*
  @private
  @method
    リクエスト送信待ちのcallをすべてキャンセルする
  @param {Error} error
    エラーオブジェクト
  @return {undefined}
  ###
  _abortPendingCalls: (error) ->
    calls = @_pendingCalls
    @_pendingCalls = []
    call.reject(error) for call in calls
    return

  ###*
  @private
  @method
    応答受信待ちのcallをすべてキャンセルする
  @param {Error} error
    エラーオブジェクト
  @return {undefined}
  ###
  _abortOngoingCalls: (error) ->
    calls = @_ongoingCalls
    @_ongoingCalls = {}
    call.reject(error) for call of calls
    return

  ###*
  @private
  @method
    ポーリングによるリクエストの送信＆応答受信処理(タイマーハンドラ)
  @return {undefined}
  ###
  _poll: ->
    return if @_pollingBarrier
    @_pollingBarrier = true
    reqLen = null
    reqPtr = null
    resLen = null
    resPtr = null
    serverReady = false
    raiseIrq = false
    Promise.resolve(
    ).then(=>
      return unless @_srvInfoPtr?
      # 接続済みの場合
      return @_avm.read(@_srvInfoPtr + 4, 6 * 4).then((ab) =>
        [id0, id1, reqLen, reqPtr, resLen, resPtr] = new Uint32Array(ab)
        if (id0 != @_hostId[0]) or (id1 != @_hostId[1])
          # ホストID不一致 (サーバー側が意図せず再起動したと判断)
          return Promise.reject(
            Error("RPC server has been reset (Host ID does not match)")
          )

        # 接続維持確認完了
        serverReady = true
      )
    ).catch((error) =>
      # 接続状況確認中にエラーが発生した場合
      # リクエスト送信およびレスポンス待ちをすべてエラーで中断する
      @_abortPendingCalls(error)
      @_abortOngoingCalls(error)
      serverReady = false
      return
    ).then(=>
      return if serverReady
      # 初回接続や再接続が必要な場合
      # SWIメッセージを読み込み、サーバー情報の位置を得る
      @_srvInfoPtr = null
      return @_avm.iord(@_avm.swiBase, SWI_REG_MSG).then((value) =>
        if (value == 0)
          # サーバー情報なし(or 無効アドレス)
          # レスポンス待ちをエラーで中断する
          # リクエスト送信はエラーとせず保留する
          error = new Canarium.RemoteError(Canarium.RemoteError.ECANCELED)
          @_abortOngoingCalls(error)
          return Promise.reject(error)

        # サーバー情報の位置を保存
        @_srvInfoPtr = value
        return @_avm.read(@_srvInfoPtr, 7 * 4)
      ).then((ab) =>
        # サーバー情報全体を取得し、バージョン等をチェック
        [if_ver, id0, id1, reqLen, reqPtr, resLen, resPtr] = new Uint32Array(ab)
        if (if_ver & 0xffff) != PERIDOT_RPCSRV_IF_VER
          # バージョン不整合
          # リクエスト送信およびレスポンス待ちをすべてエラーで中断する
          error = new Error("Unsupported remote version")
          @_abortPendingCalls(error)
          @_abortOngoingCalls(error)
          return Promise.reject(error)

        # ホストIDを書き込み
        newId = Date.now()
        @_hostId = new Uint32Array(2)
        @_hostId[0] = (newId & 0xffffffff)
        @_hostId[1] = (newId >>> 32)
        return @_avm.write(@_srvInfoPtr + 4, @_hostId.buffer)
      ).then(=>
        # (再)接続完了
        serverReady = true
      )
    ).then(=>
      return if @_pendingCalls.length == 0
      # 新しいリクエストが存在する場合
      call = null
      return Promise.resolve(
      ).then(=>
        # リクエスト送信バッファの空きを確認
        return @_avm.iord(reqPtr, 0)
      ).then((size) =>
        # 空きが無い場合はエラー扱いとしてPromiseチェーンから抜ける
        return Promise.reject() if size != 0
      ).then(=>
        # 空きが有るため、新規リクエストの送信準備を行う
        call = @_pendingCalls.shift()
        params = call.params
        obj = {
          jsonrpc: JSONRPC_VERSION
          method: call.method.toString()
          params: params
          id: call.tag
        }
        obj.params = null if typeof(params) == "function"

        # 送信するBSONデータを生成
        bsonData = bson.serialize(obj)

        if typeof(params) == "function"
          # paramsが関数の場合、その戻り値を使ってBSONを再生成
          obj.params = params(reqLen - bsonData.byteLength)
          bsonData = bson.serialize(obj)

        switch Object::toString.call(obj.params)
          when "[object Object]", "[object Array]"
            null # OK
          else
            return Promise.reject(
              TypeError("Invalid parameter type")
            )

        # BSONデータサイズ確認
        return Promise.reject(
          Error("Request data is too large")
        ) if bsonData.byteLength > reqLen
        # console.log(obj) # for debugging only

        # BSONデータ書き込み(先頭ワード以外と、先頭ワードに分けて書き込む)
        return @_avm.write(reqPtr + 4, bsonData.slice(4)).then(=>
          return @_avm.write(reqPtr, bsonData.slice(0, 4))
        )
      ).then(=>
        # リクエスト送信完了
        @_ongoingCalls[call.tag.toNumber()] = call
        raiseIrq = true
        return
      ).catch((error) =>
        # エラー発生時、このcallを失敗扱いにする
        call.reject(error) if call?
        return
      ) # return Promise.resolve().then()...
    ).then(=>
      return Promise.resolve(
      ).then(=>
        # レスポンス受信バッファの空きを確認
        return @_avm.iord(resPtr, 0)
      ).then((size) =>
        # 空きの場合はエラー扱いとしてPromiseチェーンから抜ける
        return Promise.reject() if size == 0
        if size > resLen
          # データサイズが不正な場合、レスポンスの削除のみを行う
          return Promise.reject(Error("Invalid response length"))
        # データがあるため、レスポンスを受信する
        return @_avm.read(resPtr, size)
      ).then((ab) =>
        # 受信したBSONデータをECMAオブジェクトに戻す
        return bson.deserialize(Buffer.from(ab))
      ).then((obj) =>
        # 受信データの検証

        # バージョンの確認
        return Promise.reject(
          Error("Invalid JSONRPC response")
        ) if obj.jsonrpc != JSONRPC_VERSION

        # タグの取得
        tag = obj.id?.toNumber()
        return Promise.reject(Error("No valid id")) unless tag?
        # console.log(obj) # for debugging only

        # 対象のcallを特定
        call = @_ongoingCalls[tag]
        return Promise.reject(
          Error("No RPC request tagged ##{tag}")
        ) unless call?
        delete @_ongoingCalls[tag]
        @_updateTimer()

        if obj.error?
          # エラー終了
          call.reject(new Canarium.RemoteError(obj.error))
        else
          # 正常終了
          call.resolve(obj.result)
        return true # レスポンスの削除を行う
      ).catch((error) =>
        return false unless error?  # レスポンス無しの場合は何もしない
        @_log(0, "_poll", "receiving response: (#{error.name}) #{error.message}")
        return true # エラー発生時もレスポンスの削除を行う
      ).then((clearResponse) =>
        return @_avm.iowr(resPtr, 0, 0)
      ).then(=>
        raiseIrq = true
      ).catch((error) =>
        @_log(0, "_poll", "deleting response: (#{error.name}) #{error.message}")
        return
      ) # return Promise.resolve().then()...
    ).then(=>
      return unless raiseIrq
      # ソフトウェア割り込みの発行
      return @_avm.iowr(@_avm.swiBase, SWI_REG_SWI, 1)
    ).catch((error) =>
      @_log(0, "_poll", "(#{error.name}) #{error.message}")
    ).then(finallyPromise(=>
      @_pollingBarrier = false
    )...) # Promise.resolve().then()...
    return

  ###*
  @private
  @method
    新しいタグ値の取得
  ###
  _getNewTag: ->
    value = Date.now()
    if value <= @_lastTag
      value = @_lastTag + 1
    @_lastTag = value
    return BSON.Timestamp.fromNumber(value)

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
    Canarium._log("RpcClient", func, msg, data) if @constructor.verbosity >= lvl
    return

