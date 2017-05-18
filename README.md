Canarium - PERIDOT board driver
========

Canarium is [PERIDOT boards](https://github.com/osafune/peridot) driver for Node.js applications.

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
