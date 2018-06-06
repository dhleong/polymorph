
import { IFormatter } from '../formatter';
import {
    FormatSpan,
    ISection, IStringPart,
    Part, PartType,
} from '../parser/interface';

// laziness
const CONTENT_SECTION_LEVEL = 5;

function jsonPropertyFilter(key: string, value: any) {
    if (key === 'level') return;
    return value;
}

class JsonSection {
    static extractFrom(section: ISection): JsonSection {
        return new JsonSection(
            section.level,
            section.getHeader(/* removeIt = */true),
        );
    }

    type = 'section';
    contents: JsonPart[] = [];

    constructor(
        readonly level: number,
        readonly title: string,
    ) {}
}

class JsonFormatSpan {
    static from(span: FormatSpan): JsonFormatSpan {
        return new JsonFormatSpan(
            JsonFormatSpan.formatToStyleString(span),
            span.start,
            span.length,
        );
    }

    private static formatToStyleString(span: FormatSpan): string {
        let str = '';

        if (span.isBold) str += 'b';
        if (span.isItalic) str += 'i';

        return str;
    }

    constructor(
        readonly style: string,
        readonly start: number,
        readonly length: number,
    ) {}
}

class FormattedText {
    static from(part: IStringPart): FormattedText | string {
        if (!part.formatting || !part.formatting.length) {
            // simple case
            return part.str;
        }

        const result = new FormattedText();
        result.text = part.str;
        result.spans = part.formatting.map(fmt => JsonFormatSpan.from(fmt));

        return result;
    }

    type = 'text';
    text: string;

    spans: JsonFormatSpan[];
}

type JsonPart = JsonSection | FormattedText | string | any;

export interface IJsonOptions {
    debug?: boolean;
    pretty?: boolean;
}

function partToJson(part: Part) {

    let partAsJson;
    switch (part.type) {
        case PartType.TABLE:
            partAsJson = part.toJson();
            partAsJson.type = 'table';
            break;

        case PartType.STRING:
            if ((part as IStringPart).str === '') {
                // drop empty parts; this may be something we should
                // move into Parser...
                return;
            }

            partAsJson = FormattedText.from(part as IStringPart);
            break;

        case PartType.SPELL:
            partAsJson = part.toJson();
            partAsJson.type = 'spell';
            partAsJson.info = (partAsJson.info as Part[])
                .map(p => partToJson(p))
                .filter(p => p); // remove blank lines
            break;

        default:
            throw new Error(`Unsupported part type: ${part.type}`);
    }

    return partAsJson;
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
            const partAsJson = partToJson(part);
            if (partAsJson) {
                this.current.contents.push(partAsJson);
            }
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
