###*
@class Canarium.Errno
  Canariumエラーコード定義(Nios II側のerrno定義と値を一致させてある)
###
class Canarium.Errno
  null

  @define = (name, value) ->
    Object.defineProperty(this, name, {value: value})

  #----------------------------------------------------------------
  # Public constants
  #

  ###*
  @static @readonly @property {number} EPERM
    操作をする権限がない
  ###
  @define("EPERM", 1)

  ###*
  @static @readonly @property {number} ENOENT
    指定されたエントリが存在しない
  ###
  @define("ENOENT", 2)

  ###*
  @static @readonly @property {number} EIO
    入出力エラー
  ###
  @define("EIO", 5)

  ###*
  @static @readonly @property {number} EBADF
    ファイルディスクリプタが不正である
  ###
  @define("EBADF", 9)

  ###*
  @static @readonly @property {number} EAGAIN
    再度実行が必要である
  ###
  @define("EAGAIN", 11)

  ###*
  @static @readonly @property {number} EACCES
    ファイルへのアクセス権がない
  ###
  @define("EACCES", 13)

  ###*
  @static @readonly @property {number} EINVAL
    引数が不正である
  ###
  @define("EINVAL", 22)

  ###*
  @static @readonly @property {number} EROFS
    ファイルシステムは読み込み専用である
  ###
  @define("EROFS", 30)

  ###*
  @static @readonly @property {number} ENOSYS
    要求された操作を処理するシステムが存在しない
  ###
  @define("ENOSYS", 88)

  ###*
  @static @readonly @property {number} EPROTO
    プロトコルが異常である
  ###
  @define("EPROTO", 71)

  ###*
  @static @readonly @property {number} ENOTSUP
    要求された操作はサポートされていない
  ###
  @define("ENOSYS", 134)

  ###*
  @static @readonly @property {number} EILSEQ
    シーケンスが異常である
  ###
  @define("EILSEQ", 138)

  ###*
  @static @readonly @property {number} EWOULDBLOCK
    ブロック状態である({@link #EAGAIN}の別名)
  ###
  @define("EWOULDBLOCK", @EAGAIN)

  #----------------------------------------------------------------
  # Private methods
  #

  ###*
  @private
  @method constructor
    コンストラクタ(インスタンス生成禁止)
  ###
  constructor: ->
    throw "Canarium.Errno cannot be instanciated."

  delete @define

