assert = require("assert")
manual = require("./manual")
KEEP_CONNECTED = true # PERIDOTを切断せずにテストする(テストのテスト用)

if chrome?.runtime?
  # Chrome用初期化
  Canarium = window?.Canarium
  it.chrome = it
  it.nodejs = (t, f) -> it.skip(t + " (NodeJSのみ)", f)
  loadFile = (f) ->
    return new Promise((resolve, reject) ->
      xhr = new XMLHttpRequest
      xhr.open("GET", chrome.runtime.getURL("file/#{f}"))
      xhr.responseType = "arraybuffer"
      xhr.onload = ->
        return unless xhr.status == 200
        resolve(xhr.response.slice(0))
      xhr.onerror = reject
      xhr.send()
    )
else
  # NodeJS用初期化
  Canarium = [require][0]("../canarium.js").Canarium
  it.chrome = (t, f) -> it.skip(t + " (Chromeのみ)", f)
  it.nodejs = it
  fs = require("fs")
  loadFile = (f) ->
    return Promise.resolve().then(->
      return new Uint8Array(fs.readFileSync(f)).buffer
    )

canarium = null
expect_not_connected = [
  (e) -> Promise.reject(e)
  (e) -> assert.equal(e?.message, "Not connected")
]
array_match = (a1, a2) ->
  return false unless a1.length == a2.length
  for v, i in a1
    return false unless v == a2[i]
  return true
ign_devs = null
per_devs = null

describe "Canarium @ 未接続", ->
  @timeout(100)

  it "クラスが存在すること", ->
    assert.equal(typeof(Canarium), "function")

  describe ".enumerate()", ->
    it "クラス関数が存在すること", ->
      assert.equal(typeof(Canarium.enumerate), "function")

  it "インスタンスが生成可能であること", ->
    canarium = new Canarium

  it "プロパティ version を持ち、適切な書式の文字列であること", ->
    @test.title += " => \"#{version = canarium.version}\""
    assert(version?.match(/^\d+\.\d+\.\d+$/))

  it "プロパティ avm を持つこと", ->
    assert(canarium.avm?)

  describe "#close()", ->
    it "関数が存在すること", ->
      assert.equal(typeof(canarium.close), "function")

    it "未接続時に呼び出すとエラー(Not connected)を返すこと", ->
      canarium.close().then(expect_not_connected...)

  describe "#config()", ->
    it "関数が存在すること", ->
      assert.equal(typeof(canarium.config), "function")

    it "未接続時に呼び出すとエラー(Not connected)を返すこと", ->
      canarium.config(null, new ArrayBuffer(0)).then(expect_not_connected...)

  describe "#getinfo()", ->
    it "関数が存在すること", ->
      assert.equal(typeof(canarium.getinfo), "function")

    it "未接続時に呼び出すとエラー(Not connected)を返すこと", ->
      canarium.getinfo().then(expect_not_connected...)

  describe "#open()", ->
    it "関数が存在すること", ->
      assert.equal(typeof(canarium.open), "function")

  describe "#reset()", ->
    it "関数が存在すること", ->
      assert.equal(typeof(canarium.reset), "function")

    it "未接続時に呼び出すとエラー(Not connected)を返すこと", ->
      canarium.reset().then(expect_not_connected...)

describe "Canarium#avm @ 未接続", ->
  @timeout(100)

  describe "#iord()", ->
    it "関数が存在すること", ->
      assert.equal(typeof(canarium.avm.iord), "function")

    it "未接続時に呼び出すとエラー(Not connected)を返すこと", ->
      canarium.avm.iord(0, 0).then(expect_not_connected...)

  describe "#iord()", ->
    it "関数が存在すること", ->
      assert.equal(typeof(canarium.avm.iowr), "function")

    it "未接続時に呼び出すとエラー(Not connected)を返すこと", ->
      canarium.avm.iowr(0, 0, 0).then(expect_not_connected...)

  describe "#option()", ->
    it "関数が存在すること", ->
      assert.equal(typeof(canarium.avm.option), "function")

    it "未接続時に呼び出すとエラー(Not connected)を返すこと", ->
      canarium.avm.option({}).then(expect_not_connected...)

  describe "#read()", ->
    it "関数が存在すること", ->
      assert.equal(typeof(canarium.avm.read), "function")

    it "未接続時に呼び出すとエラー(Not connected)を返すこと", ->
      canarium.avm.read(0, 1).then(expect_not_connected...)

  describe "#write()", ->
    it "関数が存在すること", ->
      assert.equal(typeof(canarium.avm.write), "function")

    it "未接続時に呼び出すとエラー(Not connected)を返すこと", ->
      canarium.avm.write(0, new ArrayBuffer(1)).then(expect_not_connected...)

    it "コールバック関数が例外をスローしたとき、多重呼び出しが発生しないこと", ->
      new Promise((resolve, reject) =>
        @timeout(2000)
        count = 0
        @test.title += " =>"
        Canarium.enumerate((result) =>
          ++count
          @test.title += " #{count}回目=#{result}"
          if count == 1 and result
            setTimeout(resolve, 200)
            throw Error("exception")
          else
            reject()
        )
      )

describe "Canarium @ PSモード接続", ->

  it "(手動操作) 全PERIDOTの切断", ->
    manual.confirm(@, "PERIDOTが接続されていれば、全て切断してください")

  it "全シリアル接続デバイスの確認", ->
    Canarium.enumerate().then((devices) =>
      ign_devs = {}
      if KEEP_CONNECTED
        @test.title += " => KEEP_CONNECTEDが有効なため、PERIDOT接続済みと想定して続行"
      else
        ign_devs[dev.path] = true for dev in devices
        @test.title += " => #{devices.length}個のシリアルデバイスを検出"
      return
    )

  it "(手動操作) PERIDOTの接続 [PSモード、1台のみ]", ->
    manual.confirm(@, "PERIDOTをPSモードに設定し、1台だけ接続してください")

  describe ".enumerate()", ->
    dev_info = null

    it "PERIDOTを1台検出できること", ->
      Canarium.enumerate().then((devices) =>
        per_devs = []
        for dev in devices when !ign_devs[dev.path]
          per_devs.push(dev.path)
          dev_info or= dev
        num = per_devs.length
        @test.title += " => #{num}台のPERIDOTを検出"
        return Promise.reject("PERIDOTが検出できませんでした") if num == 0
        return Promise.reject("検出されたPERIDOTの台数が多すぎます") if num > 1
        return
      )

    it.chrome "Vendor ID および Product ID が取得できること", ->
      console.log(dev_info)
      assert(!isNaN(v = parseInt(dev_info.vendorId)))
      assert(!isNaN(p = parseInt(dev_info.productId)))
      @test.title += " => VID:0x#{v.toString(16)},PID:0x#{p.toString(16)}"

  describe ".BaseComm", ->
    describe "#connect()", ->
      it "接続に成功すること", ->
        canarium._base.connect(per_devs[0])

      it "接続成功後は接続状態になっていること", ->
        assert(canarium._base.connected)

      it "多重接続に失敗し、エラー(Already connected)を返すこと", ->
        canarium._base.connect(per_devs[0]).then(
          (e) => Promise.reject(e)
          (e) => assert(e?.message, "Already connected")
        )

      it "多重接続失敗後は接続状態のままになっていること", ->
        assert(canarium._base.connected)

      it "切断に成功すること", ->
        canarium._base.disconnect()

      it "切断後は未接続状態になっていること", ->
        assert(!canarium._base.connected)

  describe "#open()", ->
    it "存在しないデバイスに接続するとエラーを返すこと", ->
      canarium.open("non_existent_path").then(
        (e) => Promise.reject(e)
        (e) => assert(e instanceof Error)
      )

    it "接続エラー後は未接続状態になっていること", ->
      assert(!canarium.connected)

    it.chrome "他のアプリケーションが排他接続済みの場合には失敗すること", ->
      # NodeJSでは排他が出来ないので、Chromeのみのテスト項目とする
      @timeout(5000)
      sw = new Canarium.BaseComm.SerialWrapper(per_devs[0], {})
      return sw.open().then(=>
        return canarium.open(per_devs[0]).then(
          (e) => Promise.reject(e)
          (e) => @test.title += " => #{e}"
        )
      ).then(=>
        return sw.close()
      )

    it.chrome "接続エラー後は未接続状態になっていること", ->
      assert(!canarium.connected)

    it "接続に成功すること", ->
      canarium.open(per_devs[0])

    it "接続成功後は接続状態になっていること", ->
      assert(canarium.connected)

    it "多重接続に失敗し、エラー(Already connected)を返すこと", ->
      canarium.open(per_devs[0]).then(
        (e) => Promise.reject(e)
        (e) => assert(e?.message, "Already connected")
      )

    it "多重接続失敗後は接続状態のままになっていること", ->
      assert(canarium.connected)

  describe "#_eepromRead()", ->
    it "EEPROMからIDが読み出せること", ->
      canarium._eepromRead(0x00, 4).then((readdata) =>
        a = new Uint8Array(readdata)
        b = (("0x" + "0#{v.toString(16)}".substr(-2)) for v in a).join(", ")
        @test.title += " => [#{b}]"
        return if a[0] == 0x4a and a[1] == 0x37 and a[2] == 0x57
        return Promise.reject("EEPROM内のIDが不正(#{a})")
      )

  # https://github.com/osafune/peridot/tree/master/fpga/peridot_testsuite
  RBF_PATH      = "testsuite.rbf"
  IPL_MEM_BASE  = 0x0f000000
  IPL_MEM_SIZE  = 0x00004000
  SYSID_BASE    = 0x10000000
  SYSID_ID      = 0xa0140807
  SDRAM_BASE    = 0x00000000
  SDRAM_SIZE    = 0x00800000
  RESETCTL_BASE = 0x0fff0000
  SCRATCH_BASE  = (IPL_MEM_BASE + IPL_MEM_SIZE - 4)
  SCRATCH_MAGIC = 0xcafebabe

  describe "コンフィグレーション", ->
    rbf = null
    binfo = null

    it "(非テスト) RBFデータの読み込みが完了すること", ->
      @timeout(0)
      return loadFile(RBF_PATH).then((data) =>
        rbf = data
        @test.title += " => #{rbf.byteLength} bytes"
        return
      )

    it "コンフィグレーション状態が未完了になっていること", ->
      assert(!canarium.configured)

    it "ボード情報が読み出せること", ->
      @timeout(4000)
      return canarium.getinfo().then((info) =>
        return Promise.reject() unless info?
        binfo = info
        @test.title += " => {id: \"#{info.id}\", serialcode: \"#{info.serialcode}\"}"
        return
      )

    it "ボード制限なしのコンフィグレーションが成功すること", ->
      @timeout(3000)
      return canarium.config(null, rbf)

    it "コンフィグレーション状態が完了になっていること", ->
      assert(canarium._base.configured)

    it "対象外ボードIDのコンフィグレーションがエラー(Board ID mismatch)で失敗すること", ->
      return canarium.config({id: "#{binfo.id}X", serialcode: binfo.serialcode}, rbf).then(
        (e) => Promise.reject(e)
        (e) => assert.equal(e?.message, "Board ID mismatch")
      )

    it "対象外シリアルコードのコンフィグレーションがエラー(Board serial code mismatch)で失敗すること", ->
      return canarium.config({id: binfo.id, serialcode: "#{binfo.serialcode}X"}, rbf).then(
        (e) => Promise.reject(e)
        (e) => assert.equal(e?.message, "Board serial code mismatch")
      )

    it "対象ボードIDのコンフィグレーションが成功すること", ->
      @timeout(3000)
      return canarium.config({id: binfo.id}, rbf)

    it "対象シリアルコードのコンフィグレーションが成功すること", ->
      @timeout(3000)
      return canarium.config({serialcode: binfo.serialcode}, rbf)

  describe "#avm", ->
    for byte in [0x3a, 0x3d, 0x7a, 0x7b, 0x7c, 0x7d]
      text = "0x#{byte.toString(16)}"
      it "エスケープシーケンスに使われる文字(#{text})を正しく読み書きできること", ->
        data = new Uint8Array(0x1000)
        (data[x] = byte) for x in [0...data.length]
        return canarium.avm.write(SDRAM_BASE, data.buffer).then(=>
          return canarium.avm.read(SDRAM_BASE, data.length)
        ).then((read) =>
          read = new Uint8Array(read)
          return Promise.reject() unless array_match(data, read)
        )

    it "sysidの読み取り(IORD)に成功すること", ->
      return canarium.avm.iord(SYSID_BASE, 0).then((id) =>
        @test.title += " => 0x#{(id+0x100000000).toString(16)[-8..-1]}"
        assert.equal((id|0), (SYSID_ID|0))
      )

    it "最上位ビットが1のデータを正の数としてリード(IORD)できること", ->
      return canarium.avm.iowr(SCRATCH_BASE, 0, 0xffffffff).then(=>
        return canarium.avm.iord(SCRATCH_BASE, 0)
      ).then((compare) =>
        @test.title += " => scratch:#{compare}"
        return Promise.reject() unless compare > 0
      )

    it "テスト領域の書き込み(IOWR)とベリファイ(IORD)に成功すること", ->
      return canarium.avm.iowr(SCRATCH_BASE, 0, SCRATCH_MAGIC).then(=>
        return canarium.avm.iord(SCRATCH_BASE, 0)
      ).then((compare) =>
        @test.title += " => scratch:0x#{(compare+0x100000000).toString(16)[-8..-1]}"
        return Promise.reject() unless (compare|0) == (SCRATCH_MAGIC|0)
      )

    it "リセット実行に成功すること", ->
      return canarium.reset().then((response) =>
        @test.title += " => response:0x#{response.toString(16)}"
      )

    it "テスト領域の読み込み(IORD)により、リセットしたことが確認できること", ->
      return canarium.avm.iord(SCRATCH_BASE, 0).then((compare) =>
        @test.title += " => scratch:0x#{(compare|0x100000000).toString(16)[-8..-1]}"
        return Promise.reject() unless (compare|0) != (SCRATCH_MAGIC|0)
      )

    it "Nios II プロセッサの停止指示に成功すること", ->
      return new Promise((resolve, reject) =>
        checkreset = =>
          return canarium.avm.iord(RESETCTL_BASE, 0).then((resettaken) =>
            return unless (resettaken & 1) == 1
            resolve()
          ).then(=>
            setTimeout(checkreset, 0)
          ).catch(reject)
        canarium.avm.iowr(RESETCTL_BASE, 0, 0x1).then(=>
          checkreset()
        ).catch(reject)
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
            return reject(Error(phase = -31)) unless array_match(
              data2
              data3.subarray(0, data2.length)
            )
            return reject(Error(phase = -32)) unless array_match(
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
        return Promise.reject(Error("unmatch")) unless array_match(data, read)
      )

    it "Nios II プロセッサの起動指示に成功すること", ->
      return canarium.avm.iowr(RESETCTL_BASE, 0, 0x0).then(=>
        return canarium.avm.iord(RESETCTL_BASE, 0)
      ).then((resettaken) =>
        return Promise.reject() unless (resettaken & 1) == 0
      )

  describe "#close()", ->
    cb = 0

    it "PERIDOTからの切断に成功すること", ->
      canarium.onClosed = (=> ++cb)
      return canarium.close()

    it "切断後は切断時コールバックが1回呼び出されていること", ->
      assert.equal(cb, 1)

    it "切断後は未接続状態になっていること", ->
      assert(!canarium.connected)

    it "切断済みの状態で再度切断を試みても失敗し、エラー(Not connected)を返すこと", ->
      cb = 0
      return canarium.close().then(expect_not_connected...)

    it "切断失敗時は切断時コールバックが呼び出されていないこと", ->
      assert.equal(cb, 0)

describe "Canarium @ ASモード接続", ->
  ign_devs = null
  per_devs = null

  it "(手動操作) PERIDOTの接続 [ASモード、1台のみ]", ->
    manual.confirm(@, "PERIDOTをASモードに切り替えてください")

  describe "#open()", ->
    it "接続に成功すること", ->
      canarium.open(per_devs[0])

  describe "コンフィグレーション", ->
    it "コンフィグレーションが完了状態になっていること", ->
      assert(canarium._base.configured)

describe "Canarium @ 自動切断検知", ->
  cb = 0

  it "接続済み状態であること", ->
    canarium.onClosed = (=> ++cb)
    assert(canarium.connected)

  it "(手動操作) PERIDOTの切断", ->
    manual.confirm(@, "PERIDOTを切断してください")

  it "自動的に未接続状態に移行していること", ->
    @timeout(3000)
    return new Promise((resolve) =>
      setTimeout(resolve, 1000)
    ).then(=>
      assert(!canarium.connected)
    )

  it "切断時のコールバックが1回呼び出されていること", ->
    assert.equal(cb, 1)

