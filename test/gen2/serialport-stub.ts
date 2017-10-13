import { EventEmitter } from 'events';

export class SerialPortStub extends EventEmitter {
    static VALID_PATH = 'COM99';
    static INVALID_PATH = '/dev/tty.usbmodem9999';

    static list(cb: Function): void {
        cb(null, [{
            comName: this.VALID_PATH,
            manufacturer: 'Valid (openable) port',
            serialNumber: 'W12345678',
            productId: '1234',
            vendorId: '5678',
        },{
            comName: this.INVALID_PATH,
            manufacturer: 'Invalid (non-openable) port',
            serialNumber: 'M12345678',
            productId: '4321',
            vendorId: '8765',
        }]);
    }

    constructor(private _path: string) {
        super();
    }

    open(cb: Function): void {
        switch (this._path) {
        case SerialPortStub.VALID_PATH:
            cb();
            return;
        default:
            cb(new Error('Invalid path'));
            return;
        }
    }

    close(cb: Function): void {
        cb();
    }

    flush(cb: Function): void {
        cb();
    }

}
