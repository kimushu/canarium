Version 1.0.0-beta1
-------
- Dropped Chrome (chrome.serial) support
- Add [PERIDOT New Generations](https://github.com/osafune/peridot_newgen) support
- Replaced all sources to TypeScript
- Add type declaration for TypeScript IDE

Version 0.9.18
-------
- Fix dependency for es6-promise

Version 0.9.16
-------
- Fix send error

Version 0.9.14
-------
- Fix zero-byte send bug on Mac

Version 0.9.12
-------
- VendorID&ProductID support for Chrome environment ([#4](https://github.com/kimushu/canarium/issues/4))
- Fix auto disconnect detection ([#5](https://github.com/kimushu/canarium/issues/5))
- Fix avm.iord() result to be always positive value or zero ([#3](https://github.com/kimushu/canarium/issues/3))
- Fix redundunt call of callbacks when error thrown inside callback ([#2](https://github.com/kimushu/canarium/issues/2))

Version 0.9.10-0.9.11
-------
- Pulled down

Version 0.9.9
-------
- Re-publish for correction of npmjs registration

Version 0.9.8
-------
- Add Node.js (serialport) support
- Add disconnection detect (onClosed property added)
- Rearrange behavior of errors in non-connected state
- Remove deep nest in retry process

Version 0.9.7
-------
- Tranfered from s_osafune's Canarium (0.9.5)
- Add canarium.min.js (compressed version)
- Add promisified call (when callback is omitted)
- Allow avm just after connection when board is AS mode
- Removed chrome.serial.flush even if fastAcknowledge=true
- Change license to MIT
