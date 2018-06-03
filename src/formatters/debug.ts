
import { IFormatter } from '../formatter';
import { ISection } from '../parser-interface';

/**
 * A dumb IFormatter implementation that is somewhat
 *  helpful for dev purposes
 */
export class DebugFormatter implements IFormatter {

    constructor(readonly output: NodeJS.WriteStream) {}

    async format(section: ISection) {
        for (const part of section.parts) {
            const indent = ' '.repeat(section.level);
            this.output.write(
                `${indent}${part} [${section.level}]\n`,
            );
        }
    }

    async end() {
        /* nop */
    }
}
