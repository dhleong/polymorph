
import { IFormatter } from '../formatter';
import { ISection } from '../parser/interface';

/**
 * A dumb IFormatter implementation that is somewhat
 *  helpful for dev purposes
 */
export class DebugFormatter implements IFormatter {

    constructor(readonly output: NodeJS.WriteStream) {}

    async format(section: ISection) {
        this.output.write(`---[${section.level}]:\n`);
        for (const part of section.parts) {
            const indent = ' '.repeat(section.level);
            this.output.write(
                `${indent}${part}\n`,
            );
        }
    }

    async end() {
        /* nop */
    }
}
