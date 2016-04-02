Ext.data.JsonP.Canarium({"tagname":"class","name":"Canarium","autodetected":{},"files":[{"filename":"canarium.js","href":"canarium.html#Canarium"}],"members":[{"name":"AVM_CHANNEL","tagname":"cfg","owner":"Canarium","id":"static-cfg-AVM_CHANNEL","meta":{"private":true,"readonly":true,"static":true}},{"name":"CONFIG_TIMEOUT_MS","tagname":"cfg","owner":"Canarium","id":"static-cfg-CONFIG_TIMEOUT_MS","meta":{"private":true,"readonly":true,"static":true}},{"name":"EEPROM_SLAVE_ADDR","tagname":"cfg","owner":"Canarium","id":"static-cfg-EEPROM_SLAVE_ADDR","meta":{"private":true,"readonly":true,"static":true}},{"name":"SPLIT_EEPROM_BURST","tagname":"cfg","owner":"Canarium","id":"static-cfg-SPLIT_EEPROM_BURST","meta":{"private":true,"readonly":true,"static":true}},{"name":"_base","tagname":"property","owner":"Canarium","id":"property-_base","meta":{"private":true}},{"name":"_configBarrier","tagname":"property","owner":"Canarium","id":"property-_configBarrier","meta":{"private":true}},{"name":"_resetBarrier","tagname":"property","owner":"Canarium","id":"property-_resetBarrier","meta":{"private":true}},{"name":"avm","tagname":"property","owner":"Canarium","id":"property-avm","meta":{"readonly":true}},{"name":"avs","tagname":"property","owner":"Canarium","id":"property-avs","meta":{"readonly":true}},{"name":"boardInfo","tagname":"property","owner":"Canarium","id":"property-boardInfo","meta":{}},{"name":"connected","tagname":"property","owner":"Canarium","id":"property-connected","meta":{"readonly":true}},{"name":"i2c","tagname":"property","owner":"Canarium","id":"property-i2c","meta":{"readonly":true}},{"name":"onClosed","tagname":"property","owner":"Canarium","id":"property-onClosed","meta":{}},{"name":"serialBitrate","tagname":"property","owner":"Canarium","id":"property-serialBitrate","meta":{}},{"name":"version","tagname":"property","owner":"Canarium","id":"property-version","meta":{}},{"name":"verbosity","tagname":"property","owner":"Canarium","id":"static-property-verbosity","meta":{"static":true}},{"name":"constructor","tagname":"method","owner":"Canarium","id":"method-constructor","meta":{}},{"name":"_eepromRead","tagname":"method","owner":"Canarium","id":"method-_eepromRead","meta":{"private":true}},{"name":"_log","tagname":"method","owner":"Canarium","id":"method-_log","meta":{"private":true}},{"name":"close","tagname":"method","owner":"Canarium","id":"method-close","meta":{}},{"name":"config","tagname":"method","owner":"Canarium","id":"method-config","meta":{}},{"name":"getinfo","tagname":"method","owner":"Canarium","id":"method-getinfo","meta":{}},{"name":"open","tagname":"method","owner":"Canarium","id":"method-open","meta":{}},{"name":"reset","tagname":"method","owner":"Canarium","id":"method-reset","meta":{}},{"name":"_log","tagname":"method","owner":"Canarium","id":"static-method-_log","meta":{"private":true,"static":true}},{"name":"enumerate","tagname":"method","owner":"Canarium","id":"static-method-enumerate","meta":{"static":true}}],"alternateClassNames":[],"aliases":{},"id":"class-Canarium","component":false,"superclasses":[],"subclasses":[],"mixedInto":[],"mixins":[],"parentMixins":[],"requires":[],"uses":[],"html":"<div><pre class=\"hierarchy\"><h4>Files</h4><div class='dependency'><a href='source/canarium.html#Canarium' target='_blank'>canarium.js</a></div></pre><div class='doc-contents'><p>PERIDOTボードドライバ</p>\n</div><div class='members'><div class='members-section'><div class='definedBy'>Defined By</div><h3 class='members-title icon-cfg'>Config options</h3><div class='subsection'><div id='static-cfg-AVM_CHANNEL' class='member first-child not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-static-cfg-AVM_CHANNEL' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-static-cfg-AVM_CHANNEL' class='name expandable'>AVM_CHANNEL</a> : number<span class=\"signature\"><span class='private' >private</span><span class='readonly' >readonly</span><span class='static' >static</span></span></div><div class='description'><div class='short'><p>Avalon-MM 通信レイヤのチャネル番号</p>\n</div><div class='long'><p>Avalon-MM 通信レイヤのチャネル番号</p>\n</div></div></div><div id='static-cfg-CONFIG_TIMEOUT_MS' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-static-cfg-CONFIG_TIMEOUT_MS' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-static-cfg-CONFIG_TIMEOUT_MS' class='name expandable'>CONFIG_TIMEOUT_MS</a> : number<span class=\"signature\"><span class='private' >private</span><span class='readonly' >readonly</span><span class='static' >static</span></span></div><div class='description'><div class='short'><p>コンフィグレーション開始のタイムアウト時間(ms)</p>\n</div><div class='long'><p>コンフィグレーション開始のタイムアウト時間(ms)</p>\n</div></div></div><div id='static-cfg-EEPROM_SLAVE_ADDR' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-static-cfg-EEPROM_SLAVE_ADDR' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-static-cfg-EEPROM_SLAVE_ADDR' class='name expandable'>EEPROM_SLAVE_ADDR</a> : number<span class=\"signature\"><span class='private' >private</span><span class='readonly' >readonly</span><span class='static' >static</span></span></div><div class='description'><div class='short'><p>EEPROMのスレーブアドレス(7-bit表記)</p>\n</div><div class='long'><p>EEPROMのスレーブアドレス(7-bit表記)</p>\n</div></div></div><div id='static-cfg-SPLIT_EEPROM_BURST' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-static-cfg-SPLIT_EEPROM_BURST' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-static-cfg-SPLIT_EEPROM_BURST' class='name expandable'>SPLIT_EEPROM_BURST</a> : number<span class=\"signature\"><span class='private' >private</span><span class='readonly' >readonly</span><span class='static' >static</span></span></div><div class='description'><div class='short'><p>EEPROMの最大バーストリード長(バイト数)</p>\n</div><div class='long'><p>EEPROMの最大バーストリード長(バイト数)</p>\n</div></div></div></div></div><div class='members-section'><h3 class='members-title icon-property'>Properties</h3><div class='subsection'><div class='definedBy'>Defined By</div><h4 class='members-subtitle'>Instance properties</h3><div id='property-_base' class='member first-child not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-property-_base' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-property-_base' class='name expandable'>_base</a> : <a href=\"#!/api/Canarium.BaseComm\" rel=\"Canarium.BaseComm\" class=\"docClass\">Canarium.BaseComm</a><span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'><p>下位層通信クラスのインスタンス</p>\n</div><div class='long'><p>下位層通信クラスのインスタンス</p>\n</div></div></div><div id='property-_configBarrier' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-property-_configBarrier' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-property-_configBarrier' class='name expandable'>_configBarrier</a> : boolean<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'><p>コンフィグレーション中を示すフラグ(再帰実行禁止用)</p>\n</div><div class='long'><p>コンフィグレーション中を示すフラグ(再帰実行禁止用)</p>\n</div></div></div><div id='property-_resetBarrier' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-property-_resetBarrier' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-property-_resetBarrier' class='name expandable'>_resetBarrier</a> : boolean<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'><p>リセット中を示すフラグ(再帰実行禁止用)</p>\n</div><div class='long'><p>リセット中を示すフラグ(再帰実行禁止用)</p>\n</div></div></div><div id='property-avm' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-property-avm' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-property-avm' class='name expandable'>avm</a> : <a href=\"#!/api/Canarium.AvmTransactions\" rel=\"Canarium.AvmTransactions\" class=\"docClass\">Canarium.AvmTransactions</a><span class=\"signature\"><span class='readonly' >readonly</span></span></div><div class='description'><div class='short'><p>Avalon-MMトランザクション層通信クラスのインスタンス</p>\n</div><div class='long'><p>Avalon-MMトランザクション層通信クラスのインスタンス</p>\n</div></div></div><div id='property-avs' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-property-avs' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-property-avs' class='name expandable'>avs</a> : <a href=\"#!/api/Canarium.AvsPackets\" rel=\"Canarium.AvsPackets\" class=\"docClass\">Canarium.AvsPackets</a><span class=\"signature\"><span class='readonly' >readonly</span></span></div><div class='description'><div class='short'><p>Avalon-STパケット層通信クラスのインスタンス</p>\n</div><div class='long'><p>Avalon-STパケット層通信クラスのインスタンス</p>\n</div></div></div><div id='property-boardInfo' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-property-boardInfo' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-property-boardInfo' class='name expandable'>boardInfo</a> : Object<span class=\"signature\"></span></div><div class='description'><div class='short'>接続しているボードの情報 ...</div><div class='long'><p>接続しているボードの情報</p>\n<ul><li><span class='pre'>id</span> : string<div class='sub-desc'><p>'J72A' (J-7SYSTEM Works / PERIDOT board)</p>\n</div></li><li><span class='pre'>serialcode</span> : string<div class='sub-desc'><p>'xxxxxx-yyyyyy-zzzzzz'</p>\n</div></li></ul></div></div></div><div id='property-connected' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-property-connected' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-property-connected' class='name expandable'>connected</a> : boolean<span class=\"signature\"><span class='readonly' >readonly</span></span></div><div class='description'><div class='short'><p>接続状態(<a href=\"#!/api/Canarium.BaseComm-property-connected\" rel=\"Canarium.BaseComm-property-connected\" class=\"docClass\">Canarium.BaseComm.connected</a>のアクセサとして定義)</p>\n\n<ul>\n<li>true: 接続済み</li>\n<li>false: 未接続</li>\n</ul>\n\n</div><div class='long'><p>接続状態(<a href=\"#!/api/Canarium.BaseComm-property-connected\" rel=\"Canarium.BaseComm-property-connected\" class=\"docClass\">Canarium.BaseComm.connected</a>のアクセサとして定義)</p>\n\n<ul>\n<li>true: 接続済み</li>\n<li>false: 未接続</li>\n</ul>\n\n</div></div></div><div id='property-i2c' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-property-i2c' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-property-i2c' class='name expandable'>i2c</a> : <a href=\"#!/api/Canarium.I2CComm\" rel=\"Canarium.I2CComm\" class=\"docClass\">Canarium.I2CComm</a><span class=\"signature\"><span class='readonly' >readonly</span></span></div><div class='description'><div class='short'><p>I2C通信制御クラスのインスタンス</p>\n</div><div class='long'><p>I2C通信制御クラスのインスタンス</p>\n</div></div></div><div id='property-onClosed' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-property-onClosed' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-property-onClosed' class='name expandable'>onClosed</a> : function()<span class=\"signature\"></span></div><div class='description'><div class='short'><p>クローズされた時に呼び出されるコールバック関数\n  (明示的にclose()した場合と、ボードが強制切断された場合の両方で呼び出される)</p>\n</div><div class='long'><p>クローズされた時に呼び出されるコールバック関数\n  (明示的にclose()した場合と、ボードが強制切断された場合の両方で呼び出される)</p>\n</div></div></div><div id='property-serialBitrate' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-property-serialBitrate' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-property-serialBitrate' class='name expandable'>serialBitrate</a> : number<span class=\"signature\"></span></div><div class='description'><div class='short'><p>デフォルトのビットレート(<a href=\"#!/api/Canarium.BaseComm-property-bitrate\" rel=\"Canarium.BaseComm-property-bitrate\" class=\"docClass\">Canarium.BaseComm.bitrate</a>のアクセサとして定義)</p>\n</div><div class='long'><p>デフォルトのビットレート(<a href=\"#!/api/Canarium.BaseComm-property-bitrate\" rel=\"Canarium.BaseComm-property-bitrate\" class=\"docClass\">Canarium.BaseComm.bitrate</a>のアクセサとして定義)</p>\n</div></div></div><div id='property-version' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-property-version' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-property-version' class='name expandable'>version</a> : string<span class=\"signature\"></span></div><div class='description'><div class='short'><p>ライブラリのバージョン</p>\n</div><div class='long'><p>ライブラリのバージョン</p>\n</div></div></div></div><div class='subsection'><div class='definedBy'>Defined By</div><h4 class='members-subtitle'>Static properties</h3><div id='static-property-verbosity' class='member first-child not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-static-property-verbosity' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-static-property-verbosity' class='name expandable'>verbosity</a> : number<span class=\"signature\"><span class='static' >static</span></span></div><div class='description'><div class='short'>デバッグ出力の細かさ(0で出力無し) ...</div><div class='long'><p>デバッグ出力の細かさ(0で出力無し)</p>\n<p>Defaults to: <code>0</code></p></div></div></div></div></div><div class='members-section'><h3 class='members-title icon-method'>Methods</h3><div class='subsection'><div class='definedBy'>Defined By</div><h4 class='members-subtitle'>Instance methods</h3><div id='method-constructor' class='member first-child not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-method-constructor' target='_blank' class='view-source'>view source</a></div><strong class='new-keyword'>new</strong><a href='#!/api/Canarium-method-constructor' class='name expandable'>Canarium</a>( <span class='pre'></span> ) : <a href=\"#!/api/Canarium\" rel=\"Canarium\" class=\"docClass\">Canarium</a><span class=\"signature\"></span></div><div class='description'><div class='short'>コンストラクタ ...</div><div class='long'><p>コンストラクタ</p>\n<h3 class='pa'>Returns</h3><ul><li><span class='pre'><a href=\"#!/api/Canarium\" rel=\"Canarium\" class=\"docClass\">Canarium</a></span><div class='sub-desc'>\n</div></li></ul></div></div></div><div id='method-_eepromRead' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-method-_eepromRead' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-method-_eepromRead' class='name expandable'>_eepromRead</a>( <span class='pre'>startaddr, readbytes</span> ) : Promise<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'>EEPROMの読み出し ...</div><div class='long'><p>EEPROMの読み出し</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>startaddr</span> : number<div class='sub-desc'><p>読み出し開始アドレス</p>\n</div></li><li><span class='pre'>readbytes</span> : number<div class='sub-desc'><p>読み出しバイト数</p>\n</div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'>Promise</span><div class='sub-desc'><p>Promiseオブジェクト</p>\n<ul><li><span class='pre'>PromiseValue</span> : ArrayBuffer<div class='sub-desc'><p>読み出し結果</p>\n</div></li></ul></div></li></ul></div></div></div><div id='method-_log' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-method-_log' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-method-_log' class='name expandable'>_log</a>( <span class='pre'>lvl, func, msg, [data]</span> ) : undefined<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'>ログの出力 ...</div><div class='long'><p>ログの出力</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>lvl</span> : number<div class='sub-desc'><p>詳細度(0で常に出力。値が大きいほど詳細なメッセージを指す)</p>\n</div></li><li><span class='pre'>func</span> : string<div class='sub-desc'><p>関数名</p>\n</div></li><li><span class='pre'>msg</span> : string<div class='sub-desc'><p>メッセージ</p>\n</div></li><li><span class='pre'>data</span> : Object (optional)<div class='sub-desc'><p>任意のデータ</p>\n</div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'>undefined</span><div class='sub-desc'>\n</div></li></ul></div></div></div><div id='method-close' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-method-close' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-method-close' class='name expandable'>close</a>( <span class='pre'>[callback]</span> ) : undefined/Promise<span class=\"signature\"></span></div><div class='description'><div class='short'>PERIDOTデバイスポートのクローズ ...</div><div class='long'><p>PERIDOTデバイスポートのクローズ</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>callback</span> : function(boolean,Error=) (optional)<div class='sub-desc'><p>コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)</p>\n</div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'>undefined/Promise</span><div class='sub-desc'><p>戻り値なし(callback指定時)、または、Promiseオブジェクト(callback省略時)</p>\n</div></li></ul></div></div></div><div id='method-config' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-method-config' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-method-config' class='name expandable'>config</a>( <span class='pre'>boardInfo, rbfdata, [callback]</span> ) : undefined/Promise<span class=\"signature\"></span></div><div class='description'><div class='short'>ボードのFPGAコンフィグレーション ...</div><div class='long'><p>ボードのFPGAコンフィグレーション</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>boardInfo</span> : Object/null<div class='sub-desc'><p>ボード情報(ボードIDやシリアル番号を限定したい場合)</p>\n<ul><li><span class='pre'>id</span> : string/null<div class='sub-desc'><p>ボードID</p>\n</div></li><li><span class='pre'>serialCode</span> : string/null<div class='sub-desc'><p>シリアル番号</p>\n</div></li></ul></div></li><li><span class='pre'>rbfdata</span> : ArrayBuffer<div class='sub-desc'><p>rbfまたはrpdのデータ</p>\n</div></li><li><span class='pre'>callback</span> : function(boolean,Error=) (optional)<div class='sub-desc'><p>コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)</p>\n</div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'>undefined/Promise</span><div class='sub-desc'><p>戻り値なし(callback指定時)、または、Promiseオブジェクト(callback省略時)</p>\n</div></li></ul></div></div></div><div id='method-getinfo' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-method-getinfo' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-method-getinfo' class='name expandable'>getinfo</a>( <span class='pre'>[callback]</span> ) : undefined/Promise<span class=\"signature\"></span></div><div class='description'><div class='short'>ボード情報の取得 ...</div><div class='long'><p>ボード情報の取得</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>callback</span> : function(boolean,Object/Error=) (optional)<div class='sub-desc'><p>コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)</p>\n</div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'>undefined/Promise</span><div class='sub-desc'><p>戻り値なし(callback指定時)、または、Promiseオブジェクト(callback省略時)</p>\n<ul><li><span class='pre'>PromiseValue</span> : Object<div class='sub-desc'><p>ボード情報</p>\n<ul><li><span class='pre'>id</span> : string<div class='sub-desc'><p>ボードID</p>\n</div></li><li><span class='pre'>serialCode</span> : string<div class='sub-desc'><p>シリアル番号</p>\n</div></li></ul></div></li></ul></div></li></ul></div></div></div><div id='method-open' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-method-open' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-method-open' class='name expandable'>open</a>( <span class='pre'>path, [callback]</span> ) : undefined/Promise<span class=\"signature\"></span></div><div class='description'><div class='short'>ボードに接続する ...</div><div class='long'><p>ボードに接続する</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>path</span> : string<div class='sub-desc'><p>接続先パス(enumerateが返すpath)</p>\n</div></li><li><span class='pre'>callback</span> : function(boolean,Error=) (optional)<div class='sub-desc'><p>コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)</p>\n</div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'>undefined/Promise</span><div class='sub-desc'><p>戻り値なし(callback指定時)、または、Promiseオブジェクト(callback省略時)</p>\n</div></li></ul></div></div></div><div id='method-reset' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-method-reset' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-method-reset' class='name expandable'>reset</a>( <span class='pre'>[callback]</span> ) : undefined/Promise<span class=\"signature\"></span></div><div class='description'><div class='short'>ボードのマニュアルリセット ...</div><div class='long'><p>ボードのマニュアルリセット</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>callback</span> : function(boolean,number/Error=) (optional)<div class='sub-desc'><p>コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)</p>\n</div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'>undefined/Promise</span><div class='sub-desc'><p>戻り値なし(callback指定時)、または、Promiseオブジェクト(callback省略時)</p>\n<ul><li><span class='pre'>PromiseValue</span> : number<div class='sub-desc'><p>レスポンスコマンド</p>\n</div></li></ul></div></li></ul></div></div></div></div><div class='subsection'><div class='definedBy'>Defined By</div><h4 class='members-subtitle'>Static methods</h3><div id='static-method-_log' class='member first-child not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-static-method-_log' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-static-method-_log' class='name expandable'>_log</a>( <span class='pre'>cls, func, msg, [data]</span> ) : undefined<span class=\"signature\"><span class='private' >private</span><span class='static' >static</span></span></div><div class='description'><div class='short'>ログの出力(全クラス共通) ...</div><div class='long'><p>ログの出力(全クラス共通)</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>cls</span> : string<div class='sub-desc'><p>クラス名</p>\n</div></li><li><span class='pre'>func</span> : string<div class='sub-desc'><p>関数名</p>\n</div></li><li><span class='pre'>msg</span> : string<div class='sub-desc'><p>メッセージ</p>\n</div></li><li><span class='pre'>data</span> : Object (optional)<div class='sub-desc'><p>任意のデータ</p>\n</div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'>undefined</span><div class='sub-desc'>\n</div></li></ul></div></div></div><div id='static-method-enumerate' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Canarium'>Canarium</span><br/><a href='source/canarium.html#Canarium-static-method-enumerate' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Canarium-static-method-enumerate' class='name expandable'>enumerate</a>( <span class='pre'>[callback]</span> ) : undefined/Promise<span class=\"signature\"><span class='static' >static</span></span></div><div class='description'><div class='short'>接続対象デバイスを列挙する\n  (PERIDOTでないデバイスも列挙される可能性があることに注意) ...</div><div class='long'><p>接続対象デバイスを列挙する\n  (PERIDOTでないデバイスも列挙される可能性があることに注意)</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>callback</span> : function(boolean,Object[]/Error) (optional)<div class='sub-desc'><p>コールバック関数(省略時は戻り値としてPromiseオブジェクトを返す)</p>\n</div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'>undefined/Promise</span><div class='sub-desc'><p>戻り値なし(callback指定時)、または、Promiseオブジェクト</p>\n<ul><li><span class='pre'>PromiseValue</span> : Object[]<div class='sub-desc'><p>デバイスの配列(各要素は次のメンバを持つ)</p>\n\n<ul>\n<li>name : UI向け名称(COMxxなど)</li>\n<li>path : 内部管理向けパス</li>\n</ul>\n\n</div></li></ul></div></li></ul></div></div></div></div></div></div></div>","meta":{}});