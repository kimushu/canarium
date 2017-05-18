Canarium - PERIDOT board driver
========

Canarium is [PERIDOT boards](https://github.com/osafune/peridot) driver for Node.js applications.

Documents
-------
- For `0.9.x` releases, see [v0.9 documents](http://kimushu.github.io/canarium/v0.9)
- For `1.0.x` or newer releases, see [v1.x documents](http://kimushu.github.io/canarium/v1.x)

Example
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

History
-------
See CHANGELOG.md

License
-------

This package is distributed under MIT license.
