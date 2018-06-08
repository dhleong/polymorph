
export const enum Formatting {
    None = 0,
    Bold = 1,
    Italic = 2,
    BoldItalic = 3,
}

export class FormatSpan {
    constructor(
        readonly format: Formatting,
        public start: number,
        public length: number,
    ) {}

    get isBold(): boolean {
        /* tslint:disable-next-line:no-bitwise */
        return (this.format & Formatting.Bold) !== 0;
    }

    get isItalic(): boolean {
        /* tslint:disable-next-line:no-bitwise */
        return (this.format & Formatting.Italic) !== 0;
    }
}

export enum PartType {
    CREATURE,
    SPELL,
    STRING,
    TABLE,
}

export interface IPart {
    type: PartType;
    toJson(): any;
}

export interface ICreaturePart extends IPart {
    name: string;
}

export enum SpellSchool {
    Abjuration,
    Conjuration,
    Divination,
    Enchantment,
    Evocation,
    Illusion,
    Necromancy,
    Transmutation,
}

export interface ISpellPart extends IPart {
    name: string;
    level: number;
    school: SpellSchool;
    concentration: boolean;
    ritual: boolean;
    castTime: string;
    range: string;
    components: string;
    duration: string;
    info: Part[];
}

export interface IStringPart extends IPart {
    str: string;
    formatting: FormatSpan[];

    /**
     * Get the substring of this IStringPart covered
     * by the provided FormatSpan
     */
    get(fmt: FormatSpan): string;

    /**
     * Extract a Map where the keys are the parts of
     * this StringPart that have a FormatSpan on them,
     * and the values are the non-spanned parts following
     * the key.
     */
    toMapBySpans();
}

export interface ITablePart extends IPart {
    headers: IStringPart[][];
    rows: IStringPart[][];
}

// union type of all part kinds
export type Part = ICreaturePart | ISpellPart | IStringPart | ITablePart;

export interface ISection {
    level: number;
    parts: Part[];

    /**
     * Makes a somewhat shallow copy of this ISection
     */
    clone(): ISection;

    /**
     * Abstract the header, optionally removing it
     * from the source Part
     */
    getHeader(removeIt: boolean): string;
}
