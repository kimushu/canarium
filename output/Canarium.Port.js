Ext.data.JsonP.Canarium_Port({"tagname":"class","name":"Canarium.Port","autodetected":{},"files":[{"filename":"canarium.js","href":"canarium.html#Canarium-Port"}],"uses":["Canarium.HostComm"],"members":[{"name":"_hostComm","tagname":"property","owner":"Canarium.Port","id":"property-_hostComm","meta":{"private":true}},{"name":"_pollingInterval","tagname":"property","owner":"Canarium.Port","id":"property-_pollingInterval","meta":{"private":true}},{"name":"_portNumber","tagname":"property","owner":"Canarium.Port","id":"property-_portNumber","meta":{"private":true}},{"name":"pollingInterval","tagname":"property","owner":"Canarium.Port","id":"property-pollingInterval","meta":{"readonly":true}},{"name":"portNumber","tagname":"property","owner":"Canarium.Port","id":"property-portNumber","meta":{"readonly":true}},{"name":"verbosity","tagname":"property","owner":"Canarium.Port","id":"static-property-verbosity","meta":{"static":true}},{"name":"constructor","tagname":"method","owner":"Canarium.Port","id":"method-constructor","meta":{"protected":true}},{"name":"_log","tagname":"method","owner":"Canarium.Port","id":"method-_log","meta":{"private":true}},{"name":"processHostRead","tagname":"method","owner":"Canarium.Port","id":"method-processHostRead","meta":{"protected":true,"template":true}},{"name":"processHostWrite","tagname":"method","owner":"Canarium.Port","id":"method-processHostWrite","meta":{"protected":true,"template":true}}],"alternateClassNames":[],"aliases":{},"id":"class-Canarium.Port","component":false,"superclasses":[],"subclasses":["Canarium.Serial"],"mixedInto":[],"mixins":[],"parentMixins":[],"requires":[],"html":"<div><pre class=\"hierarchy\"><h4>Subclasses</h4><div class='dependency'><a href='#!/api/Canarium.Serial' rel='Canarium.Serial' class='docClass'>Canarium.Serial</a></div><h4>Uses</h4><div class='dependency'><a href='#!/api/Canarium.HostComm' rel='Canarium.HostComm' class='docClass'>Canarium.HostComm</a></div><h4>Files</h4><div class='dependency'><a href='source/canarium.html#Canarium-Port' target='_blank'>canarium.js</a></div></pre><div class='doc-contents'><p>PERIDOTボード ホスト通信ポート基底クラス</p>\n</div><div class='members'><div class='members-section'><h3 class='members-title icon-property'>Properties</h3><div class='subsection'><div class='definedBy'>Defined By</div><h4 class='members-subtitle'>Instance properties</h3><div id='property-_hostComm' class='member first-child not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.Port'>Canarium.Port</span><br/><a href='source/canarium.html#Canarium-Port-property-_hostComm' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.Port-property-_hostComm' class='name expandable'>_hostComm</a> : <a href=\"#!/api/Canarium.HostComm\" rel=\"Canarium.HostComm\" class=\"docClass\">Canarium.HostComm</a><span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'><p>ホスト通信クラスのインスタンス</p>\n</div><div class='long'><p>ホスト通信クラスのインスタンス</p>\n</div></div></div><div id='property-_pollingInterval' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.Port'>Canarium.Port</span><br/><a href='source/canarium.html#Canarium-Port-property-_pollingInterval' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.Port-property-_pollingInterval' class='name expandable'>_pollingInterval</a> : number<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'><p>ポーリング間隔(ms)</p>\n</div><div class='long'><p>ポーリング間隔(ms)</p>\n</div></div></div><div id='property-_portNumber' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.Port'>Canarium.Port</span><br/><a href='source/canarium.html#Canarium-Port-property-_portNumber' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.Port-property-_portNumber' class='name expandable'>_portNumber</a> : number<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'><p>ポート番号(0～65535)</p>\n</div><div class='long'><p>ポート番号(0～65535)</p>\n</div></div></div><div id='property-pollingInterval' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.Port'>Canarium.Port</span><br/><a href='source/canarium.html#Canarium-Port-property-pollingInterval' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.Port-property-pollingInterval' class='name expandable'>pollingInterval</a> : number<span class=\"signature\"><span class='readonly' >readonly</span></span></div><div class='description'><div class='short'><p>ポーリング間隔(ms)</p>\n</div><div class='long'><p>ポーリング間隔(ms)</p>\n</div></div></div><div id='property-portNumber' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.Port'>Canarium.Port</span><br/><a href='source/canarium.html#Canarium-Port-property-portNumber' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.Port-property-portNumber' class='name expandable'>portNumber</a> : number<span class=\"signature\"><span class='readonly' >readonly</span></span></div><div class='description'><div class='short'><p>ポート番号(0～65535)</p>\n</div><div class='long'><p>ポート番号(0～65535)</p>\n</div></div></div></div><div class='subsection'><div class='definedBy'>Defined By</div><h4 class='members-subtitle'>Static properties</h3><div id='static-property-verbosity' class='member first-child not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.Port'>Canarium.Port</span><br/><a href='source/canarium.html#Canarium-Port-static-property-verbosity' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.Port-static-property-verbosity' class='name expandable'>verbosity</a> : number<span class=\"signature\"><span class='static' >static</span></span></div><div class='description'><div class='short'>デバッグ出力の細かさ(0で出力無し) ...</div><div class='long'><p>デバッグ出力の細かさ(0で出力無し)</p>\n<p>Defaults to: <code>0</code></p></div></div></div></div></div><div class='members-section'><div class='definedBy'>Defined By</div><h3 class='members-title icon-method'>Methods</h3><div class='subsection'><div id='method-constructor' class='member first-child not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.Port'>Canarium.Port</span><br/><a href='source/canarium.html#Canarium-Port-method-constructor' target='_blank' class='view-source'>view source</a></div><strong class='new-keyword'>new</strong><a href='#!/api/Canarium.Port-method-constructor' class='name expandable'>Canarium.Port</a>( <span class='pre'>_hostComm, _portNumber, _pollingInterval</span> ) : <a href=\"#!/api/Canarium.Port\" rel=\"Canarium.Port\" class=\"docClass\">Canarium.Port</a><span class=\"signature\"><span class='protected' >protected</span></span></div><div class='description'><div class='short'>コンストラクタ ...</div><div class='long'><p>コンストラクタ</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>_hostComm</span> : <a href=\"#!/api/Canarium.HostComm\" rel=\"Canarium.HostComm\" class=\"docClass\">Canarium.HostComm</a><div class='sub-desc'><p>ホスト通信クラスのインスタンス</p>\n</div></li><li><span class='pre'>_portNumber</span> : number<div class='sub-desc'><p>ポート番号</p>\n</div></li><li><span class='pre'>_pollingInterval</span> : number<div class='sub-desc'><p>ポーリング間隔(ms)</p>\n</div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'><a href=\"#!/api/Canarium.Port\" rel=\"Canarium.Port\" class=\"docClass\">Canarium.Port</a></span><div class='sub-desc'>\n</div></li></ul></div></div></div><div id='method-_log' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.Port'>Canarium.Port</span><br/><a href='source/canarium.html#Canarium-Port-method-_log' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.Port-method-_log' class='name expandable'>_log</a>( <span class='pre'>lvl, func, msg, [data]</span> ) : undefined<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'>ログの出力 ...</div><div class='long'><p>ログの出力</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>lvl</span> : number<div class='sub-desc'><p>詳細度(0で常に出力。値が大きいほど詳細なメッセージを指す)</p>\n</div></li><li><span class='pre'>func</span> : string<div class='sub-desc'><p>関数名</p>\n</div></li><li><span class='pre'>msg</span> : string<div class='sub-desc'><p>メッセージ</p>\n</div></li><li><span class='pre'>data</span> : Object (optional)<div class='sub-desc'><p>任意のデータ</p>\n</div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'>undefined</span><div class='sub-desc'>\n</div></li></ul></div></div></div><div id='method-processHostRead' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.Port'>Canarium.Port</span><br/><a href='source/canarium.html#Canarium-Port-method-processHostRead' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.Port-method-processHostRead' class='name expandable'>processHostRead</a>( <span class='pre'>buffer</span> ) : Promise<span class=\"signature\"><span class='protected' >protected</span><span class='template' >template</span></span></div><div class='description'><div class='short'>ホストが読み込み(クライアント→ホスト) ...</div><div class='long'><p>ホストが読み込み(クライアント→ホスト)</p>\n      <div class='rounded-box template-box'>\n      <p>This is a <a href=\"#!/guide/components\">template method</a>.\n         a hook into the functionality of this class.\n         Feel free to override it in child classes.</p>\n      </div>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>buffer</span> : ArrayBuffer<div class='sub-desc'><p>転送要求データ</p>\n</div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'>Promise</span><div class='sub-desc'><p>Promiseオブジェクト</p>\n<ul><li><span class='pre'>PromiseValue</span> : number<div class='sub-desc'><p>読み込み完了したバイト数(resolve)またはエラーコード(reject)</p>\n</div></li></ul></div></li></ul></div></div></div><div id='method-processHostWrite' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.Port'>Canarium.Port</span><br/><a href='source/canarium.html#Canarium-Port-method-processHostWrite' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.Port-method-processHostWrite' class='name expandable'>processHostWrite</a>( <span class='pre'>length</span> ) : Promise<span class=\"signature\"><span class='protected' >protected</span><span class='template' >template</span></span></div><div class='description'><div class='short'>ホストが書き込み(ホスト→クライアント) ...</div><div class='long'><p>ホストが書き込み(ホスト→クライアント)</p>\n      <div class='rounded-box template-box'>\n      <p>This is a <a href=\"#!/guide/components\">template method</a>.\n         a hook into the functionality of this class.\n         Feel free to override it in child classes.</p>\n      </div>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>length</span> : number<div class='sub-desc'><p>要求バイト数</p>\n</div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'>Promise</span><div class='sub-desc'><p>Promiseオブジェクト</p>\n<ul><li><span class='pre'>PromiseValue</span> : ArrayBuffer/number<div class='sub-desc'><p>読み取ったデータ(resolve)またはエラーコード(reject)</p>\n</div></li></ul></div></li></ul></div></div></div></div></div></div></div>","meta":{}});