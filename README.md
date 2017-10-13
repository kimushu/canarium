Canarium - PERIDOT board driver
========

CanariumはChrome/Node.jsアプリケーション用の[PERIDOTボード](https://github.com/osafune/peridot)ドライバです。

通信仕様
-------

|通信仕様世代|対応ボードのシリーズ|コンフィグ\*1|Avalon-MM<br>マスタ\*2|ストリーム<br>入出力\*3|Canarium<br>バージョン|プラットフォーム|
|:--:|:--|:--:|:--:|:--:|:--:|:--:|
|**Gen1**|[PERIDOT Classic](https://github.com/osafune/peridot) および<br>[PERIDOT New Generations](https://github.com/osafune/peridot_newgen)|対応|対応|非対応|^0.9<br>>=1.0|Chrome (^0.9.x)<br>Node.js (>=1.0)|
|**Gen2**|[PERIDOT New Generations](https://github.com/osafune/peridot_newgen)|非対応|対応|対応|>=1.0|Node.js

*1) RBF(やRPD)を転送して、FPGAのコンフィグレーションをリアルタイムで行う機能。  
*2) CanariumからQsys上のペリフェラル(Avalon-MM Slave)にアクセスする機能。  
*3) Avalon-STやNiosII上の疑似ストリームファイルにデータを入出力する機能。

APIリファレンス
-------
<table>
<tr><th>対応ボード種別</th><th>通信仕様</th><th>クラス名とAPIリファレンスへのリンク</th></tr>
<tr><td>PERIDOT Classic</td><td rowspan="2" align="center">Gen1</td><td rowspan="2"><a href="http://kimushu.github.io/canarium/gen1">Canarium</a> または<br><a href="http://kimushu.github.io/canarium/gen1">CanariumGen1</a> (<code>Canarium</code> の別名として定義)</td></tr>
<tr><td>PERIDOT Piccolo (BOOT側)</td></tr>
<tr><td>PERIDOT Piccolo (USER側)<br>※Rubic対応ファームの場合</td><td align="center">Gen2</td><td><a href="http://kimushu.github.io/canarium/gen2/classes/canariumgen2.html">CanariumGen2</a></td></tr>
</table>

使用例 / Examples (Gen1)
-------
```js
const { Canarium } = require('canarium');
const fs = require('fs');

let canarium = new Canarium();
// Connect to PERIDOT Classic (PS mode) on COM3 port
canarium.open('COM3')
.then(() => {
    // Program FPGA
    return canarium.config(fs.readFileSync('test.rbf'));
})
.then(() => {
    // Read memory
    return canarium.avm.read(0x10000000, 256);
})
.then((data) => {
    // Show memory dump
    console.log(data);

    // Disconnect
    return canarium.close();
});
```

使用例 / Examples (Gen2)
-------
```js
const { CanariumGen2 } = require('canarium');

// Connect to PERIDOT with Gen2 I/F on COM3 port
let canarium = new CanariumGen2('COM3');
canarium.open()
.then(() => {
    // Create writable stream on Channel 8
    let txStream = canarium.createWriteStream(8);
    txStream.write(...);
.then(() => {
    // ...
})
.then(() => {
    // Disconnect from board
    canarium.close();
});
```

インストール方法 / How to install
-------
  - `npm install canarium`

変更履歴 / History
-------
See [CHANGELOG.md](https://github.com/kimushu/canarium/blob/master/CHANGELOG.md)

ライセンス / License
-------

This package is distributed under **MIT license**.
