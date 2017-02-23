###*
@class Canarium.RemoteError
  PERIDOTボード側のエラーを表現するクラス
###
class Canarium.RemoteError extends Error
  null

  #----------------------------------------------------------------
  # Public properties
  #

  ###*
  @property {number} code
    エラー番号(PERIDOTボード側システムのerrno値、またはJSON-RPC仕様で定義された値)
  @readonly
  ###

  ###*
  @property {string} message
    エラーメッセージ
  @readonly
  ###

  ###*
  @property {Object} data
    エラーの付属情報
  @readonly
  ###

  MESSAGES = {
    # JSON-RPC related errors
    # (http://www.jsonrpc.org/specification#error_object)
    "-32700": "Parse error"
    "-32600": "Invalid request"
    "-32601": "Method not found"
    "-32602": "Invalid params"
    "-32603": "Internal error"
  }

  for name, v of {
    EPERM     : [  1, "Operation not permitted"]
    ENOENT    : [  2, "No such file or directory"]
    EIO       : [  5, "Input/output error"]
    EBADF     : [  9, "Bad file number"]
    ENOMEM    : [ 12, "Not enough space"]
    EACCES    : [ 13, "Permission denied"]
    EBUSY     : [ 16, "Device or resource busy"]
    EEXIST    : [ 17, "File exists"]
    ENODEV    : [ 19, "No such device"]
    ENOTDIR   : [ 20, "Not a directory"]
    EISDIR    : [ 21, "Is a directory"]
    EINVAL    : [ 22, "Invalid argument"]
    EMFILE    : [ 24, "Too many open files"]
    ENOSPC    : [ 28, "No space left on device"]
    ENOSYS    : [ 88, "Function not implemented"]
    ESTALE    : [133, "Stale file handle"]
    ENOTSUP   : [134, "Not supported"]
    ECANCELED : [140, "Operation cancelled"]
  }
    [num, desc] = v
    MESSAGES[num] = "#{name}: #{desc}"
    Object.defineProperty(@, name, {value: num})
    Object.defineProperty(@prototype, name, {value: num})

  #----------------------------------------------------------------
  # Private properties
  #

  #----------------------------------------------------------------
  # Public methods
  #

  ###*
  @method constructor
    コンストラクタ(エラーオブジェクトを生成)
  @param {Object} obj
    JSON-RPCエラー情報
  @param {number} obj.code
    エラー番号
  @param {string} [obj.message]
    エラーメッセージ(未指定の場合、エラー番号から自動推測)
  @param {Object} [obj.data]
    エラーデータ
  ###
  constructor: (obj) ->
    obj = {code: obj} if typeof(obj) == "number"
    {@code, @message, @data} = obj
    @message ?= MESSAGES[@code]
    Object.freeze(@data)
    Error.captureStackTrace(this, @constructor)
    @name = @constructor.name
    return

