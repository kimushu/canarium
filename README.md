Canarium - PERIDOT board driver
========

Canariumは、Node.jsアプリケーション用の[PERIDOTボード](https://github.com/osafune/peridot)ドライバです。

ドキュメント
-------
<table>
<tr><th>ボード種別</th><th>通信仕様</th><th>クラス名とドキュメントへのリンク</th></tr>
<tr><td>PERIDOT Classic</td><td rowspan="2">Gen1</td><td rowspan="2"><a href="http://kimushu.github.io/canarium/gen1">Canarium</a> または <a href="http://kimushu.github.io/canarium/gen1">CanariumGen1</a></td></tr>
<tr><td>PERIDOT Piccolo (BOOT側)</td></tr>
<tr><td>PERIDOT Piccolo (USER側)<br>※Rubic対応ファームの場合</td><td>Gen2</td><td><a href="http://kimushu.github.io/canarium/gen2/classes/canariumgen2.html">CanariumGen2</a></td></tr>
</table>

使用例 (Gen1)
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

使用例 (Gen2)
-------
```js
const { CanariumGen2 } = require('canarium');

let canarium = new CanariumGen2('COM3');
// Connect to PERIDOT with Gen2 I/F on COM3 port
canarium.open()
.then(() => {
    // Create writable stream on Channel 8
    let txStream = canarium.createWriteStream(8);
    txStream.write(...);
});
```

How to install
-------
- For Node.js environment (Version 1.0.x) *[BETA]*
  - `npm install canarium@beta`
- For Chrome environment (Version 0.9.x)
  - `npm install canarium`

History
-------
See [CHANGELOG.md](https://github.com/kimushu/canarium/blob/master/CHANGELOG.md)

License
-------

This package is distributed under MIT license.
