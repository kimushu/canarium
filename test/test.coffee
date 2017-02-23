chai = require("chai")
chai.use(require("chai-as-promised"))
{assert} = chai
{step, xstep} = require("mocha-steps")
inquirer = require("inquirer")
path = require("path")
fs = require("fs")
elfy = require("elfy")
BSON = require("bson")

compareArray = (arr1, arr2) ->
  return false if arr1.length != arr2.length
  for v, i in arr1
    return false if arr2[i] != v
  return true

confirm = (test, message) ->
  test?.timeout(0)
  assert.isFulfilled(inquirer.prompt([
    type: "confirm"
    name: "ok"
    message: message
  ]).then((data) =>
    return Promise.reject(
      Error("Canceled by user")
    ) unless data.ok
  ))

isPeridotClassic = (info) ->
  vid = parseInt(info.vendorId, 16)
  pid = parseInt(info.productId, 16)
  return vid == 0x0403 and pid == 0x6015

loadElf = (buf, canarium) ->
  elf = elfy.parse(Buffer.from(buf))
  return elf.body.programs.reduce(
    (promise, ph) ->
      return promise if ph.type != "load"
      return promise.then(->
        return canarium.avm.write(ph.paddr, new Uint8Array(ph.data).buffer)
      )
    Promise.resolve()
  )

readTestData = (file) ->
  return new Promise((resolve, reject) ->
    fs.readFile(file, (err, buf) ->
      if err
        console.error("テスト実行の前にテスト用データの生成が必要です")
        console.error("testディレクトリ下で make data を実行して下さい")
        console.error("(データの生成にはQuartusPrime 16.1以降が必要です)")
        return reject(err)
      return resolve(new Uint8Array(buf).buffer)
    )
  )

# タイムアウト設定(単位はms)
TIMEOUT_CONNECT   = 5000  # 接続時間
TIMEOUT_BOARDINFO = 10000 # ボード情報読み出し時間
TIMEOUT_CONFIG    = 5000  # コンフィグレーション実行時間

#--------------------------------------------------------------------------------
# テスト本体
#

{Canarium} = require("../canarium.js")

describe "クラス定義:", ->

  step "クラスが存在すること", ->
    assert.isFunction(Canarium)

  describe "enumerate():", ->
    step "メソッドが存在すること", ->
      assert.isFunction(Canarium.enumerate)

    unrej = null

    step "コールバック関数内で例外発生時に多重呼び出しが発生しないこと [issue #2]", ->
      unrej = (err) ->
        throw err if err.message != "error-injection"
      process.prependListener("unhandledRejection", unrej)
      assert.isFulfilled(new Promise((resolve, reject) =>
        @timeout(2000)
        count = 0
        @test.title += " =>"
        Canarium.enumerate((result) =>
          ++count
          @test.title += " #{count}回目=#{result}"
          if count == 1 and result
            setTimeout(resolve, 200)
            throw Error("error-injection")
          else
            reject()
        )
      ))

    after ->
      process.removeListener("unhandledRejection", unrej) if unrej?

describe "ボード未接続:", ->
  canarium = null

  before ->
    canarium = new Canarium()

  step "インスタンスが生成されていること", ->
    assert.instanceOf(canarium, Canarium)

  describe "version:", ->
    step "プロパティが存在し、適切な書式の文字列であること", ->
      assert.isString(value = canarium.version)
      @test.title += " => \"#{value}\""
      assert.match(value, /^\d+\.\d+\.\d+$/)

  describe "avm:", ->
    step "プロパティが存在すること", ->
      assert.isDefined(canarium.avm)

    describe "iord():", ->
      step "メソッドが存在すること", ->
        assert.isFunction(canarium.avm.iord)

      step "未接続時に呼び出すとエラー(Not connected)を返すこと", ->
        promise = canarium.avm.iord(0, 0)
        assert.isRejected(promise, Error, "Not connected")

    describe "iowr():", ->
      step "メソッドが存在すること", ->
        assert.isFunction(canarium.avm.iowr)

      step "未接続時に呼び出すとエラー(Not connected)を返すこと", ->
        promise = canarium.avm.iowr(0, 0, 0)
        assert.isRejected(promise, Error, "Not connected")

    describe "option():", ->
      step "メソッドが存在すること", ->
        assert.isFunction(canarium.avm.option)

      step "未接続時に呼び出すとエラー(Not connected)を返すこと", ->
        promise = canarium.avm.option({})
        assert.isRejected(promise, Error, "Not connected")

    describe "read():", ->
      step "メソッドが存在すること", ->
        assert.isFunction(canarium.avm.read)

      step "未接続時に呼び出すとエラー(Not connected)を返すこと", ->
        promise = canarium.avm.read(0, 1)
        assert.isRejected(promise, Error, "Not connected")

    describe "write():", ->
      step "メソッドが存在すること", ->
        assert.isFunction(canarium.avm.write)

      step "未接続時に呼び出すとエラー(Not connected)を返すこと", ->
        promise = canarium.avm.write(0, new ArrayBuffer(1))
        assert.isRejected(promise, Error, "Not connected")

  describe "avs:", ->
    step "プロパティが存在すること", ->
      assert.isDefined(canarium.avs)

  describe "connected:", ->
    step "プロパティが存在し、falseであること", ->
      assert.equal(canarium.connected, false)

  describe "rpcClient:", ->
    step "プロパティが存在すること", ->
      assert.isDefined(canarium.rpcClient)

  describe "close():", ->
    step "メソッドが存在すること", ->
      assert.isFunction(canarium.close)

    step "未接続時に呼び出すとエラー(Not connected)を返すこと", ->
      promise = canarium.close()
      assert.isRejected(promise, Error, "Not connected")

  describe "config():", ->
    step "メソッドが存在すること", ->
      assert.isFunction(canarium.config)

    step "未接続時に呼び出すとエラー(Not connected)を返すこと", ->
      promise = canarium.config(null, new ArrayBuffer(0))
      assert.isRejected(promise, Error, "Not connected")

  describe "reconfig():", ->
    step "メソッドが存在すること", ->
      assert.isFunction(canarium.config)

    step "未接続時に呼び出すとエラー(Not connected)を返すこと", ->
      promise = canarium.reconfig()
      assert.isRejected(promise, Error, "Not connected")

  describe "getinfo():", ->
    step "メソッドが存在すること", ->
      assert.isFunction(canarium.getinfo)

    step "未接続時に呼び出すとエラー(Not connected)を返すこと", ->
      promise = canarium.getinfo()
      assert.isRejected(promise, Error, "Not connected")

  describe "open():", ->
    step "メソッドが存在すること", ->
      assert.isFunction(canarium.open)

  describe "reset():", ->
    step "メソッドが存在すること", ->
      assert.isFunction(canarium.reset)

    step "未接続時に呼び出すとエラー(Not connected)を返すこと", ->
      promise = canarium.reset()
      assert.isRejected(promise, Error, "Not connected")

dev_path = null

describe "ClassicボードのPSモード接続:", ->
  canarium = null

  before ->
    canarium = new Canarium()
    confirm(@, "PERIDOT ClassicをPSモードに設定し、1台だけ接続してください")

  describe "enumerate():", ->
    dev_info = null

    step "ボードを1台検出できること", ->
      Canarium.enumerate().then((devices) =>
        dev_info = null
        for device in devices
          if isPeridotClassic(device)
            return Promise.reject(
              Error("2つ以上のボードが検出されました")
            ) if dev_info?
            dev_info = device

        return Promise.reject(
          Error("ボードが検出されませんでした")
        ) unless dev_info?

        dev_path = dev_info.path
        @test.title += " => #{dev_path}"
      )

    step "Vendor ID および Product ID が取得できること", ->
      assert.isNotNaN(vid = parseInt(dev_info.vendorId, 16))
      assert.isNotNaN(pid = parseInt(dev_info.productId, 16))
      @test.title += " => VID:0x#{vid.toString(16)},PID:0x#{pid.toString(16)}"

  describe "BaseComm:", ->

    describe "connect():", ->

      before ->
        assert.isTrue(dev_path?)

      step "接続に成功すること", ->
        @timeout(TIMEOUT_CONNECT + TIMEOUT_BOARDINFO)
        assert.isFulfilled(canarium._base.connect(dev_path))

      step "接続成功後は接続状態になっていること", ->
        assert.isTrue(canarium._base.connected)

      step "多重接続に失敗し、エラー(Already connected)を返すこと", ->
        promise = canarium._base.connect(dev_path)
        assert.isRejected(promise, Error, "Already connected")

      step "多重接続失敗後は接続状態のままになっていること", ->
        assert.isTrue(canarium._base.connected)

      step "切断に成功すること", ->
        assert.isFulfilled(canarium._base.disconnect())

      step "切断後は未接続状態になっていること", ->
        assert.isFalse(canarium._base.connected)

  describe "open():", ->

    step "存在しないデバイスに接続するとエラーを返すこと", ->
      assert.isRejected(canarium.open("non_existent_path"), Error)

    step "接続エラー後は未接続状態になっていること", ->
      assert.isFalse(canarium.connected)

    step "他のアプリケーションが排他接続済みの場合には失敗すること", ->
      serial = new Canarium.BaseComm.SerialWrapper(dev_path, {})
      caught = false
      error = null
      promise = serial.open().then(=>
        return canarium.open(dev_path).catch((reason) =>
          error = reason
          caught = true
        )
      ).then(=>
        return serial.close()
      ).then(=>
        return Promise.reject(error) if caught
      )
      assert.isRejected(promise, Error)

    step "接続エラー後は未接続状態になっていること", ->
      assert.isFalse(canarium.connected)

    step "接続に成功すること", ->
      @timeout(TIMEOUT_CONNECT + TIMEOUT_BOARDINFO)
      assert.isFulfilled(canarium.open(dev_path))

    step "接続成功後は接続状態になっていること", ->
      assert.isTrue(canarium.connected)

    step "多重接続に失敗し、エラー(Already connected)を返すこと", ->
      promise = canarium.open(dev_path)
      assert.isRejected(promise, Error, "Already connected")

    step "多重接続失敗後は接続状態のままになっていること", ->
      assert.isTrue(canarium.connected)

  describe "_eepromRead():", ->
    step "EEPROMからIDが読み出せること", ->
      assert.isFulfilled(canarium._eepromRead(0x00, 4).then((readdata) =>
        a = new Uint8Array(readdata)
        b = (("0x" + "0#{v.toString(16)}".substr(-2)) for v in a).join(", ")
        @test.title += " => [#{b}]"
        return if a[0] == 0x4a and a[1] == 0x37 and a[2] == 0x57
        return Promise.reject("EEPROM内のIDが不正(#{a})")
      ))

  FPGA_DIR  = path.join(__dirname, "peridot_classic")
  FPGA_PRJ  = "swi_testsuite"
  FPGA_REV  = "swi_testsuite"
  RBF_PATH  = path.join(FPGA_DIR, "output_files", "#{FPGA_REV}.rbf")
  SW_PREFIX = path.join(FPGA_DIR, "software", FPGA_REV)

  SWI_CLASS_ID    = 0x72a09001
  SWI_RESET_SET   = 0xdead0001
  SWI_RESET_CLEAR = 0xdead0000

  SWI_BASE        = 0x10000000
  SWI_REG_CLASSID = 0
  SWI_REG_RSTSTS  = 4
  SWI_REG_MESSAGE = 6
  SDRAM_BASE      = 0x00000000
  SDRAM_SIZE      = 8 * 1024 * 1024
  IPL_BASE        = 0x0f000000
  IPL_SIZE        = 4 * 1024
  SCRATCH_BASE    = (IPL_BASE + IPL_SIZE - 4)
  SCRATCH_MAGIC   = 0xcafebabe

  describe "config():", ->
    rbfData = null
    boardInfo = null

    before ->
      return readTestData(RBF_PATH).then((data) ->
        rbfData = data
      )

    #step "コンフィグレーション状態が未完了になっていること", ->
    #  assert.isFalse(canarium.configured)

    step "ボード情報が読み出せること", ->
      @timeout(TIMEOUT_BOARDINFO)
      assert.isFulfilled(canarium.getinfo().then((info) =>
        return Promise.reject() unless info?
        boardInfo = info
        @test.title += " => {id: \"#{info.id}\", serialcode: \"#{info.serialcode}\"}"
        return
      ))

    step "ボード制限なしのコンフィグレーションが成功すること", ->
      @timeout(TIMEOUT_CONFIG)
      assert.isFulfilled(canarium.config(null, rbfData))

    step "コンフィグレーション状態が完了になっていること", ->
      assert.isTrue(canarium.configured)

    step "対象外ボードIDのコンフィグレーションがエラー(Board ID mismatch)で失敗すること", ->
      promise = canarium.config({
        id: "#{boardInfo.id}X"
        serialcode: boardInfo.serialcode
      }, rbfData)
      assert.isRejected(promise, Error, "Board ID mismatch")

    step "対象外シリアルコードのコンフィグレーションがエラー(Board serial code mismatch)で失敗すること", ->
      promise = canarium.config({
        id: boardInfo.id
        serialcode: "#{boardInfo.serialcode}X"
      }, rbfData)
      assert.isRejected(promise, Error, "Board serial code mismatch")

    step "対象ボードIDのコンフィグレーションが成功すること", ->
      @timeout(TIMEOUT_CONFIG)
      assert.isFulfilled(canarium.config({id: boardInfo.id}, rbfData))

    step "対象シリアルコードのコンフィグレーションが成功すること", ->
      @timeout(TIMEOUT_CONFIG)
      assert.isFulfilled(canarium.config({serialcode: boardInfo.serialcode}, rbfData))

  describe "reconfig():", ->

    step "PERIDOT Classicでは使用できないこと", ->
      promise = canarium.reconfig()
      assert.isRejected(promise, Error, "reconfig() cannot be used on this board")

  describe "avm:", ->

    it "クラスIDの読み取り(IORD)に成功すること", ->
      promise = canarium.avm.iord(SWI_BASE, SWI_REG_CLASSID).then((id) =>
        @test.title += " => 0x#{id.toString(16)}"
        return Promise.reject(Error("ID does not match")) unless id == SWI_CLASS_ID
      )
      assert.isFulfilled(promise)

    it "CPU停止指示の書き込み(IOWR)とベリファイ(IORD)に成功すること", ->
      promise = Promise.resolve(
      ).then(=>
        return canarium.avm.iowr(SWI_BASE, SWI_REG_RSTSTS, SWI_RESET_SET)
      ).then(=>
        return canarium.avm.iord(SWI_BASE, SWI_REG_RSTSTS)
      ).then((value) =>
        return Promise.reject(Error("Verify failed")) unless (value & 1) == 1
      )
      assert.isFulfilled(promise)

    for byte in [0x3a, 0x3d, 0x7a, 0x7b, 0x7c, 0x7d]
      text = "0x#{byte.toString(16)}"
      it "エスケープシーケンスに使われる文字(#{text})を正しく読み書きできること", ->
        data = new Uint8Array(0x1000)
        (data[x] = byte) for x in [0...data.length]
        promise = canarium.avm.write(SDRAM_BASE, data.buffer).then(=>
          return canarium.avm.read(SDRAM_BASE, data.length)
        ).then((read) =>
          read = new Uint8Array(read)
          return Promise.reject() unless compareArray(data, read)
        )
        assert.isFulfilled(promise)

    it "最上位ビットが1のデータを正の数としてリード(IORD)できること [issue #3]", ->
      promise = canarium.avm.iowr(SCRATCH_BASE, 0, 0xffffffff).then(=>
        return canarium.avm.iord(SCRATCH_BASE, 0)
      ).then((compare) =>
        @test.title += " => scratch:#{compare}"
        return Promise.reject() unless compare > 0
      )
      assert.isFulfilled(promise)

    it "テスト領域の書き込み(IOWR)とベリファイ(IORD)に成功すること", ->
      promise = canarium.avm.iowr(SWI_BASE, SWI_REG_MESSAGE, SCRATCH_MAGIC).then(=>
        return canarium.avm.iord(SWI_BASE, SWI_REG_MESSAGE)
      ).then((compare) =>
        @test.title += " => scratch:0x#{compare.toString(16)}"
        return Promise.reject() unless (compare|0) == (SCRATCH_MAGIC|0)
      )
      assert.isFulfilled(promise)

    it "リセット実行に成功すること", ->
      assert.isFulfilled(canarium.reset())

    step "テスト領域の読み込み(IORD)により、リセットしたことが確認できること", ->
      return canarium.avm.iord(SWI_BASE, SWI_REG_MESSAGE).then((compare) =>
        @test.title += " => scratch:0x#{compare.toString(16)}"
        return Promise.reject() unless (compare|0) != (SCRATCH_MAGIC|0)
      )

    it "複数のAVM通信要求が、呼び出し順で正しくキューイングされること", ->
      return new Promise((resolve, reject) =>
        phase = 0
        size = 0x1000
        @test.title += " => "
        Promise.resolve(
        ).then(=>
          # (準備) テスト領域全体をゼロフィル
          return canarium.avm.write(SDRAM_BASE, new ArrayBuffer(size))
        ).then(=>
          # (Phase 1->2) テストデータ書き込み
          data1 = new Uint8Array(size)
          (data1[x] = (x & 0xff)) for x in [0...size]
          canarium.avm.write(SDRAM_BASE, data1.buffer).then(=>
            return if phase < 0
            @test.title += "(1)"
            return reject(Error(phase = -10)) unless phase == 1
            phase = 2
          ).catch(=>
            return reject(Error(phase = -11))
          )
          # (Phase 2->3) テストデータ書き込み(前半を変更)
          data2 = new Uint8Array(data1.length / 2)
          (data2[x] = (x & 0xff) ^ 0xff) for x in [0...(size / 2)]
          canarium.avm.write(SDRAM_BASE, data2.buffer).then(=>
            return if phase < 0
            @test.title += "(2)"
            return reject(Error(phase = -20)) unless phase == 2
            phase = 3
          ).catch(=>
            return reject(Error(phase = -21))
          )
          # (Phase 3->4) テストデータ読み込み＆ベリファイ
          canarium.avm.read(SDRAM_BASE, data1.length).then((data3) =>
            data3 = new Uint8Array(data3)
            return if phase < 0
            @test.title += "(3)"
            return reject(Error(phase = -30)) unless phase == 3 and data3.byteLength == size
            phase = 4
            return reject(Error(phase = -31)) unless compareArray(
              data2
              data3.subarray(0, data2.length)
            )
            return reject(Error(phase = -32)) unless compareArray(
              data1.subarray(data2.length)
              data3.subarray(data2.length)
            )
            return resolve(phase = -4)
          ).catch(=>
            return reject(Error(phase = -33))
          )
          phase = 1
        ).catch(reject)
      )

    it "1パケットで扱えない大きなデータを読み書きできること", ->
      data = new Uint8Array(0x40000)
      (data[x] = (x * 13 + 1) & 0xff) for x in [0...data.length]
      @test.title += " => #{data.length} bytes"
      Promise.resolve(
      ).then(=>
        return canarium.avm.write(SDRAM_BASE, data.buffer)
      ).then(=>
        return canarium.avm.read(SDRAM_BASE, data.length)
      ).then((read) =>
        read = new Uint8Array(read)
        return Promise.reject(Error("unmatch")) unless compareArray(data, read)
      )

  describe "RPC Client:", ->

    bson = new BSON()

    step "ボード側にテスト用プログラムを転送できること", ->
      promise = Promise.resolve(
      ).then(=>
        # CPU停止指示
        return canarium.avm.iowr(SWI_BASE, SWI_REG_RSTSTS, SWI_RESET_SET)
      ).then(=>
        # ELF読み込み
        return readTestData(path.join("#{SW_PREFIX}_rpcsrv", "test.elf"))
      ).then((buf) =>
        # sdramへの書き込み
        return loadElf(buf, canarium)
      ).then(=>
        # CPU開始指示
        return canarium.avm.iowr(SWI_BASE, SWI_REG_RSTSTS, SWI_RESET_CLEAR)
      )
      assert.isFulfilled(promise)

    describe "doCall():", ->

      step "メソッドが存在すること", ->
        assert.isFunction(canarium.rpcClient.doCall)

    describe "存在するメソッドの呼び出し(データ渡し):", ->
      input = null
      output = null

      step "呼び出しが成功すること(Object)", ->
        input = {foo: "bar", baz: 123}
        promise = canarium.rpcClient.doCall("echo", input, 100).then((result) =>
          output = result
        )
        assert.isFulfilled(promise)

      step "エコー応答が正しいこと", ->
        assert.deepEqual(input, output)

      step "呼び出しが成功すること(Array)", ->
        input = ["foo", "bar"]
        promise = canarium.rpcClient.doCall("echo", input, 100).then((result) =>
          output = result
        )
        assert.isFulfilled(promise)

      step "エコー応答が正しいこと(元のArray相当のObject)", ->
        count = 0
        for k, v of output
          count += 1
          assert.equal(v, input[k])
        assert.equal(count, input.length)

      it "呼び出しがTypeErrorで失敗すること(undefined)", ->
        promise = canarium.rpcClient.doCall("echo", undefined, 100)
        assert.isRejected(promise, TypeError)

      it "呼び出しがTypeErrorで失敗すること(null)", ->
        promise = canarium.rpcClient.doCall("echo", null, 100)
        assert.isRejected(promise, TypeError)

      it "呼び出しがTypeErrorで失敗すること(number)", ->
        promise = canarium.rpcClient.doCall("echo", 123, 100)
        assert.isRejected(promise, TypeError)

      it "呼び出しがTypeErrorで失敗すること(boolean)", ->
        promise = canarium.rpcClient.doCall("echo", true, 100)
        assert.isRejected(promise, TypeError)

      it "呼び出しがTypeErrorで失敗すること(string)", ->
        promise = canarium.rpcClient.doCall("echo", "hoge", 100)
        assert.isRejected(promise, TypeError)

      it "呼び出しがTypeErrorで失敗すること(Date)", ->
        promise = canarium.rpcClient.doCall("echo", new Date(), 100)
        assert.isRejected(promise, TypeError)

      it "呼び出しがTypeErrorで失敗すること(Error)", ->
        promise = canarium.rpcClient.doCall("echo", new Error("test"), 100)
        assert.isRejected(promise, TypeError)

      it "呼び出しがTypeErrorで失敗すること(RegExp)", ->
        promise = canarium.rpcClient.doCall("echo", /hoge/, 100)
        assert.isRejected(promise, TypeError)

    describe "存在するメソッドの呼び出し(関数渡し):", ->
      input = null
      output = null
      cbthis = null
      progress = ""

      step "最大データサイズで呼び出しが成功すること", ->
        test = @test
        promise = canarium.rpcClient.doCall("echo", ((size) -> # =>にしない
          test.title += " => #{size} bytes"
          cbthis = this
          progress += "c"

          input = {baz: "foo", bar: 456}
          addlen = size - bson.calculateObjectSize(input)
          input.baz += "x".repeat(addlen)
          return input
        ), 100).then((result) =>
          progress += "f"
          output = result
        )
        assert.isFulfilled(promise)

      step "呼び出しが成功する前に、データ生成関数が1回だけ呼ばれていること", ->
        assert.equal(progress, "cf")

      step "データ生成関数がグローバルオブジェクトをthisとして呼ばれていること", ->
        assert.equal(global, cbthis)

      step "エコー応答が正しいこと", ->
        assert.deepEqual(input, output)

      step "データ生成関数が例外を発生すると、その例外がそのまま呼び出し結果となること", ->
        msg = "TestError123456"
        promise = canarium.rpcClient.doCall("echo", ((size) ->
          throw Error(msg)
        ), 100)
        assert.isRejected(promise, Error, msg)

      step "最大データサイズ超過で呼び出しが失敗すること", ->
        promise = canarium.rpcClient.doCall("echo", ((size) =>
          @test.title += " => #{size}+1 bytes"

          input = {baz: "foo", bar: 456}
          addlen = size - bson.calculateObjectSize(input)
          input.baz += "x".repeat(addlen) + "!"
          return input
        ), 100)
        assert.isRejected(promise, Error, "Request data is too large")

    describe "存在しないメソッドの呼び出し(データ渡し):", ->

      step "呼び出しがENOSYSで失敗すること", ->
        promise = canarium.rpcClient.doCall("foobar", {foo: 123}, 100)
        assert.isRejected(promise, Canarium.RemoteError, "ENOSYS:")

    describe "複数の呼び出しの同時実行:", ->
      promise1 = null
      promise2 = null
      progress = ""

      step "2つの呼び出しを連続でキューして、2つとも成功すること", ->
        promise1 = canarium.rpcClient.doCall("wait", ((size) =>
          progress += "a"
          return {foo: 123}
        ), 100).then(=>
          progress += "1"
        )
        promise2 = canarium.rpcClient.doCall("echo", ((size) =>
          progress += "b"
          return {bar: 456}
        ), 100).then(=>
          progress += "2"
        )
        assert.isFulfilled(promise1.then(=> return promise2))

      step "2つめの呼び出しは、1つめの呼び出しが完了する前にキューできていること", ->
        assert.match(progress, /^ab(12|21)$/)

  describe "close():", ->
    cb = 0

    step "PERIDOTからの切断に成功すること", ->
      canarium.onClosed = (=> ++cb)
      assert.isFulfilled(canarium.close())

    step "切断後は切断時コールバックが1回呼び出されていること", ->
      assert.equal(cb, 1)

    step "切断後は未接続状態になっていること", ->
      assert.isFalse(canarium.connected)

    step "切断済みの状態で再度切断を試みても失敗し、エラー(Not connected)を返すこと", ->
      cb = 0
      assert.isRejected(canarium.close(), Error, "Not connected")

    step "切断失敗時は切断時コールバックが呼び出されていないこと", ->
      assert.equal(cb, 0)

  describe "configured:", ->
    cb = 0

    step "再度PERIDOTに接続できること", ->
      assert.isFulfilled(canarium.open(dev_path))

    step "接続直後からコンフィグレーション済みと認識されていること", ->
      assert.isTrue(canarium.configured)

    step "PERIDOTからの切断に成功すること", ->
      canarium.onClosed = (=> ++cb)
      assert.isFulfilled(canarium.close())

    step "切断後は切断時コールバックが1回呼び出されていること", ->
      assert.equal(cb, 1)

describe "ClassicボードのASモード接続:", ->
  canarium = null

  before ->
    canarium = new Canarium()
    confirm(@, """
    PERIDOT ClassicのスイッチをASモードに切り替えてから、
    ボード上のリセットスイッチを押して下さい。
    """)

  describe "open():", ->
    step "接続に成功すること", ->
      assert.isFulfilled(canarium.open(dev_path))

  describe "configured:", ->
    step "コンフィグレーションが完了状態になっていること", ->
      assert.isTrue(canarium.configured)

  describe "ボードの自動切断検知:", ->
    cb = 0

    before ->
      canarium.onClosed = (=> ++cb)
      confirm(@, "PERIDOTボードをPCから切断してください")

    step "自動的に未接続状態に移行していること", ->
      @timeout(3000)
      return new Promise((resolve) =>
        setTimeout(resolve, 1000)
      ).then(=>
        assert.isFalse(canarium.connected)
      )

    step "切断時のコールバックが1回呼び出されていること", ->
      assert.equal(cb, 1)

