import { IFormatter } from '../formatter';
import { ISection } from '../parser/interface';

import { JsonSection } from './json';

export interface IJsonSectionsOptions {
    separator: string;
}

function jsonSectionPropFilter(key: string, value: any) {
    if (key === 'title') return; // we don't use this
    return value;
}

/**
 * Formats output as a (newline) separated list of JsonSections
 */
export class JsonSectionsFormatter implements IFormatter {
    private opts: IJsonSectionsOptions;

    constructor(
        readonly output: NodeJS.WriteStream,
        opts?: IJsonSectionsOptions,
    ) {
        this.opts = {
            separator: '\n',

            ...opts,
        };
    }

    async format(section: ISection) {
        const json = new JsonSection(section.level, '');
        json.addContentFrom(section);
        this.output.write(
            JSON.stringify(json, jsonSectionPropFilter),
        );
        this.output.write(this.opts.separator);
    }

    async end() {
        // nop
    }
}
