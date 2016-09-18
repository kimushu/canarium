Ext.data.JsonP.Canarium_HostComm({"tagname":"class","name":"Canarium.HostComm","autodetected":{},"files":[{"filename":"canarium.js","href":"canarium.html#Canarium-HostComm"}],"uses":["Canarium.AvmTransactions","Canarium.Port"],"members":[{"name":"_avm","tagname":"property","owner":"Canarium.HostComm","id":"property-_avm","meta":{"private":true}},{"name":"_descs","tagname":"property","owner":"Canarium.HostComm","id":"property-_descs","meta":{"private":true}},{"name":"_ports","tagname":"property","owner":"Canarium.HostComm","id":"property-_ports","meta":{"private":true}},{"name":"_swiBase","tagname":"property","owner":"Canarium.HostComm","id":"property-_swiBase","meta":{"private":true}},{"name":"_timerId","tagname":"property","owner":"Canarium.HostComm","id":"property-_timerId","meta":{"private":true}},{"name":"_timerInterval","tagname":"property","owner":"Canarium.HostComm","id":"property-_timerInterval","meta":{"private":true}},{"name":"verbosity","tagname":"property","owner":"Canarium.HostComm","id":"static-property-verbosity","meta":{"static":true}},{"name":"constructor","tagname":"method","owner":"Canarium.HostComm","id":"method-constructor","meta":{"protected":true}},{"name":"_delegate","tagname":"method","owner":"Canarium.HostComm","id":"method-_delegate","meta":{"private":true}},{"name":"_log","tagname":"method","owner":"Canarium.HostComm","id":"method-_log","meta":{"private":true}},{"name":"_poll","tagname":"method","owner":"Canarium.HostComm","id":"method-_poll","meta":{"private":true}},{"name":"_raiseInterrupt","tagname":"method","owner":"Canarium.HostComm","id":"method-_raiseInterrupt","meta":{"private":true}},{"name":"_readDescriptor","tagname":"method","owner":"Canarium.HostComm","id":"method-_readDescriptor","meta":{"private":true}},{"name":"_readMessage","tagname":"method","owner":"Canarium.HostComm","id":"method-_readMessage","meta":{"private":true}},{"name":"_writeDescriptor","tagname":"method","owner":"Canarium.HostComm","id":"method-_writeDescriptor","meta":{"private":true}},{"name":"_writeMessage","tagname":"method","owner":"Canarium.HostComm","id":"method-_writeMessage","meta":{"private":true}},{"name":"registerPort","tagname":"method","owner":"Canarium.HostComm","id":"method-registerPort","meta":{"protected":true}}],"alternateClassNames":[],"aliases":{},"id":"class-Canarium.HostComm","component":false,"superclasses":[],"subclasses":[],"mixedInto":[],"mixins":[],"parentMixins":[],"requires":[],"html":"<div><pre class=\"hierarchy\"><h4>Uses</h4><div class='dependency'><a href='#!/api/Canarium.AvmTransactions' rel='Canarium.AvmTransactions' class='docClass'>Canarium.AvmTransactions</a></div><div class='dependency'><a href='#!/api/Canarium.Port' rel='Canarium.Port' class='docClass'>Canarium.Port</a></div><h4>Files</h4><div class='dependency'><a href='source/canarium.html#Canarium-HostComm' target='_blank'>canarium.js</a></div></pre><div class='doc-contents'><p>PERIDOTボード ホスト通信クラス</p>\n</div><div class='members'><div class='members-section'><h3 class='members-title icon-property'>Properties</h3><div class='subsection'><div class='definedBy'>Defined By</div><h4 class='members-subtitle'>Instance properties</h3><div id='property-_avm' class='member first-child not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.HostComm'>Canarium.HostComm</span><br/><a href='source/canarium.html#Canarium-HostComm-property-_avm' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.HostComm-property-_avm' class='name expandable'>_avm</a> : <a href=\"#!/api/Canarium.AvmTransactions\" rel=\"Canarium.AvmTransactions\" class=\"docClass\">Canarium.AvmTransactions</a><span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'><p>Avalon-MMトランザクション層通信クラスのインスタンス</p>\n</div><div class='long'><p>Avalon-MMトランザクション層通信クラスのインスタンス</p>\n</div></div></div><div id='property-_descs' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.HostComm'>Canarium.HostComm</span><br/><a href='source/canarium.html#Canarium-HostComm-property-_descs' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.HostComm-property-_descs' class='name expandable'>_descs</a> : Object[]<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'><p>処理中のディスクリプタ配列</p>\n</div><div class='long'><p>処理中のディスクリプタ配列</p>\n</div></div></div><div id='property-_ports' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.HostComm'>Canarium.HostComm</span><br/><a href='source/canarium.html#Canarium-HostComm-property-_ports' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.HostComm-property-_ports' class='name expandable'>_ports</a> : Object<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'><p>ポート番号をキーとするポートクラスインスタンスの連想配列</p>\n</div><div class='long'><p>ポート番号をキーとするポートクラスインスタンスの連想配列</p>\n</div></div></div><div id='property-_swiBase' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.HostComm'>Canarium.HostComm</span><br/><a href='source/canarium.html#Canarium-HostComm-property-_swiBase' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.HostComm-property-_swiBase' class='name expandable'>_swiBase</a> : number<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'><p>SWIペリフェラルのベースアドレス</p>\n</div><div class='long'><p>SWIペリフェラルのベースアドレス</p>\n</div></div></div><div id='property-_timerId' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.HostComm'>Canarium.HostComm</span><br/><a href='source/canarium.html#Canarium-HostComm-property-_timerId' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.HostComm-property-_timerId' class='name expandable'>_timerId</a> : number<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'><p>ポーリング用タイマーのID</p>\n</div><div class='long'><p>ポーリング用タイマーのID</p>\n</div></div></div><div id='property-_timerInterval' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.HostComm'>Canarium.HostComm</span><br/><a href='source/canarium.html#Canarium-HostComm-property-_timerInterval' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.HostComm-property-_timerInterval' class='name expandable'>_timerInterval</a> : number<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'><p>ポーリング用タイマーの周期(ミリ秒)</p>\n</div><div class='long'><p>ポーリング用タイマーの周期(ミリ秒)</p>\n</div></div></div></div><div class='subsection'><div class='definedBy'>Defined By</div><h4 class='members-subtitle'>Static properties</h3><div id='static-property-verbosity' class='member first-child not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.HostComm'>Canarium.HostComm</span><br/><a href='source/canarium.html#Canarium-HostComm-static-property-verbosity' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.HostComm-static-property-verbosity' class='name expandable'>verbosity</a> : number<span class=\"signature\"><span class='static' >static</span></span></div><div class='description'><div class='short'>デバッグ出力の細かさ(0で出力無し) ...</div><div class='long'><p>デバッグ出力の細かさ(0で出力無し)</p>\n<p>Defaults to: <code>0</code></p></div></div></div></div></div><div class='members-section'><div class='definedBy'>Defined By</div><h3 class='members-title icon-method'>Methods</h3><div class='subsection'><div id='method-constructor' class='member first-child not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.HostComm'>Canarium.HostComm</span><br/><a href='source/canarium.html#Canarium-HostComm-method-constructor' target='_blank' class='view-source'>view source</a></div><strong class='new-keyword'>new</strong><a href='#!/api/Canarium.HostComm-method-constructor' class='name expandable'>Canarium.HostComm</a>( <span class='pre'>_avm, [_swiBase]</span> ) : <a href=\"#!/api/Canarium.HostComm\" rel=\"Canarium.HostComm\" class=\"docClass\">Canarium.HostComm</a><span class=\"signature\"><span class='protected' >protected</span></span></div><div class='description'><div class='short'>コンストラクタ ...</div><div class='long'><p>コンストラクタ</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>_avm</span> : <a href=\"#!/api/Canarium.AvmTransactions\" rel=\"Canarium.AvmTransactions\" class=\"docClass\">Canarium.AvmTransactions</a><div class='sub-desc'><p>Avalon-MMトランザクション層通信クラスのインスタンス</p>\n</div></li><li><span class='pre'>_swiBase</span> : number (optional)<div class='sub-desc'><p>SWIペリフェラルのベースアドレス</p>\n<p>Defaults to: <code>0x10000000</code></p></div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'><a href=\"#!/api/Canarium.HostComm\" rel=\"Canarium.HostComm\" class=\"docClass\">Canarium.HostComm</a></span><div class='sub-desc'>\n</div></li></ul></div></div></div><div id='method-_delegate' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.HostComm'>Canarium.HostComm</span><br/><a href='source/canarium.html#Canarium-HostComm-method-_delegate' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.HostComm-method-_delegate' class='name expandable'>_delegate</a>( <span class='pre'>descs</span> ) : undefined<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'>ディスクリプタの処理をポートクラスに委譲する ...</div><div class='long'><p>ディスクリプタの処理をポートクラスに委譲する</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>descs</span> : Object[]<div class='sub-desc'><p>ディスクリプタオブジェクトの配列</p>\n</div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'>undefined</span><div class='sub-desc'>\n</div></li></ul></div></div></div><div id='method-_log' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.HostComm'>Canarium.HostComm</span><br/><a href='source/canarium.html#Canarium-HostComm-method-_log' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.HostComm-method-_log' class='name expandable'>_log</a>( <span class='pre'>lvl, func, msg, [data]</span> ) : undefined<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'>ログの出力 ...</div><div class='long'><p>ログの出力</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>lvl</span> : number<div class='sub-desc'><p>詳細度(0で常に出力。値が大きいほど詳細なメッセージを指す)</p>\n</div></li><li><span class='pre'>func</span> : string<div class='sub-desc'><p>関数名</p>\n</div></li><li><span class='pre'>msg</span> : string<div class='sub-desc'><p>メッセージ</p>\n</div></li><li><span class='pre'>data</span> : Object (optional)<div class='sub-desc'><p>任意のデータ</p>\n</div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'>undefined</span><div class='sub-desc'>\n</div></li></ul></div></div></div><div id='method-_poll' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.HostComm'>Canarium.HostComm</span><br/><a href='source/canarium.html#Canarium-HostComm-method-_poll' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.HostComm-method-_poll' class='name expandable'>_poll</a>( <span class='pre'></span> ) : undefined<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'>ポーリング処理の実行 ...</div><div class='long'><p>ポーリング処理の実行</p>\n<h3 class='pa'>Returns</h3><ul><li><span class='pre'>undefined</span><div class='sub-desc'>\n</div></li></ul></div></div></div><div id='method-_raiseInterrupt' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.HostComm'>Canarium.HostComm</span><br/><a href='source/canarium.html#Canarium-HostComm-method-_raiseInterrupt' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.HostComm-method-_raiseInterrupt' class='name expandable'>_raiseInterrupt</a>( <span class='pre'></span> ) : Promise<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'>ソフトウェア割り込みの生成 ...</div><div class='long'><p>ソフトウェア割り込みの生成</p>\n<h3 class='pa'>Returns</h3><ul><li><span class='pre'>Promise</span><div class='sub-desc'><p>Promiseオブジェクト</p>\n</div></li></ul></div></div></div><div id='method-_readDescriptor' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.HostComm'>Canarium.HostComm</span><br/><a href='source/canarium.html#Canarium-HostComm-method-_readDescriptor' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.HostComm-method-_readDescriptor' class='name expandable'>_readDescriptor</a>( <span class='pre'>address</span> ) : Promise<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'>ディスクリプタの読み込み ...</div><div class='long'><p>ディスクリプタの読み込み</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>address</span> : Object<div class='sub-desc'></div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'>Promise</span><div class='sub-desc'><p>Promiseオブジェクト</p>\n<ul><li><span class='pre'>PromiseValue</span> : Object<div class='sub-desc'><p>ディスクリプタオブジェクト</p>\n<ul><li><span class='pre'>address</span> : number<div class='sub-desc'><p>このディスクリプタのアドレス</p>\n</div></li><li><span class='pre'>next</span> : number<div class='sub-desc'><p>次のディスクリプタのアドレス</p>\n</div></li><li><span class='pre'>portNumber</span> : number<div class='sub-desc'><p>ポート番号</p>\n</div></li><li><span class='pre'>command</span> : number<div class='sub-desc'><p>コマンド番号(CMD_xxx)</p>\n</div></li><li><span class='pre'>requestedBytes</span> : number<div class='sub-desc'><p>転送要求バイト数</p>\n</div></li><li><span class='pre'>dataAddress</span> : number<div class='sub-desc'><p>データアドレス</p>\n</div></li><li><span class='pre'>response</span> : number<div class='sub-desc'><p>応答番号(初期値は常にRESP_PENDING)</p>\n</div></li><li><span class='pre'>status</span> : number<div class='sub-desc'><p>ステータスコード(初期値は常に0)</p>\n</div></li><li><span class='pre'>transferedBytes</span> : number<div class='sub-desc'><p>転送完了バイト数(初期値は常に0)</p>\n</div></li><li><span class='pre'>delegated</span> : boolean<div class='sub-desc'><p>委譲済みフラグ(初期値は常にfalse)</p>\n</div></li></ul></div></li></ul></div></li></ul></div></div></div><div id='method-_readMessage' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.HostComm'>Canarium.HostComm</span><br/><a href='source/canarium.html#Canarium-HostComm-method-_readMessage' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.HostComm-method-_readMessage' class='name expandable'>_readMessage</a>( <span class='pre'></span> ) : Promise<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'>メッセージの読み込み ...</div><div class='long'><p>メッセージの読み込み</p>\n<h3 class='pa'>Returns</h3><ul><li><span class='pre'>Promise</span><div class='sub-desc'><p>Promiseオブジェクト</p>\n<ul><li><span class='pre'>PromiseValue</span> : number<div class='sub-desc'><p>メッセージデータ</p>\n</div></li></ul></div></li></ul></div></div></div><div id='method-_writeDescriptor' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.HostComm'>Canarium.HostComm</span><br/><a href='source/canarium.html#Canarium-HostComm-method-_writeDescriptor' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.HostComm-method-_writeDescriptor' class='name expandable'>_writeDescriptor</a>( <span class='pre'>desc</span> ) : Promise<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'>ディスクリプタの書き込み(応答とステータスのみ) ...</div><div class='long'><p>ディスクリプタの書き込み(応答とステータスのみ)</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>desc</span> : Object<div class='sub-desc'><p>ディスクリプタオブジェクト</p>\n<ul><li><span class='pre'>address</span> : number<div class='sub-desc'><p>このディスクリプタのアドレス</p>\n</div></li><li><span class='pre'>response</span> : number<div class='sub-desc'><p>レスポンス番号(1:エラー,2:HostWrite完了,3:HostRead完了)</p>\n</div></li><li><span class='pre'>status</span> : number<div class='sub-desc'><p>ステータスコード(レスポンスがエラーのとき利用される)</p>\n</div></li><li><span class='pre'>transferedBytes</span> : number<div class='sub-desc'><p>転送完了バイト数(レスポンスが完了のとき利用される)</p>\n</div></li></ul></div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'>Promise</span><div class='sub-desc'><p>Promiseオブジェクト</p>\n</div></li></ul></div></div></div><div id='method-_writeMessage' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.HostComm'>Canarium.HostComm</span><br/><a href='source/canarium.html#Canarium-HostComm-method-_writeMessage' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.HostComm-method-_writeMessage' class='name expandable'>_writeMessage</a>( <span class='pre'>message</span> ) : number<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'>メッセージの書き込み ...</div><div class='long'><p>メッセージの書き込み</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>message</span> : Object<div class='sub-desc'></div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'>number</span><div class='sub-desc'><p>message\n  メッセージデータ</p>\n</div></li></ul></div></div></div><div id='method-registerPort' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium.HostComm'>Canarium.HostComm</span><br/><a href='source/canarium.html#Canarium-HostComm-method-registerPort' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium.HostComm-method-registerPort' class='name expandable'>registerPort</a>( <span class='pre'>port</span> ) : undefined<span class=\"signature\"><span class='protected' >protected</span></span></div><div class='description'><div class='short'>ポートクラスの登録 ...</div><div class='long'><p>ポートクラスの登録</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>port</span> : <a href=\"#!/api/Canarium.Port\" rel=\"Canarium.Port\" class=\"docClass\">Canarium.Port</a><div class='sub-desc'><p>ポートクラスのインスタンス</p>\n</div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'>undefined</span><div class='sub-desc'>\n</div></li></ul></div></div></div></div></div></div></div>","meta":{}});