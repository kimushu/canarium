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
    処理中のディスクリプタ配列
  ###

  REG_CLASSID   = 0 # 0x00
  REG_TIMECODE  = 1 # 0x04
  REG_UID_LOW   = 2 # 0x08
  REG_UID_HIGH  = 3 # 0x0c
  REG_RST_STS   = 4 # 0x10
  REG_FLASH     = 5 # 0x14
  REG_MESSAGE   = 6 # 0x18
  REG_SWI       = 7 # 0x1c

  DESC_NEXT     = 0 # 0x00

  CMD_HOSTWRITE   = 0
  CMD_HOSTREAD    = 1

  RESP_PENDING    = 0
  RESP_ERROR      = 1
  RESP_HOSTWRITE  = 2
  RESP_HOSTREAD   = 3

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
    @_descs = []
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
    @_ports[n] = {instance: port, promise: Promise.resolve()}

    # タイマーの更新
    i = port.pollingInterval
    if @_timerId? and @_timerInterval > i
      window.clearTimeout(@_timerId)
      @_timerId = null
    unless @_timerId?
      @_timerId = window.setTimeout((=> @_poll()), @_timerInterval = i)

    # Pending中のディスクリプタを委譲する
    @_delegate(@_descs)
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
    @_log(1, "_raiseInterrupt", "raise")
    return @_avm.iowr(@_swiBase, REG_SWI, 1)

  ###*
  @private
  @method
    メッセージの読み込み
  @return {Promise}
    Promiseオブジェクト
  @return {number} return.PromiseValue
    メッセージデータ
  ###
  _readMessage: ->
    return @_avm.iord(@_swiBase, REG_MESSAGE)

  ###*
  @private
  @method
    メッセージの書き込み
  @return {number} message
    メッセージデータ
  @return {Promise}
    Promiseオブジェクト
  ###
  _writeMessage: (message) ->
    return @_avm.iowr(@_swiBase, REG_MESSAGE, message)

  ###*
  @private
  @method
    ディスクリプタの読み込み
  @return {Promise}
    Promiseオブジェクト
  @return {Object} return.PromiseValue
    ディスクリプタオブジェクト
  @return {number} return.PromiseValue.address
    このディスクリプタのアドレス
  @return {number} return.PromiseValue.next
    次のディスクリプタのアドレス
  @return {number} return.PromiseValue.portNumber
    ポート番号
  @return {number} return.PromiseValue.command
    コマンド番号(CMD_xxx)
  @return {number} return.PromiseValue.requestedBytes
    転送要求バイト数
  @return {number} return.PromiseValue.dataAddress
    データアドレス
  @return {number} return.PromiseValue.response
    応答番号(初期値は常にRESP_PENDING)
  @return {number} return.PromiseValue.status
    ステータスコード(初期値は常に0)
  @return {number} return.PromiseValue.transferedBytes
    転送完了バイト数(初期値は常に0)
  @return {boolean} return.PromiseValue.delegated
    委譲済みフラグ(初期値は常にfalse)
  ###
  _readDescriptor: (address) ->
    return @_avm.read(address, 16).then((readData) =>
      src = new Uint8Array(readData)
      desc = {}
      desc.address = address
      desc.next = (src[3] << 24) |
                  (src[2] << 16) |
                  (src[1] <<  8) |
                  (src[0] <<  0)
      desc.command = (src[7] >>> 6) & 0x3
      desc.requestedBytes = ((src[7] << 24) & 0x3f) |
                             (src[6] << 16) |
                             (src[5] <<  8) |
                             (src[4] <<  0)
      desc.portNumber = (src[9] << 8) | (src[8] << 0)
      desc.dataAddress = (src[15] << 24) |
                         (src[14] << 16) |
                         (src[13] <<  8) |
                         (src[12] <<  0)
      desc.response = 0
      desc.status = 0
      desc.transferedBytes = 0
      desc.delegated = false
      @_log(1, "_readDescriptor", "read(desc=#{hexDump(address)})", desc)
      return desc
    ) # return @_avm.read().then()

  ###*
  @private
  @method
    ディスクリプタの書き込み(応答とステータスのみ)
  @param {Object} desc
    ディスクリプタオブジェクト
  @param {number} desc.address
    このディスクリプタのアドレス
  @param {number} desc.response
    レスポンス番号(1:エラー,2:HostWrite完了,3:HostRead完了)
  @param {number} desc.status
    ステータスコード(レスポンスがエラーのとき利用される)
  @param {number} desc.transferedBytes
    転送完了バイト数(レスポンスが完了のとき利用される)
  @return {Promise}
    Promiseオブジェクト
  ###
  _writeDescriptor: (desc) ->
    @_log(1, "_writeDescriptor", "start", desc)
    resp = ((desc.response & 0x3) << 30)
    if (desc.response == RESP_ERROR)
      resp |= (desc.status & 0x3fffffff)
    else
      resp |= (desc.transferedBytes & 0x3fffffff)
    return Promise.resolve(
    ).then(=>
      return @_avm.iowr(desc.address, 5, resp)
    ).then(=>
      return @_raiseInterrupt()
    ) # return Promise.resolve().then()...

  ###*
  @private
  @method
    ポーリング処理の実行
  @return {undefined}
  ###
  _poll: ->
    @_readMessage().then((descPtr) =>
      chain = []
      next = =>
        if (descPtr & 1)
          return @_readDescriptor(descPtr & ~1).then((desc) =>
            chain.push(desc)
            descPtr = desc.next
            return next()
          )
        promise = Promise.resolve()
        if chain.length > 0
          promise = @_writeMessage(0).then(=>
            return @_raiseInterrupt()
          ).then(=>
            @_descs.push(chain...)
            @_delegate(chain)
          )
        promise.then(=>
          @_timerId = window.setTimeout((=> @_poll()), @_timerInterval)
        )
      next()
    )
    return

# ###*
# @private
# @method
#   新しいディスクリプタを1つ取得して処理を開始する
# @param {number} prev
#   前のディスクリプタのアドレス(先頭の場合は0)
# @return {Promise}
#   Promiseオブジェクト
# @return {number} return.PromiseValue
#   取得したディスクリプタのアドレス(存在しない場合は0)
# ###
# _pollDescriptor: (prev) ->
#   return Promise.resolve(false) unless @_avm.base.connected
#   return Promise.resolve(
#   ).then(=>
#     # 次のディスクリプタのアドレスを取得
#     return @_avm.iord(prev, 0) if prev != 0
#     return @_readMessage()
#   ).then((address) =>
#     return address if address == 0 or @_descs.indexOf(address) >= 0
#     # ディスクリプタを読み込み
#     return @_readDescriptor(address)
#   ).then((desc) =>
#     return desc if typeof(desc) == "number" # Last PromiseValue
#     @_log(1, "_pollDescriptor", "push(#{hexDump(desc.address)})", desc)
#     # 処理中リストに追加
#     @_descs.push(desc.address)
#     # ポートクラスへ処理を委譲
#     @_delegate([desc])
#     # 成功
#     return desc.address # Last PromiseValue
#   ) # return Promise.resolve()

  ###*
  @private
  @method
    ディスクリプタの処理をポートクラスに委譲する
  @param {Object[]} descs
    ディスクリプタオブジェクトの配列
  @return {undefined}
  ###
  _delegate: (descs) ->
    for desc in descs
      continue if desc.delegated  # 委譲済み
      port = @_ports[desc.portNumber]
      continue unless port?       # 該当ポートクラス無し
      desc.delegated = true
      @_log(1, "_delegate",
            "start(desc=#{hexDump(desc.address)},port=#{desc.portNumber})", desc)
      writeback = null
      switch desc.command
        when CMD_HOSTWRITE
          # Host to Client
          promise = port.promise.then(=>
            @_log(2, "_delegate",
                  "hwrite(desc=#{hexDump(desc.address)},len=#{desc.requestedBytes})")
            return port.instance.processHostWrite(desc.requestedBytes)
          ).then((buffer) =>
            writeback = buffer
            desc.response = RESP_HOSTWRITE
            return buffer.byteLength
          )
        when CMD_HOSTREAD
          # Client to Host
          promise = port.promise.then(=>
            return @_avm.read(desc.dataAddress, desc.requestedBytes)
          ).then((buffer) =>
            @_log(2, "_delegate", "hread(desc=#{hexDump(desc.address)})", buffer)
            return port.instance.processHostRead(buffer)
          ).then((length) =>
            desc.response = RESP_HOSTREAD
            return length
          )
        else
          @_log(1, "_delegate", "error(desc=#{hexDump(desc.address)})", desc)
          promise = port.promise.then(=> Promise.reject(134)) # ENOTSUP
      port.promise = promise.then(
        (length) =>
          desc.transferedBytes = length
          return unless writeback?
          return @_avm.write(desc.dataAddress, writeback)
      ).catch((status) =>
        # TODO: log
        if typeof(status) != "number"
          console.log("error:#{status}")
          status = 5  # EIO
        desc.response = RESP_ERROR
        desc.status = status
      ).then(=>
        # ディスクリプタに応答を書き込み
        return @_writeDescriptor(desc)
      ).catch(=>
        # TODO: log
        console.log("PANIC")  # FIXME
      ) # port.promise = promise.then()...
    return

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
    Canarium._log("HostComm", func, msg, data) if @constructor.verbosity >= lvl
    return

