
import { IFormatter } from '../formatter';
import { ISection } from '../parser-interface';

/**
 * Formats the SRD as a big JSON object
 */
export class JsonFormatter implements IFormatter {

    private json = [];

    constructor(
        readonly output: NodeJS.WriteStream,
        readonly opts = {
            pretty: false,
        },
    ) {}

    async format(section: ISection) {
        // FIXME:
        for (const part of section.parts) {
            this.json.push(part);
        }
    }

    async end() {
        const json = this.opts.pretty
            ? JSON.stringify(this.json, null, '  ')
            : JSON.stringify(this.json);
        this.output.write(json);
    }
}
