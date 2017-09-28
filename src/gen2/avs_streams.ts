import { Writable, Readable } from "stream";
import { EventEmitter } from "events";

const AST_SOP = 0x7a;
const AST_EOP = 0x7b;
const AST_CH  = 0x7c;
const AST_ESC = 0x7d;

function assertValidChannel(channel: number): void {
    if (typeof(channel) !== "number") {
        throw new TypeError("channel must be a number");
    }
    if ((channel < 0) || (0xff < channel)) {
        throw new TypeError("channel number is out of range");
    }
}

function encode7(header: number[], source: Buffer, footer: number[]): Buffer {
    let growth: number = (header.length + footer.length);
    for (let offset = 0; offset < source.length; ++offset) {
        let byte = source[offset];
        if ((AST_SOP <= byte) && (byte <= AST_ESC)) {
            ++growth;
        }
    }
    if (growth === 0) {
        return source;
    }

    let buffer = Buffer.allocUnsafe(source.length + growth);
    let doffset = 0;
    for (let hoffset = 0; hoffset < header.length; ++hoffset) {
        buffer[doffset++] = header[hoffset];
    }
    for (let soffset = 0; soffset < source.length; ++soffset) {
        let byte = source[soffset];
        if ((soffset + 1) === source.length) {
            for (let foffset = 0; foffset < footer.length; ++foffset) {
                buffer[doffset++] = footer[foffset];
            }
        }
        if ((AST_SOP <= byte) && (byte <= AST_ESC)) {
            buffer[doffset++] = AST_ESC;
            buffer[doffset++] = byte ^ 0x20;
        } else {
            buffer[doffset++] = byte;
        }
    }
    return buffer;
}

export class AvsWritableStream extends Writable {
    constructor(sink: AvsMultiplexer, private _channel: number, private _packetized: boolean) {
        super({
            write(chunk: Buffer|string, encoding: string, callback: (err: Error) => void): void {
                return sink.write(_channel, _packetized, chunk, encoding, callback);
            }
        });
        sink.on("close", this.emit.bind(this, "close"));
        sink.on("error", this.emit.bind(this, "error"));
    }

    get channel(): number {
        return this._channel;
    }

    get packetized(): boolean {
        return this._packetized;
    }
}

export class AvsReadableStream extends Readable {
    constructor(source: AvsDemultiplexer, private _channel: number, private _packetized: boolean) {
        super();
        source.on("close", this.emit.bind(this, "close"));
        source.on("error", this.emit.bind(this, "error"));
    }

    get channel(): number {
        return this._channel;
    }

    get packetized(): boolean {
        return this._packetized;
    }
}

export class AvsMultiplexer extends EventEmitter {
    private _sources: AvsWritableStream[] = [];
    private _lastChannel: number = null;

    constructor(private _sink: Writable) {
        super();
        _sink.on("close", this.emit.bind(this, "close"));
        _sink.on("error", this.emit.bind(this, "error"));
    }

    createStream(channel: number, packetized: boolean): AvsWritableStream {
        assertValidChannel(channel);
        let source = this._sources[channel];
        if (source != null) {
            throw new Error(`channel ${channel} already exists`);
        }
        source = new AvsWritableStream(this, channel, packetized);
        this._sources[channel] = source;
        return source;
    }

    write(channel: number, packetized: boolean, chunk: Buffer|string, encoding: string, callback: (err: Error) => void): void {
        if (typeof(chunk) === "string") {
            chunk = Buffer.from(chunk, encoding);
        }

        if (chunk.length === 0) {
            return process.nextTick(callback);
        }

        let header: number[] = [];
        let footer: number[] = [];

        if (this._lastChannel !== channel) {
            this._lastChannel = channel;
            header.push(AST_CH, channel);
        }
        if (packetized) {
            header.push(AST_SOP);
            footer.push(AST_EOP);
        }

        if (!this._sink.write(encode7(header, chunk, footer))) {
            this._sink.once("drain", callback);
        } else {
            process.nextTick(callback);
        }
    }
}

interface PacketizedSink {
    stream: AvsReadableStream;
    packetized: boolean;
    buffer: number[];
    lastByte?: boolean;
}

export class AvsDemultiplexer extends EventEmitter {
    private _sinks: PacketizedSink[] = [];
    private _escaped: boolean = false;
    private _waitChannel: boolean = false;
    private _channel: number = null;

    constructor(source: Readable) {
        super();
        source.on("close", this.emit.bind(this, "close"));
        source.on("error", this.emit.bind(this, "error"));
        source.on("data", (chunk: Buffer) => {
            let sink = this._sinks[this._channel];
            let drain = () => {
                if ((sink != null) && (!sink.packetized) && (sink.buffer.length > 0)) {
                    sink.stream.push(Buffer.from(sink.buffer));
                    sink.buffer = [];
                }
            };
            for (let offset = 0; offset < chunk.length; ++offset) {
                let byte = chunk[offset];
                switch (byte) {
                case AST_SOP:
                    if (sink != null) {
                        if (sink.packetized) {
                            sink.buffer = [];
                            sink.lastByte = false;
                        }
                    }
                    continue;
                case AST_EOP:
                    if (sink != null) {
                        if (sink.packetized) {
                            sink.lastByte = true;
                        }
                    }
                    continue;
                case AST_CH:
                    this._waitChannel = true;
                    continue;
                case AST_ESC:
                    this._escaped = true;
                    continue;
                }
                if (this._escaped) {
                    byte ^= 0x20;
                    this._escaped = false;
                }
                if (this._waitChannel) {
                    this._channel = byte;
                    this._waitChannel = false;
                    drain();
                    sink = this._sinks[this._channel];
                    continue;
                }
                if ((sink != null) && (sink.buffer != null)) {
                    sink.buffer.push(byte);
                    if (sink.packetized && sink.lastByte) {
                        sink.stream.push(Buffer.from(sink.buffer));
                        sink.buffer = null;
                    }
                }
            }
            drain();
        });
    }

    createStream(channel: number, packetized: boolean): AvsReadableStream {
        assertValidChannel(channel);
        let sink = this._sinks[channel];
        if (sink != null) {
            throw new Error(`channel ${channel} already exists`);
        }
        sink = {
            stream: new AvsReadableStream(this, channel, packetized),
            packetized,
            buffer: (packetized ? null : []),
        };
        this._sinks[channel] = sink;
        return sink.stream;
    }
}
