###*
@class
  Chrome App Test Framework
###
class ChromeAppTest
  PASS: 0
  FAIL: 1
  SKIP: 2

  TEST_INTERVAL = 200 # ms

  ###*
  @method
    Constructor
  @param {string} title
    The title of this test
  ###
  constructor: (@title, @version) ->
    @cases = [{
      category: "Test Entry"
      description: "[Test target version]<br/>#{@version or "unknown"}"
      setup: (callback) ->
        @print("[Chrome version]")
        @print(navigator.userAgent)
        chrome.runtime.getPlatformInfo((info) =>
          @print("[Platform info]")
          @print("arch:#{info.arch}, nacl_arch:#{info.nacl_arch}, os:#{info.os}")
          @prompt("Click [Start] button")
          callback(@PASS)
        )
      body: (callback) ->
        $("#pass").val(" START (1) ").prop("disabled", false).
          unbind("click").click(=> callback(@PASS))
      epilogue: (callback) ->
        $("#pass").val(" PASS (1) ").unbind("click")
        @print("Test started: #{new Date().toString()}")
        $("#res-0").html("STARTED")
        callback(@PASS)
    }]
    @index = null
    @phase = null
    @passed = []
    @failed = []
    @skipped = []
    @finished = false

  ###*
  @method
    Setup test cases
  @param {function} callback
    Callback called with binding this ChromeAppTest instance
  ###
  setup: (callback) ->
    callback.call(this)

  ###*
  @method
    Add test case
  @param {Object} c
    Test case definition
  @param {string} [c.category]
    Category
  @param {string} c.description
    Description
  @param {function(function(number))} [c.setup]
    Setup code
    (always executed)
  @param {function(function(number))} [c.prologue]
    Prologue code
    (skipped if user skips this test case)
  @param {function(function(number))} [c.body]
    Test body code
    (wait user's action if null)
    (skipped if user skips this test case)
    (dulation measured)
  @param {function(function(number))} [c.epilogue]
    Epilogue code
    (skipped if user skips this test case)
  @return {void}
  ###
  add: (c) ->
    @cases.push(c)
    return

  ###*
  @method
    Print message for prompt of current test case
  @param {string} html
    HTML string to append
  @return {Object}
    JQuery object
  ###
  prompt: (html) ->
    return if @index == null
    $("#desc-#{@index}").append("""
    <span class="prompt"><br/>&gt;&gt;&gt;&nbsp;#{html}&nbsp;&lt;&lt;&lt;</span>
    """)

  ###*
  @method
    Print message of current test case
  @param {string} html
    HTML string to append
  @return {Object}
    JQuery object
  ###
  print: (html) ->
    return if @index == null
    $("#desc-#{@index}").append("<br/>#{html or ""}")

  ###*
  @private
  @method
    Print table of all test cases
  ###
  _outputTable: ->
    $("title,#title").text(@title)
    $("#output").append("""
    <tr id="row-#{i}">
      <td class="align-center">#{if i > 0 then i else "---"}</td>
      <td><span id="cat-#{i}">#{c.category or "No category"}</span></td>
      <td><span id="desc-#{i}">#{c.description}</span></td>
      <td class="align-right"><span id="dul-#{i}"></span></td>
      <td class="align-center"><span id="res-#{i}"></span></td>
    </tr>
    """) for c, i in @cases
    i = @cases.length
    $("#output").append("""
    <tr id="row-#{i}">
      <td class="align-center">---</td>
      <td><span id="cat-#{i}">Test Exit</span></td>
      <td><span id="desc-#{i}">[Overall results]</td>
      <td class="align-right"><span id="dul-#{i}"></span></td>
      <td class="align-center"><span id="res-#{i}"></span></td>
    </tr>
    """)

  @_onLoad: []
  $(=>
    return unless @_onLoad
    onload = @_onLoad
    @_onLoad = null
    f() for f in onload
    $("#print").unbind("click").click(-> window.print())
    $("body").keydown((e) ->
      switch e.keyCode
        when 0x31 then $("#pass").click()
        when 0x32 then $("#fail").click()
        when 0x33 then $("#skip").click()
    )
  )

  ###*
  @method
    Start test
  @param {function(boolean)} callback
  Callback method called when test has finished or aborted
  ###
  start: (callback) ->
    if @index
      # This test has already started
      callback(false)
      return
    if @constructor._onLoad
      # The test should be started after document.onLoad
      @constructor._onLoad.push(=> @start(callback))
      return
    @_outputTable()
    record = (result, time) =>
      r = $("#row-#{@index}").removeClass("case-next").removeClass("case-testing")
      t = $("#res-#{@index}")
      p = ["<br/>(Setup)", "<br/>(By user)", "<br/>(Prologue)", ""][@phase]
      a = null
      switch result
        when @PASS
          r.addClass("case-passed")
          t.html("PASSED#{p}")
          a = @passed
        when @FAIL
          r.addClass("case-failed")
          t.html("FAILED#{p}")
          a = @failed
        when @SKIP
          r.addClass("case-skipped")
          t.html("SKIPPED#{p}")
          a = @skipped
      return if @index == 0 or @index >= @cases.length
      a.push(@index)
      $("#dul-#{@index}").text("#{time} ms") if time and @cases[@index].body
    pass = (callback) => callback(@PASS)
    warn = (message) -> console.log(message)
    next = =>
      $(".prompt").remove()
      @index += 1
      if @index >= @cases.length
        @finished = true
        tot = @cases.length - 1
        @print("Passed cases: #{@passed.length} / #{tot}")
        @print("Failed cases: #{@failed.length} / #{tot}")
        @print("Skipped cases: #{@skipped.length} / #{tot}")
        @print("Test finished: #{new Date().toString()}")
        r = $("#row-#{@index}").removeClass("case-next").removeClass("case-testing")
        t = $("#res-#{@index}")
        if @failed.length > 0
          r.addClass("case-failed")
          t.html("SOME TESTS<br/>FAILED")
        else if @skipped.length > 0
          r.addClass("case-skipped")
          t.html("SOME TESTS<br/>SKIPPED")
        else
          r.addClass("case-passed")
          t.html("ALL TESTS<br/>PASSED")
        return callback?(@failed.length == 0)
      window.setTimeout(exec, TEST_INTERVAL)
    bind = (pass, fail, skip) ->
      $("#pass").prop("disabled", !pass).unbind("click").click(pass or ->)
      $("#fail").prop("disabled", !fail).unbind("click").click(fail or ->)
      $("#skip").prop("disabled", !skip).unbind("click").click(skip or ->)
    wait = (callback) =>
      bind(
        => bind(); callback(@PASS)
        => bind(); callback(@FAIL)
        => bind(); callback(@SKIP)
      )
    step = (callback) =>
      if $("#onebyone").prop("checked")
        wait(callback)
      else
        callback(@PASS)
    phase = (n) =>
      @phase = n
      return if @phase == 1
      console.log("##{Array(80+1).join("-")}")
      console.log("# Test Case ##{@index} (#{["Setup", "", "Prologue", "Body", "Epilogue"][n]})")
    protect = (func, callback) =>
      try
        func.call(this, callback)
      catch error
        console.log({exception: error})
        @print("""
        <span class="exception">
        **** Exception occured: #{error.toString()} ****
        </span>
        """)
        callback(@FAIL)
    exec = =>
      $("#row-#{@index}").addClass("case-next")
      c = @cases[@index]
      phase(0)  # Setup
      $("#res-#{@index}").html("SETTING UP")
      protect(c.setup or pass, (res_setup) =>
        if res_setup != @PASS
          record(res_setup)
          return next()
        phase(1)  # User operation
        $("#res-#{@index}").html("WAITING USER")
        step((res_user) =>
          if res_user != @PASS
            record(res_user)
            return next()
          $("#row-#{@index}").removeClass("case-next").addClass("case-testing")
          $("#res-#{@index}").html("TESTING")
          phase(2)  # Prologue
          protect(c.prologue or pass, (res_pro) =>
            if res_pro != @PASS
              record(res_pro)
              return next()
            phase(3)  # Body
            startTime = window.performance.now()
            protect(c.body or wait, (res_body) =>
              record(res_body, parseInt(window.performance.now() - startTime))
              phase(4)  # Epilogue
              protect(c.epilogue or pass, (res_epi) =>
                if res_epi == @FAIL
                  warn("Some error has occured in epilogue of case ##{@index}")
                return next()
              ) # c.epilogue
            ) # c.body
          ) # c.prologue
        ) # step
      ) # c.setup
    @index = 0
    exec()

