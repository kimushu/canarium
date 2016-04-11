###*
@class Canarium.HostIOService
  PERIDOTボード ホスト側I/Oサービスクラス
@extends Canarium.Port
###
class Canarium.HostIOService extends Canarium.Port
  null

  #----------------------------------------------------------------
  # Public properties
  #

  ###*
  @property {"stopped"/"started"/"stopping"} status
  @readonly
  ###
  @property "status",
    get: -> "#{@_status}"

  ###*
  @static
  @property {number}
    デバッグ出力の細かさ(0で出力無し)
  ###
  @verbosity: 0

  #----------------------------------------------------------------
  # Private properties
  #

  NR_READ   = 3
  NR_WRITE  = 4
  NR_OPEN   = 5
  NR_CLOSE  = 6
  NR_LSEEK  = 19
  NR_FSTAT  = 28
  NR_IOCTL  = 54

  #----------------------------------------------------------------
  # Public methods
  #

  ###*
  @method
    ファイルシステム公開の開始
  @param {function(boolean,Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト
  ###
  start: (callback) ->
    return invokeCallback(callback, @start()) if callback?
    return Promise.reject(Error("Already started")) if @_status == "started"
    return Promise.reject(Error("Is stopping")) if @_status == "stopping"
    @_status == "started"
    return Promise.resolve()

  ###*
  @method
    ファイルシステム公開の停止
  @param {boolean} [force=false]
    残存するファイルディスクリプタを強制的に切断してでも停止するかどうか
  @param {function(boolean,Error=)} [callback]
    コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)
  @return {undefined/Promise}
    戻り値なし(callback指定時)、または、Promiseオブジェクト
  ###
  stop: (force = false, callback) ->
    return invokeCallback(callback, @stop(force)) if callback?
    return

  #----------------------------------------------------------------
  # Protected methods
  #

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
  constructor: (_hostComm, _portNumber, _pollingInterval) ->
    super(_hostComm, _portNumber, _pollingInterval)

  ###*
  @protected
  @template
  @method
    open()の処理
  @param {string} path
    ファイルのパス
  @param {number} flags
    アクセスモードやフラグ指定
  @param {number} mode
    ファイル作成時のパーミッション指定
  @return {Promise}
    Promiseオブジェクト
  @return {number} return.PromiseValue
    ファイルディスクリプタ。
    Linuxなどと違い、オープンされていない最小の数字とする必要はない。
    32-bit符号付き整数の範囲で表現できる非負の整数(つまり0以上2\^31未満)ならば
    どの値をどの順序で割り当ててもよい。
  ###
  processOpen: (path, flags, mode) ->
    return Promise.reject(Canarium.Errno.ENOSYS)

  ###*
  @protected
  @template
  @method
    close()の処理
  @param {number} fd
    ファイルディスクリプタ
  @return {Promise}
    Promiseオブジェクト
  @return {undefined} return.PromiseValue
  ###
  processClose: (fd) ->
    return Promise.reject(Canarium.Errno.ENOSYS)

  ###*
  @protected
  @template
  @method
    read()の処理
  @param {number} fd
    ファイルディスクリプタ
  @param {number} len
    読み取るバイト数
  @return {Promise}
    Promiseオブジェクト
  @return {ArrayBuffer} return.PromiseValue
    読み取ったデータ(サイズはlen以下とすること)
  ###
  processRead: (fd, len) ->
    return Promise.reject(Canarium.Errno.ENOSYS)

  ###*
  @protected
  @template
  @method
    write()の処理
  @param {number} fd
    ファイルディスクリプタ
  @param {ArrayBuffer} data
    書き込むデータ
  @return {Promise}
    Promiseオブジェクト
  @return {number} return.PromiseValue
    書き込まれたバイト数(data.byteLength以下)
  ###
  processWrite: (fd, data) ->
    return Promise.reject(Canarium.Errno.ENOSYS)

  ###*
  @protected
  @template
  @method
    lseek()の処理
  @param {number} fd
    ファイルディスクリプタ
  @param {number} offset
    オフセット量
  @param {number} whence
    オフセットの基点(SEEK_xxx)
  @return {Promise}
    Promiseオブジェクト
  @return {number} return.PromiseValue
    移動後のファイルポインタ
  ###
  processLseek: (fd, offset, whence) ->
    return Promise.reject(Canarium.Errno.ENOSYS)

  ###*
  @protected
  @template
  @method
    fstat()の処理
  @param {number} fd
    ファイルディスクリプタ
  @return {Promise}
    Promiseオブジェクト
  @return {Object} return.PromiseValue
    struct statの中身
  ###
  processFstat: (fd) ->
    return Promise.reject(Canarium.Errno.ENOSYS)

  ###*
  @protected
  @template
  @method
    ioctl()の処理
  @param {number} fd
    ファイルディスクリプタ
  @param {number} request
    リクエスト番号
  @param {number} arg
    入力データ
  @return {Promise}
    Promiseオブジェクト
  @return {ArrayBuffer/number} return.PromiseValue
    出力データ
  ###
  processIoctl: (fd, request, arg) ->
    return Promise.reject(Canarium.Errno.ENOSYS)

  #----------------------------------------------------------------
  # Private methods
  #

  ###*
  @private
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
    unless @_responser?
      return Promise.reject(Canarium.Errno.EPROTO)
    return @_responser.then(finallyPromise(=>
      @_responser = null
    )...)

  ###*
  @private
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
    return Promise.reject(Canarium.Errno.EPROTO) if @_responser?

    # Start processing new request
    req = new Uint32Array(buffer)
    nr = le32toh(req[0])
    switch (nr & 0xff)
      when NR_OPEN
        flags = le32toh(req[1])
        mode  = le32toh(req[2])
        read  = 12
        chars = new Uint8Array(buffer, 12)
        len   = chars.indexOf(0)
        if len >= 0
          chars = chars.subarray(0, len)
          ++read
        path  = String.fromCharCode.apply(null, chars)
        read  += len
        promise = @processOpen(path, flags, mode).then((fd) =>
          res = new Uint32Array(2)
          res[0] = htole32(nr)
          res[1] = htole32(fd)
          return res.buffer
        ) # promise = @processOpen().then()
      when NR_CLOSE
        fd    = le32toh(req[1])
        read  = 8
        promise = @processClose(fd).then(=>
          return  # No response data
        )
      when NR_READ
        fd    = le32toh(req[1])
        ptr   = le32toh(req[2])
        len   = le32toh(req[3])
        read  = 16
        promise = @processRead(fd, len).then((data) =>
          return @hostComm.write(ptr, data)
        ).then(=>
          res = new Uint32Array(2)
          res[0] = htole32(nr)
          res[1] = htole32(data.byteLength)
          return res.buffer
        ) # promise = @processRead().then()...
      when NR_WRITE
        fd    = le32toh(req[1])
        ptr   = le32toh(req[2])
        len   = le32toh(req[3])
        read  = 16
        promise = @hostComm.read(ptr, len).then((data) =>
          return @processWrite(fd, data)
        ).then((written) =>
          res = new Uint32Array(2)
          res[0] = htole32(nr)
          res[1] = htole32(written)
          return res.buffer
        ) # promise = @hostComm.read().then()...
      when NR_LSEEK
        fd    = le32toh(req[1])
        ofst  = le32toh(req[2])
        dir   = le32toh(req[3])
        read  = 16
        promise = @processLseek(fd, ofst, dir).then((current) =>
          res = new Uint32Array(2)
          res[0] = htole32(nr)
          res[1] = htole32(current)
          return res.buffer
        ) # promise = @processLseek().then()
      when NR_FSTAT
        fd    = le32toh(req[1])
        read  = 8
        promise = @processFstat(fd).then((stat) =>
          res = new Uint32Array(16)
          res[0] = htole32(nr)
          res[1] = htole32(stat.st_dev or 0)
          res[2] = htole32(stat.st_ino or 0)
          res[3] = htole32(stat.st_mode or 0)
          res[4] = htole32(stat.st_nlink or 0)
          res[5] = htole32(stat.st_uid or 0)
          res[6] = htole32(stat.st_gid or 0)
          res[7] = htole32(stat.st_rdev or 0)
          res[8] = htole32((stat.st_size or 0) & 0xffffffff)
          res[9] = htole32((stat.st_size or 0) >>> 32)
          res[10] = htole32((stat.st_atime or 0) & 0xffffffff)
          res[11] = htole32((stat.st_atime or 0) >>> 32)
          res[12] = htole32((stat.st_mtime or 0) & 0xffffffff)
          res[13] = htole32((stat.st_mtime or 0) >>> 32)
          res[14] = htole32((stat.st_ctime or 0) & 0xffffffff)
          res[15] = htole32((stat.st_ctime or 0) >>> 32)
          return res.buffer
        ) # promise = @processFstat().then()
      when NR_IOCTL
        fd    = le32toh(req[1])
        ptr   = le32toh(req[2])
        len   = le32toh(req[3])
        read  = 16
        promise = @hostComm.read(ptr, len).then((readData) =>
          return @processIoctl(fd, readData)
        ).then((writeData) =>
          return @hostComm.write(ptr, writeData) if writeData?
        ).then(=>
          return  # No response data
        )
      else
        return Promise.reject(Canarium.Errno.ENOSYS)

    return new Promise((resolve, reject) =>
      promise.then((res) =>
        @_responser = (=> return res) if res?
        resolve(read)
      ).catch((e) ->
        reject(e)
      )
    ) # return new Promise()

