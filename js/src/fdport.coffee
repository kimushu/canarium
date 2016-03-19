###*
@class Canarium.FDPort
  PERIDOTボード ホスト通信ポート基底クラス
@extends Canarium.Port
###
class Canarium.FDPort extends Canarium.Port
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
  @property {Object/null} _request
    処理中のリクエスト情報
  ###

  ###*
  @private
  @property {Object} _files
    オープンされているファイルディスクリプタの集合
  ###

  ###*
  @private
  @property {number} _nextFd
    次のファイルディスクリプタ番号
  ###

  #----------------------------------------------------------------
  # Private constants
  #

  NR_READ   = 3
  NR_WRITE  = 4
  NR_OPEN   = 5
  NR_CLOSE  = 6
  NR_LSEEK  = 19
  NR_FSTAT  = 28
  NR_IOCTL  = 54

  #----------------------------------------------------------------
  # Protected methods
  #

  ###*
  @protected
  @template
  @method
    open()の処理
  @param {Object} fd
    ファイルディスクリプタ
  @param {number} fd.flags
    フラグ(O_xxx)
  @param {number} fd.mode
    モード
  @param {string} fd.path
    ファイルパス
  @return {Promise}
    Promiseオブジェクト
  @return {undefined/number} return.PromiseValue
    成功時はデータ不要(resolve)またはエラーコード(reject)
  ###
  onOpen: (fd) ->
    return Promise.resolve()

  ###*
  @protected
  @template
  @method
    close()の処理
  @param {Object} fd
    ファイルディスクリプタ
  @param {number} fd.flags
    フラグ(O_xxx)
  @param {number} fd.mode
    モード
  @param {string} fd.path
    ファイルパス
  @return {Promise}
    Promiseオブジェクト
  @return {undefined/number} return.PromiseValue
    成功時はデータ不要(resolve)またはエラーコード(reject)
  ###
  onClose: (fd) ->
    return Promise.resolve()

  ###*
  @protected
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
    switch @_request?.nr?
      when NR_OPEN, NR_READ, NR_LSEEK, NR_FSTAT
        return @_request.process(length)
      when NR_CLOSE, NR_WRITE
        return Promise.reject(Canarium.Errno.EILSEQ)
    return Promise.reject(Canarium.Errno.ENOSYS)

  ###*
  @protected
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
    return @_newRequest(buffer) unless @_request?
    switch @_request.nr?
      when NR_OPEN, NR_CLOSE, NR_READ, NR_LSEEK, NR_FSTAT
        return Promise.reject(Canarium.Errno.EILSEQ)
      when NR_WRITE
        return @_request.process(buffer)
    return Promise.reject(Canarium.Errno.ENOSYS)

  ###*
  @protected
  @method constructor
    コンストラクタ
  ###
  constructor: ->
    super
    @_nextHandle = 1
    return

  #----------------------------------------------------------------
  # Private methods
  #

  ###*
  @private
  @method
    新しいリクエストを受信
  @param {ArrayBuffer} buffer
    リクエスト構造体
  @return {Promise}
    Promiseオブジェクト
  @return {number} return.PromiseValue
    読み込み完了したバイト数(resolve)またはエラーコード(reject)
  ###
  _newRequest: (buffer) ->
    src = new Uint32Array(buffer)
    req = null
    nr = le32toh(src[0])
    switch nr
      when NR_OPEN
        if buffer.byteLength >= 13
          path = new Uint8Array(buffer).subarray(12)
          req =
            flags: le32toh(src[1])
            mode: le32toh(src[2])
            path: String.fromCharCode.apply(null, path)
      when NR_CLOSE, NR_FSTAT
        if buffer.byteLength == 4
          req =
            fd: le32toh(src[1])
      when NR_READ, NR_WRITE
        if buffer.byteLength == 8
          req =
            fd: le32toh(src[1])
            len: le32toh(src[2])
      when NR_LSEEK
        if buffer.byteLength == 12
          req =
            fd: le32toh(src[1])
            ptr: le32toh(src[2])
            dir: le32toh(src[3])
      else
        return Promise.reject(Canarium.Errno.ENOTSUP)

    return Promise.reject(Canarium.Errno.EILSEQ) unless req?
    req.nr = nr
    @_request = req

    if nr == NR_OPEN
      fd =
        number: @_nextFd++
        flags: req.flags
        mode: req.mode
        path: req.path
      return @onOpen(fd).then(=>
        req.fd = fd.number
        @_files[fd.number] = fd
        return buffer.byteLength
      ) # return @onOpen().then()

    fd = @_files[req.fd]
    return Promise.reject(Canarium.Errno.EBADF) unless fd?

    switch nr
      when NR_CLOSE
        return @onClose(fd).then(=>
          fd.number = null
          delete @_files[fd.number]
          return buffer.byteLength
        ) # return @onClose().then()
      when NR_READ
        return @onRead(fd, req.len).then((readData) =>
          req.process = (length) =>
            return Promise.resolve(readData)
          return buffer.byteLength
        ) # return @onRead().then()
      when NR_WRITE
        req.promise = (writeData) =>
          return @onWrite(fd, writeData)
        return buffer.byteLength
    return Promise.reject(Canarium.Errno.ENOSYS)  # FIXME

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

