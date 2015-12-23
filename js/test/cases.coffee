c = null
new ChromeAppTest("Canarium Test", (c = new Canarium()).version).setup(->
  dev_prescan = []
  dev_ignore = []
  dev_test = []
  dump = (arg) ->
    a = if arg instanceof Uint8Array then arg else new Uint8Array(arg)
    "[" + (("0x"+("0"+i.toString(16)).substr(-2)) for i in a).join(", ") + "]"
  @add(
    category: "環境整備(手動操作)"
    description: "PERIDOT以外のシリアル通信デバイスを確認"
    setup: (callback) ->
      chrome.serial.getDevices((ports) =>
        @prompt("PERIDOT<u>以外</u>のデバイスに✔を入れてから[PASS]をクリックしてください")
        for port in ports
          @print("""
          <label><input type="checkbox" id="dev-#{port.path}" checked />
          displayName:"#{port.displayName}", path:"#{port.path}"
          </label>
          """)
          dev_prescan.push("#{port.path}")
        if ports.length == 0
          @print("- デバイス無し")
        callback(@PASS)
      )
    epilogue: (callback) ->
      for path in dev_prescan
        if $("#dev-#{path}").prop("checked")
          dev_ignore.push(path)
        $("#dev-#{path}").prop("disabled", true)
      callback(@PASS)
  )
  @add(
    category: "環境整備(手動操作)"
    description: "全PERIDOTを切断する"
    setup: (callback) ->
      @prompt("全てのPERIDOTデバイスを切断してから[PASS]をクリックしてください")
      callback(@PASS)
    epilogue: (callback) ->
      chrome.serial.getDevices((ports) =>
        found = []
        for port in ports
          if port.path not in dev_ignore
            found.push(port.path)
        if found.length > 0
          @print("PERIDOTデバイスが切断されていません")
          return callback(@FAIL)
        callback(@PASS)
      )
  )
  @add(
    category: "列挙(正常系)"
    description: "PERIDOT接続無しのデバイス列挙"
    body: (callback) ->
      Canarium.enumerate((result, devices) =>
        unless result
          @print("列挙に失敗しました")
          return callback(@FAIL)
        for dev in devices
          if dev.path not in dev_ignore
            @print("想定外のデバイスが検出されました:#{dev}")
            return callback(@FAIL)
        callback(@PASS)
      )
  )
  @add(
    category: "環境整備(手動操作)"
    description :"PERIDOT(PSモード)を1台だけ接続する"
    setup: (callback) ->
      @prompt("スイッチを<u>PSモードにした</u>PERIDOTを<u>1台だけ</u>" +
              "接続してから[PASS]をクリックしてください")
      callback(@PASS)
  )
  @add(
    category: "列挙(正常系)"
    description: "PERIDOT接続有りのデバイス列挙"
    body: (callback) ->
      Canarium.enumerate((result, devices) =>
        unless result
          @print("列挙に失敗しました")
          return callback(@FAIL)
        found = []
        for dev in devices
          if dev.path not in dev_ignore
            found.push("#{dev.path}")
            @print("- name:\"#{dev.name}\", path:\"#{dev.path}\"")
        if found.length < 1
          @print("デバイスが検出されませんでした")
          return callback(@FAIL)
        if found.length > 1
          @print("デバイスが2つ以上検出されました")
          return callback(@FAIL)
        dev_test.push(found[0])
        callback(@PASS)
      )
  )
  @add(
    category: "接続(異常系)"
    description: "存在しないデバイスに対する接続"
    body: (callback) ->
      (c = new Canarium()).open("/non_existing_device", (result) =>
        return callback(@FAIL) if result
        callback(@PASS)
      )
  )
  cid = null
  @add(
    category: "接続(異常系)"
    description: "他のアプリケーションが排他接続済みのデバイスに対する接続"
    setup: (callback) ->
      return callback(@FAIL) unless dev_test[0]
      chrome.serial.connect(
        dev_test[0]
        {bitrate: 115200}
        (cinfo) =>
          return callback(@FAIL) unless cinfo
          cid = cinfo.connectionId
          callback(@PASS)
      )
    body: (callback) ->
      (c = new Canarium()).open(dev_test[0], (result) =>
        return callback(@FAIL) if result
        callback(@PASS)
      )
    epilogue: (callback) ->
      return callback(@PASS) unless cid
      chrome.serial.disconnect(cid, (result) =>
        return callback(@FAIL) unless result
        callback(@PASS)
      )
  )
  @add(
    category: "ベースレイヤ接続(正常系)"
    description: "PERIDOTへ接続(BaseCommのみ)"
    setup: (callback) ->
      if dev_test[0]
        c = new Canarium()
        callback(@PASS)
      else
        c = null
        callback(@FAIL)
    body: (callback) ->
      c._base.connect(dev_test[0]).then(=>
        callback(@PASS)
      ).catch(=>
        c = null
        callback(@FAIL)
      )
  )
  @add(
    category: "ベースレイヤ接続(異常系)"
    description: "接続済みのPERIDOTへ多重接続(BaseCommのみ)"
    setup: (callback) ->
      callback(if c then @PASS else @FAIL)
    body: (callback) ->
      c._base.connect(dev_test[0]).then(=>
        callback(@FAIL)
      ).catch(=>
        callback(@PASS)
      )
  )
  @add(
    category: "I2C通信(正常系)"
    description: "I2C通信でEEPROMからデータを読み出す"
    setup: (callback) ->
      callback(if c then @PASS else @FAIL)
    body: (callback) ->
      c._eepromRead(0x00, 4).then((readdata) =>
        a = new Uint8Array(readdata)
        @print(dump(a))
        if a[0] == 0x4a and a[1] == 0x37 and a[2] == 0x57
          return callback(@PASS)
        callback(@FAIL)
      ).catch((error) =>
        @print("読み出し失敗(#{error})")
        return callback(@FAIL)
      )
  )
  @add(
    category: "ベースレイヤ切断(正常系)"
    description: "PERIDOTから切断(BaseCommのみ)"
    setup: (callback) ->
      callback(if c then @PASS else @FAIL)
    body: (callback) ->
      c._base.disconnect().then(=>
        callback(@PASS)
      ).catch(=>
        callback(@FAIL)
      )
  )
  @add(
    category: "ベースレイヤ切断(異常系)"
    description: "切断済みのPERIDOTから多重切断(BaseCommのみ)"
    setup: (callback) ->
      callback(if c then @PASS else @FAIL)
    body: (callback) ->
      c._base.disconnect().then(=>
        callback(@FAIL)
      ).catch(=>
        callback(@PASS)
      )
  )
  @add(
    category: "接続(正常系)"
    description: "PERIDOTに接続"
    setup: (callback) ->
      callback(if c then @PASS else @FAIL)
    body: (callback) ->
      c.open(dev_test[0], (result) =>
        callback(if result then @PASS else @FAIL)
      )
  )
  @add(
    category: "接続(異常系)"
    description: "接続済みのPERIDOTに多重接続"
    setup: (callback) ->
      callback(if c then @PASS else @FAIL)
    body: (callback) ->
      c.open(dev_test[0], (result) =>
        callback(if result then @FAIL else @PASS)
      )
  )
  binfo = {}
  @add(
    category: "ボード情報(正常系)"
    description: "I2C通信でEEPROMからボード情報を読み出す"
    setup: (callback) ->
      callback(if c then @PASS else @FAIL)
    body: (callback) ->
      c.getinfo((result) =>
        @print(JSON.stringify(c.boardInfo))
        unless result
          @print("読み出し失敗")
          return callback(@FAIL)
        binfo.id = c.boardInfo.id
        binfo.serialcode = c.boardInfo.serialcode
        callback(@PASS)
      )
  )
  rbf = null
  RBF_PATH      = "testsuite.rbf"
  SYSID_BASE    = 0x10000000
  SYSID_ID      = 0xa0140807
  IPL_MEM_BASE  = 0x0f000000
  IPL_MEM_SIZE  = 16384
  @add(
    category: "コンフィグ(正常系)"
    description: "RBFファイルを用いてコンフィグレーション実行(ボード制限無し)"
    setup: (callback) ->
      callback(if c then @PASS else @FAIL)
    prologue: (callback) ->
      xhr = new XMLHttpRequest
      xhr.open("GET", chrome.runtime.getURL(RBF_PATH))
      xhr.responseType = "arraybuffer"
      xhr.onload = =>
        return unless xhr.status == 200
        rbf = xhr.response.slice(0)
        callback(@PASS)
      xhr.onerror = (=> callback(@FAIL))
      xhr.send()
    body: (callback) ->
      c.config(null, rbf, (result) =>
        callback(if result then @PASS else @FAIL)
      )
  )
  @add(
    category: "コンフィグ(異常系)"
    description: "RBFファイルを用いてコンフィグレーション実行(対象外ボード)"
    setup: (callback) ->
      callback(if c and rbf then @PASS else @FAIL)
    body: (callback) ->
      c.config({id: "#{binfo.id}X", serialcode: binfo.serialcode}, rbf, (result) =>
        callback(if result then @FAIL else @PASS)
      )
  )
  @add(
    category: "コンフィグ(異常系)"
    description: "RBFファイルを用いてコンフィグレーション実行(対象外シリアルコード)"
    setup: (callback) ->
      callback(if c and rbf then @PASS else @FAIL)
    body: (callback) ->
      c.config({id: binfo.id, serialcode: "#{binfo.serialcode}X"}, rbf, (result) =>
        callback(if result then @FAIL else @PASS)
      )
  )
  @add(
    category: "コンフィグ(正常系)"
    description: "RBFファイルを用いてコンフィグレーション実行(対象ボード)"
    setup: (callback) ->
      callback(if c and rbf then @PASS else @FAIL)
    body: (callback) ->
      c.config({id: binfo.id}, rbf, (result) =>
        callback(if result then @PASS else @FAIL)
      )
  )
  @add(
    category: "コンフィグ(正常系)"
    description: "RBFファイルを用いてコンフィグレーション実行(対象シリアルコード)"
    setup: (callback) ->
      callback(if c and rbf then @PASS else @FAIL)
    body: (callback) ->
      c.config({serialcode: binfo.serialcode}, rbf, (result) =>
        callback(if result then @PASS else @FAIL)
      )
  )
  @add(
    category: "コンフィグ(正常系)"
    description: "RBFファイルを用いてコンフィグレーション実行(対象ボードかつ対象シリアルコード)"
    setup: (callback) ->
      callback(if c and rbf then @PASS else @FAIL)
    body: (callback) ->
      c.config({id: binfo.id, serialcode: binfo.serialcode}, rbf, (result) =>
        callback(if result then @PASS else @FAIL)
      )
  )
  @add(
    category: "AVM通信(正常系)"
    description: "sysidを読み取り(IORD)"
    setup: (callback) ->
      callback(if c then @PASS else @FAIL)
    body: (callback) ->
      c.avm.iord(SYSID_BASE, 0).then((id) =>
        @print("sysid.id = 0x#{(id+0x100000000).toString(16)[-8..-1]}")
        callback(if (id|0) == (SYSID_ID|0) then @PASS else @FAIL)
      ).catch(=>
        callback(@FAIL)
      )
  )
  SCRATCH_BASE  = (IPL_MEM_BASE + IPL_MEM_SIZE - 4)
  SCRATCH_MAGIC = 0xcafebabe
  @add(
    category: "AVM通信(正常系)"
    description: "スクラッチ領域を書き込み(IOWR) & ベリファイ(IORD)"
    setup: (callback) ->
      callback(if c then @PASS else @FAIL)
    body: (callback) ->
      c.avm.iowr(SCRATCH_BASE, 0, SCRATCH_MAGIC).then(=>
        return c.avm.iord(SCRATCH_BASE, 0)
      ).then((compare) =>
        @print("scratch = 0x#{(compare+0x100000000).toString(16)[-8..-1]}")
        callback(if (compare|0) == (SCRATCH_MAGIC|0) then @PASS else @FAIL)
      ).catch(=>
        callback(@FAIL)
      )
  )
  @add(
    category: "リセット(正常系)"
    description: "リセット実行"
    setup: (callback) ->
      callback(if c then @PASS else @FAIL)
    body: (callback) ->
      c.reset((result, response) =>
        @print("response = 0x#{response.toString(16)}") if result
        callback(if result then @PASS else @FAIL)
      )
  )
  @add(
    category: "AVM通信(正常系)"
    description: "スクラッチ領域読み込み(IORD)によるリセット動作確認"
    setup: (callback) ->
      callback(if c then @PASS else @FAIL)
    body: (callback) ->
      c.avm.iord(SCRATCH_BASE, 0).then((compare) =>
        @print("scratch = 0x#{(compare|0x100000000).toString(16)[-8..-1]}")
        callback(if (compare|0) != (SCRATCH_MAGIC|0) then @PASS else @FAIL)
      ).catch(=>
        callback(@FAIL)
      )
  )
  @add(
    category: "切断(正常系)"
    description: "PERIDOTから切断"
    setup: (callback) ->
      callback(if c then @PASS else @FAIL)
    body: (callback) ->
      c.close((result) =>
        callback(if result then @PASS else @FAIL)
      )
  )
  @add(
    category: "切断(異常系)"
    description: "切断済みのPERIDOTから多重切断"
    setup: (callback) ->
      callback(if c then @PASS else @FAIL)
    body: (callback) ->
      c.close((result) =>
        callback(if result then @FAIL else @PASS)
      )
  )
  @start()
)
