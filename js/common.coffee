###
全モジュールのDEBUGレベルをセット
###
# DEBUG = 1

###
Object.definePropertyによるプロパティ定義メソッド
###
unless Function::property
  Function::property = (prop, desc) ->
    Object.defineProperty @prototype, prop, desc

###
非同期関数を用いたシーケンス実行ユーティリティ
###
unless Function.Sequence
  class Function.Sequence
    constructor: (@list...) ->
      @onFinal = null
      @index = null
      @aborted = false
      @finished = false

    add: (f...) ->
      @list.push(f...)
      return this

    final: (f) ->
      @onFinal = f
      return this

    start: ->
      @index = -1
      @aborted = false
      @finished = false
      @next(true)
      return

    next: (success) ->
      return if @aborted or @finished or @index == null
      if success == false
        @aborted = true
        @onFinal?(this)
        return
      @index += 1
      if @index >= @list.length
        @finished = true
        @onFinal?(this)
        return
      @redo()
      return

    redo: ->
      return if @aborted or @finished or @index == null
      @list[@index](this)
      return

    abort: ->
      @next(false)
      return

###
プレフィックス付き固定長16進数文字列への変換メソッド(デバッグ用)
###
Number::hex = (digits) ->
  s = @toString(16)
  s = "0#{s}" while s.length < digits
  return "0x#{s}"

###
16進ダンプ(デバッグ用)
###
Uint8Array::hexDump = (maxLength) ->
  maxLength or= @length
  r = (v.hex(2) for v in @subarray(0, maxLength))
  r.push("...") if @length > maxLength
  return "[#{r.join(",")}]"

