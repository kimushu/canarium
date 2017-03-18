###*
@class Canarium.RemoteFile
  PERIDOTボード側ファイル操作クラス
@uses Canarium.RpcClient
@uses Canarium.RemoteError
###
class Canarium.RemoteFile
  null

  #----------------------------------------------------------------
  # Public properties
  #

  ###*
  @property base
  @inheritdoc Canarium.BaseComm
  ###
  @property "base",
    get: -> @_rpcClient.base

  ###*
  @property vfd
    仮想ファイルディスクリプタ
  @readonly
  ###
  @property "vfd",
    get: -> @_vfd

  ###*
  @static
  @property {number}
    デバッグ出力の細かさ(0で出力無し)
  ###
  @verbosity: 0

  (Object.defineProperty(obj, name, {
    value: value
  }) for obj in [this, @prototype]) for name, value of {
    O_RDONLY:   0
    O_WRONLY:   1
    O_RDWR:     2
    O_APPEND:   0x0008
    O_CREAT:    0x0200
    O_TRUNC:    0x0400
    O_NONBLOCK: 0x4000
  }

  #----------------------------------------------------------------
  # Private properties
  #

  ###*
  @private
  @property {Canarium.RpcClient} _rpcClient
    RPCクライアントクラスのインスタンス
  ###

  ###*
  @private
  @cfg {number} REMOTEFILE_DEFAULT_INTERVAL
    RPCポーリング周期のデフォルト値
  ###
  REMOTEFILE_DEFAULT_INTERVAL = 200

  #----------------------------------------------------------------
  # Public methods
  #

  ###*
  @static
  @method
    RPCによるopenの呼び出し
  @param {Canarium.RpcClient} rpcClient
    RPCクライアントクラスのインスタンス
  @param {string} path
    パス
  @param {number/Object} flags
    フラグ(数字指定またはECMAオブジェクト指定)
  @param {boolean} flags.O_WRONLY
    書き込み専用
  @param {boolean} flags.O_RDONLY
    読み込み専用
  @param {boolean} flags.O_RDWR
    読み書き両用
  @param {boolean} flags.O_APPEND
    追記モード
  @param {boolean} flags.O_CREAT
    作成モード
  @param {boolean} flags.O_NONBLOCK
    非ブロッキングモード
  @param {boolean} flags.O_TRUNC
    切り詰め(truncate)モード
  @param {number} [mode=0777]
    ファイル作成時のパーミッション
  @param {number} [interval=REMOTEFILE_DEFAULT_INTERVAL]
    RPCポーリング周期
  @return {Promise}
    Promiseオブジェクト
  @return {Canarium.RemoteFile} return.PromiseValue
    ファイル操作クラスのインスタンス
  ###
  @open: (rpcClient, path, flags, mode = 0o777, interval = REMOTEFILE_DEFAULT_INTERVAL) ->
    return Promise.reject(
      TypeError("path must be a string")
    ) unless Object::toString.call(path) == "[object String]"
    return Promise.reject(
      TypeError("flags must be a number or Object")
    ) unless flags?
    return Promise.reject(
      TypeError("mode must be a number")
    ) unless typeof(mode) == "number"
    if typeof(flags) != "number"
      n = @O_RDONLY
      n = @O_WRONLY     if flags.O_WRONLY
      n = @O_RDWR       if flags.O_RDWR
      n |= @O_APPEND    if flags.O_APPEND
      n |= @O_CREAT     if flags.O_CREAT
      n |= @O_NONBLOCK  if flags.O_NONBLOCK
      n |= @O_TRUNK     if flags.O_TRUNC
      flags = n
    return Promise.resolve(
    ).then(=>
      return rpcClient.doCall("fs.open", {
        path: path
        flags: flags
        mode: mode
      }, interval)
    ).then((result) =>
      return new this(rpcClient, result.fd) # Last PromiseValue
    )

  ###*
  @method
    ファイルを閉じる(closeのリモート呼び出し)
  @return {Promise}
    Promiseオブジェクト
  @return {undefined} return.PromiseValue
  ###
  close: ->
    return Promise.reject(Error("File not opened")) unless @_fd?
    return Promise.resolve(
    ).then(=>
      return @_rpcClient.doCall("fs.close", {fd: @_fd})
    ).then(=>
      @_fd = null
      return  # Last PromiseValue
    ) # return Promise.resolve().then()...

  ###*
  @method
    ファイルからデータを読み込む
  @param {number} length
    読み込むバイト数
  @param {boolean} [autoContinue=false]
    読み込んだバイト数がlengthに達するまで繰り返すか否か
  @return {Promise}
    Promiseオブジェクト
  @return {ArrayBuffer} return.PromiseValue
    読み込んだデータ(サイズはlength以下)
  ###
  read: (length, autoContinue = false) ->
    return Promise.reject(
      TypeError("length must be a number")
    ) unless typeof(length) == "number"
    buffers = []
    total_read = 0
    readNext = =>
      return Promise.reject(Error("File not opened")) unless @_fd?
      return Promise.resolve(
      ).then(=>
        return @_rpcClient.doCall("fs.read", {fd: @_fd, length: length})
      ).catch((error) =>
        if error instanceof Canarium.RemoteError
          if error.code == Canarium.RemoteError.EAGAIN
            return {length: 0} if total_read > 0
        return Promise.reject(error)
      ).then((result) =>
        read_length = result.length
        if read_length > 0
          buffers.push(Buffer.from(result.data.read(0, read_length)))
          total_read += read_length
          length -= read_length
        return if length <= 0 # No more data to read
        return readNext() if autoContinue
      ) # return Promise.resolve().then()...
    return readNext().then(=>
      buffer = new ArrayBuffer(total_read)
      combined = Buffer.from(buffer)
      offset = 0
      for part in buffers
        part.copy(combined, offset)
        offset += part.length
      return buffer
    ) # return readNext().then()

  ###*
  @method
    ファイルにデータを書き込む
  @param {ArrayBuffer} data
    書き込むデータ
  @param {boolean} [autoContinue=false]
    書き込んだバイト数がlengthに達するまで繰り返すか否か
  @return {Promise}
    Promiseオブジェクト
  @return {number} return.PromiseValue
    書き込まれたバイト数
  ###
  write: (data, autoContinue = false) ->
    return Promise.reject(
      TypeError("data must be an ArrayBuffer")
    ) unless data instanceof ArrayBuffer
    total_written = 0
    writeNext = =>
      return Promise.reject(Error("File not opened")) unless @_fd?
      return Promise.resolve(
      ).then(=>
        return @_rpcClient.doCall("fs.write", {
          fd: @_fd
          data: Buffer.from(data, total_written)
        })
      ).catch((error) =>
        if error instanceof Canarium.RemoteError
          if error.code == Canarium.RemoteError.EAGAIN
            return {length: 0} if total_written > 0
        return Promise.reject(error)
      ).then((result) =>
        total_written += result.length
        return if total_written >= data.byteLength # No more data to write
        return writeNext() if autoContinue
      ) # return Promise.resolve().then()...
    return writeNext().then(=>
      return total_written
    )

  ###*
  @method
    ファイルポインタの移動
  @param {number} offset
    移動量
  @param {number/Object} whence
    移動の基点を示す値(SEEK_SET=0,SEEK_CUR=1,SEEK_END=2)またはECMAオブジェクト
  @param {boolean} whence.SEEK_SET
    先頭から数える
  @param {boolean} whence.SEEK_CUR
    現在位置から数える
  @param {boolean} whence.SEEK_END
    末尾から数える
  @return {Promise}
    Promiseオブジェクト
  @return {number} return.PromiseValue
    移動後のファイルポインタ
  ###
  lseek: (offset, whence) ->
    return Promise.reject(
      TypeError("offset must be a number")
    ) unless typeof(offset) == "number"
    if whence?
      if whence.SEEK_SET and !whence.SEEK_CUR and !whence.SEEK_END
        whence = 0  # SEEK_SET
      if !whence.SEEK_SET and whence.SEEK_CUR and !whence.SEEK_END
        whence = 1  # SEEK_CUR
      if !whence.SEEK_SET and !whence.SEEK_CUR and whence.SEEK_END
        whence = 2  # SEEK_END
    return Promise.reject(
      TypeError("whence must be a number or object with SEEK_xxx key")
    ) unless typeof(whence) == "number"
    return @_rpcClient.doCall("fs.lseek", {
      fd: @_fd
      offset: offset
      whence: whence
    }).then((result) =>
      return result.offset
    )

  fstat: ->
    return Promise.reject(Error("Not implemented"))

  ioctl: ->
    return Promise.reject(Error("Not implemented"))

  #----------------------------------------------------------------
  # Private methods
  #

  ###*
  @private
  @method constructor
    コンストラクタ
  @param {Canarium.RpcClient} _rpcClient
    RPCクライアントクラスのインスタンス
  @param {number} _fd
    ファイルディスクリプタ
  ###
  constructor: (@_rpcClient, @_fd) ->
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
    Canarium._log("RemoteFile", func, msg, data) if @constructor.verbosity >= lvl
    return

