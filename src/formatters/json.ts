
import { IFormatter } from '../formatter';
import { ISection, IStringPart, ITablePart, PartType } from '../parser-interface';

// laziness
const CONTENT_SECTION_LEVEL = 5;

function jsonPropertyFilter(key: string, value: any) {
    if (key === 'level') return;
    return value;
}

class JsonSection {
    static extractFrom(section: ISection): JsonSection {
        const firstPart = section.parts[0];
        switch (firstPart.type) {
        case PartType.STRING:
            return new JsonSection(
                section.level,
                section.parts.splice(0, 1).toString(),
            );

        case PartType.TABLE:
            return new JsonSection(
                section.level,
                (firstPart as ITablePart).headers.splice(0, 1)[0][0].str,
            );
        }

        throw new Error(`Unexpected section: ${section}`);
    }

    type = 'section';
    contents: JsonPart[] = [];

    constructor(
        readonly level: number,
        readonly title: string,
    ) {}

}

type JsonPart = JsonSection | string | any;

export interface IJsonOptions {
    debug?: boolean;
    pretty?: boolean;
}

/**
 * Formats the SRD as a big JSON object
 */
export class JsonFormatter implements IFormatter {

    private json: JsonSection = new JsonSection(-1, 'SRD');
    private current: JsonSection = this.json;
    private stack: JsonSection[] = [this.current];

    private opts: IJsonOptions;

    constructor(
        readonly output: NodeJS.WriteStream,
        opts?: IJsonOptions,
    ) {
        this.opts = {
            debug: false,
            pretty: false,

            ...opts,
        };
    }

    async format(section: ISection) {
        let newSectionParent: JsonSection;
        if (section.level <= this.current.level) {
            while (section.level <= this.current.level) {
                this.current = this.stack.pop();
            }

            // put it back on the stack
            this.stack.push(this.current);
        }

        if (section.level < CONTENT_SECTION_LEVEL) {
            newSectionParent = this.current;
            this.current = JsonSection.extractFrom(
                section,
            );

            newSectionParent.contents.push(this.current);
            this.stack.push(this.current);
        }

        for (const part of section.parts) {
            if (part.type === PartType.STRING
                && (part as IStringPart).str === ''
            ) {
                // drop empty parts; this may be something we should
                // move into Parser...
                continue;
            }

            const partAsJson = part.toJson();
            if (part.type === PartType.TABLE) {
                partAsJson.type = 'table';
            }
            this.current.contents.push(partAsJson);
        }
    }

    async end() {
        const filter = this.opts.debug
            ? null
            : jsonPropertyFilter;

        const json = this.opts.pretty
            ? JSON.stringify(this.json, filter, '  ')
            : JSON.stringify(this.json, filter);

        this.output.write(json);
    }
}
