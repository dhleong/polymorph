
import { IFormatter } from '../formatter';
import { ISection } from '../parser/interface';

/**
 * CompositeFormatter can be used to output multiple
 * formats while parsing a single time.
 */
export class CompositeFormatter implements IFormatter {

    constructor(readonly formatters: IFormatter[]) {}

    async format(section: ISection) {
        for (const formatter of this.formatters) {
            await formatter.format(section);
        }
    }

    async end() {
        for (const formatter of this.formatters) {
            await formatter.end();
        }
    }
}
