Version 1.0.0-beta1
-------
- Dropped Chrome (chrome.serial) support. Since this version, **only Node.js is supported by Canarium**.
- Changed all binary data types from `ArrayBuffer` to `Buffer`
- Added [PERIDOT New Generations](https://github.com/osafune/peridot_newgen) support
- Added reconfig() method for NewGen
- Added RpcClient class and rpcClient property
- Added RemoteFile class
- Added RemoteError class
- Added openRemoteFile() method
- Replaced all sources to TypeScript
- Added type declaration for TypeScript IDE

Version 0.9.18
-------
- Fixed dependency for es6-promise

Version 0.9.16
-------
- Fixed send error

Version 0.9.14
-------
- Fixed zero-byte send bug on Mac

Version 0.9.12
-------
- Added VendorID&ProductID support for Chrome environment ([#4](https://github.com/kimushu/canarium/issues/4))
- Fixed auto disconnect detection ([#5](https://github.com/kimushu/canarium/issues/5))
- Fixed avm.iord() result to be always positive value or zero ([#3](https://github.com/kimushu/canarium/issues/3))
- Fixed redundunt call of callbacks when error thrown inside callback ([#2](https://github.com/kimushu/canarium/issues/2))

Version 0.9.10-0.9.11
-------
- Pulled down

Version 0.9.9
-------
- Re-published for correction of npmjs registration

Version 0.9.8
-------
- Added Node.js (serialport) support
- Added disconnection detect (onClosed property added)
- Rearranged behavior of errors in non-connected state
- Removed deep nest in retry process

Version 0.9.7
-------
- Tranfered from s_osafune's Canarium (0.9.5)
- Added canarium.min.js (compressed version)
- Added promisified call (when callback is omitted)
- Changed avm enabled just after connection when board is AS mode
- Removed chrome.serial.flush even if fastAcknowledge=true
- Changed license to MIT
