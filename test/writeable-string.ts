import { Writable, WritableOptions } from 'stream';

export class WriteableString extends Writable {
    private s = '';

    constructor(opts?: WritableOptions) {
        super(opts);
    }

    _write(chunk: any, _encoding: string, callback: (err?: Error) => void) {
        this.s += chunk;
        callback();
    }

    public toString() {
        return this.s;
    }
}
