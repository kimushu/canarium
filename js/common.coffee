###
全モジュールのDEBUGレベルをセット
###
# DEBUG = 0

unless Function::property
  ###
  Object.definePropertyによるプロパティ定義メソッド
  ###
  Function::property = (prop, desc) ->
    Object.defineProperty @prototype, prop, desc

unless Function.Sequence
  ###*
  @private
  @class
    非同期関数を用いたシーケンス実行クラス
  ###
  class Function.Sequence
    ###*
    @property {function(Function.Sequence)[]}
      シーケンスで実行する要素の関数リスト
    @readonly
    ###
    @list: null

    ###*
    @property {function(Function.Sequence)}
      シーケンス終了時に成功失敗にかかわらず呼び出される関数。
      finalメソッドでも設定可能。
    ###
    onFinal: null

    ###*
    @property {null/number}
      現在実行中の要素番号(シーケンス開始前はnull)
    @readonly
    ###
    index: null

    ###*
    @property {boolean}
      異常終了したかどうか
    @readonly
    ###
    aborted: false

    ###*
    @property {boolean}
      正常終了したかどうか
    @readonly
    ###
    finished: false

    ###*
    @method
      コンストラクタ
    @param {function(Function.Sequence)[]} list...
      初期状態で追加するシーケンス要素の関数リスト
    ###
    constructor: (@list...) ->

    ###*
    @method
      シーケンス要素を末尾に追加する
    @param {function(Function.Sequence)[]} f...
      追加するシーケンス要素の関数(複数可)
    @chainable
    @return {Function.Sequence} this
    ###
    add: (f...) ->
      @list.push(f...)
      return this

    ###*
    @method
      シーケンス終了時に成功失敗にかかわらず呼び出される関数を登録する
    @param {function(Function.Sequence)} f
      登録する関数
    @chainable
    @return {Function.Sequence} this
    ###
    final: (f) ->
      @onFinal = f
      return this

    ###*
    @method
      シーケンスを開始する
    @return {void}
    ###
    start: ->
      @index = -1
      @aborted = false
      @finished = false
      @next(true)
      return

    ###*
    @method
      シーケンスを一つ次へ進める(次が無ければ正常終了する)。または異常終了する。
    @param {boolean} [success]
      現在の要素が正常終了したかどうか(省略時true)。falseを指定するとシーケンスを異常終了する。
    @return {void}
    ###
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

    ###*
    @method
      シーケンスを次に進めずに、現在の要素をもう一度繰り返す。
    @return {void}
    ###
    redo: ->
      return if @aborted or @finished or @index == null
      @list[@index].call(this, this)
      return

    ###*
    @method
      シーケンスを異常終了させる。next(false)に同じ。
    @return {void}
    ###
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

