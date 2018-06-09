
import { IFormatter } from '../formatter';
import {
    Alignment,
    FormatSpan,
    ICreaturePart, ISection, ISpellPart,
    IStringPart, Part,
    PartType,
    Size,
    SpellSchool,
} from '../parser/interface';

// laziness
const CONTENT_SECTION_LEVEL = 5;

const spellSchoolJson = {
    [SpellSchool.Abjuration]: 'A',
    [SpellSchool.Conjuration]: 'C',
    [SpellSchool.Divination]: 'D',
    [SpellSchool.Enchantment]: 'E',
    [SpellSchool.Evocation]: 'V',
    [SpellSchool.Illusion]: 'I',
    [SpellSchool.Necromancy]: 'N',
    [SpellSchool.Transmutation]: 'T',
};

const sizeJson = {
    [Size.Tiny]: 'T',
    [Size.Small]: 'S',
    [Size.Medium]: 'M',
    [Size.Large]: 'L',
    [Size.Huge]: 'H',
    [Size.Gargantuan]: 'G',
};

const alignmentJson = {
    [Alignment.Any]: 'any',
    [Alignment.Unaligned]: 'unligned',
    [Alignment.LawfulGood]: 'LG',
    [Alignment.LawfulNeutral]: 'LN',
    [Alignment.LawfulEvil]: 'LE',
    [Alignment.NeutralGood]: 'NG',
    [Alignment.TrueNeutral]: 'N',
    [Alignment.NeutralEvil]: 'NE',
    [Alignment.ChaoticGood]: 'CG',
    [Alignment.ChaoticNeutral]: 'CN',
    [Alignment.ChaoticEvil]: 'CE',
};

function jsonPropertyFilter(key: string, value: any) {
    if (key === 'level') return;
    return value;
}

export class JsonSection {
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

    addContentFrom(section: ISection) {
        for (const part of section.parts) {
            const partAsJson = partToJson(part);
            if (partAsJson) {
                this.contents.push(partAsJson);
            }
        }
    }
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
            const spell = part as ISpellPart;
            partAsJson = part.toJson();
            partAsJson.type = 'spell';

            partAsJson.school = spellSchoolJson[spell.school];
            partAsJson.info = (partAsJson.info as Part[])
                .map(p => partToJson(p))
                .filter(p => p); // remove blank lines

            // remove `false` boolean values
            if (!spell.concentration) {
                delete partAsJson.concentration;
            }
            if (!spell.ritual) {
                delete partAsJson.ritual;
            }
            break;

        case PartType.CREATURE:
            const creature = part as ICreaturePart;
            partAsJson = part.toJson();
            partAsJson.type = 'creature';

            partAsJson.size = sizeJson[creature.size];
            partAsJson.align = alignmentJson[creature.align];

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
        // clone it because JsonSection.extractFrom modifies
        section = section.clone();

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

        this.current.addContentFrom(section);
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
