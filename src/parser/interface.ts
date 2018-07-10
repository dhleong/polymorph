
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

export enum Alignment {
    LawfulGood,
    LawfulNeutral,
    LawfulEvil,

    NeutralGood,
    TrueNeutral,
    NeutralEvil,

    ChaoticGood,
    ChaoticNeutral,
    ChaoticEvil,

    Unaligned,
    Any,
}

export enum Size {
    Tiny,
    Small,
    Medium,
    Large,
    Huge,
    Gargantuan,
}

export enum Ability {
    Str,
    Dex,
    Con,
    Int,
    Wis,
    Cha,
}

export interface IAbilities {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
}

export interface ICreaturePart extends IPart {
    name: string;
    size: Size;
    kind: string;
    align: Alignment;

    ac: number;
    acSource: string;
    hp: number;
    hpRoll: string;

    speed: string;

    abilities: IAbilities;

    savingThrows: string;
    senses: string;
    skills: string;
    immunities: string;
    resistances: string;
    vulnerabilities: string;
    conditionImmunities: string;

    languages: string;
    cr: number;
    exp: number;

    info: IStringPart[];
}

export enum SpellAttackType {
    Melee,
    Ranged,
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

export interface ISpellDice {
    base?: string;

    /** If any, how the spell scales with slot level expended */
    slotLevelBuff?: string;

    /**
     * If any, how the spell scales with character level
     * (added once each at 5th, 11th, and 17th)
     */
    charLevelBuff?: string;

    save?: Ability;

    /** If non-null, indicates the type of damage this spell does, if any */
    damageType?: string;

    /** If non-null, indicates spell attack type */
    attackType?: SpellAttackType;
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

    dice?: ISpellDice;
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
