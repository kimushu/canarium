(if chrome?.runtime? then (->
  # Chrome
  div = document.createElement("div")
  div.innerHTML = """
  <ul id="mocha-confirm" style="position: fixed; top: 10px; left: 15px; font-size: 12px; z-index: 2;">
    <li style="background-color: #faa; padding: 10px; color: #222;">
      <a href="#">Click here or press 'N' key to proceed: <br><span></span></a>
    </li>
  </ul>
  """
  document.getElementById("mocha").appendChild(cfm = div.firstChild)
  rep = null
  exports.comeon = ->
    unless rep
      rep = document.getElementById("mocha-report")
    rep?.scrollTop = rep?.scrollHeight
  exports.confirm = (t, msg) ->
    t.timeout(0)
    exports.comeon()
    return new Promise((resolve, reject) ->
      msg = msg.replace(/</g, "&lt;")
      msg = msg.replace(/>/g, "&gt;")
      msg = msg.replace(/&/g, "&amp;")
      msg = msg.replace(/\n/g, "<br>")
      cfm.getElementsByTagName("span")[0].innerText = msg
      a = cfm.getElementsByTagName("a")[0]
      finish = ->
        a.onclick = null
        document.onkeydown = null
        cfm.hidden = true
        resolve()
      a.onclick = finish
      document.onkeydown = (event) ->
        if event.keyCode = 78
          finish()
          return false
        return true
      cfm.hidden = false
    )
) else (->
  # NodeJS
  exports.comeon = ->
    return
  exports.confirm = (t, msg) ->
    t.timeout(0)
    return new Promise((resolve, reject) ->
      process.stdout.write(msg + "\n") if msg?
      process.stdout.write("Press Enter to proceed:")
      reader = [require][0]("readline").createInterface({
        input: process.stdin
        output: process.stdout
      })
      reader.on("line", (line) ->
        resolve()
      )
    )
))()
