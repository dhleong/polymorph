
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
    SPELL,
    STRING,
    TABLE,
}

export interface IPart {
    type: PartType;
    toJson(): any;
}

export interface ISpellPart extends IPart {
    name: string;
}

export interface IStringPart extends IPart {
    str: string;
    formatting: FormatSpan[];
}

export interface ITablePart extends IPart {
    headers: IStringPart[][];
    rows: IStringPart[][];
}

// union type of all part kinds
export type Part = ISpellPart | IStringPart | ITablePart;

export interface ISection {
    level: number;
    parts: Part[];

    /**
     * Abstract the header, optionally removing it
     * from the source Part
     */
    getHeader(removeIt: boolean): string;
}
