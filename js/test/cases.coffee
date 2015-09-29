new ChromeAppTest("Canarium Test", new Canarium().version).setup(->
  dev_prescan = []
  dev_ignore = []
  dev_test = []
  @add(
    category: "環境整備(手動操作)"
    description: "PERIDOT以外のシリアル通信デバイスを確認"
    setup: (callback) ->
      chrome.serial.getDevices((ports) =>
        @prompt("PERIDOT<u>以外</u>のデバイスに✔を入れてから[PASS]をクリックしてください")
        for port in ports
          @print("""
          <label><input type="checkbox" id="dev-#{port.path}" checked />
          displayName:#{port.displayName}, path:#{port.path}
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
    category: "列挙テスト(正常系)"
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
    description :"PERIDOTを1台だけ接続する"
    setup: (callback) ->
      @prompt("1台だけPERIDOTを接続してから[PASS]をクリックしてください")
      callback(@PASS)
  )
  @add(
    category: "列挙テスト(正常系)"
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
            @print("- name:#{dev.name}, path:#{dev.path}")
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
    category: "接続テスト(異常系)"
    description: "存在しないデバイスに対する接続"
    body: (callback) ->
      new Canarium().open("/non_existing_device", (result) =>
        return callback(@FAIL) if result
        callback(@PASS)
      )
  )
  cid = null
  @add(
    category: "接続テスト(異常系)"
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
      new Canarium().open(dev_test[0], (result) =>
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
    category: "接続テスト(正常系)"
    description: "PERIDOTへ接続"
    setup: (callback) ->
      callback(if dev_test[0] then @PASS else @FAIL)
    body: (callback) ->
      new Canarium().open(dev_test[0], (result) =>
        return callback(@FAIL) unless result
        callback(@PASS)
      )
  )
  @start()
)
