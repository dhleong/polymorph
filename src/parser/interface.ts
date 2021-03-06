
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
    ITEM,
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

export enum ItemKind {
    Ammunition,
    Armor,

    /**
     * Anything that can be equipped that doesn't have
     * a more specific type
     */
    Gear,

    MeleeWeapon,
    Potion,
    RangedWeapon,
    Wondrous,
}

export enum ItemRarity {
    Common,
    Uncommon,
    Rare,
    VeryRare,
    Legendary,
}

export enum BonusType {
    AbilityChecks,
    AC,
    AttackRolls,
    DamageRolls,
    SavingThrows,
    SpellAttackRolls,
}

export interface IBonus {
    type: BonusType;
    value: number;
    conditions?: string;
}

export enum AmmunitionType {
    Arrows,
    BlowgunNeedles,
    CrossbowBolts,
    SlingBullets,
}

export enum ArmorType {
    // light:
    Padded, // 5 gp, 11 + Dex modifier — Disadvantage; 8 lb.
    Leather, // 10 gp, 11 + Dex; 10 lb
    StuddedLeather, // 45 gp, 12 + Dex; 13 lb

    // med:
    Hide, // 10 gp, 12 + Dex (max 2); 12 lb
    ChainShirt, // 50 gb, 13 + Dex (max 2); 20lb
    ScaleMail, // 50 gp, 14 + Dex (max 2) — Disadvantage; 45 lb.
    Breastplate, // 400 gp, 14 + Dex (max 2); 20 lb
    HalfPlate, // 750 gp, 15 + Dex (max 2)— Disadvantage; 40 lb.

    // heavy:
    RingMail, // 30 gp, 14— Disadvantage; 40 lb.
    ChainMail, // 75 gp, 16, Str 13— Disadvantage; 55 lb.
    Splint, // 200 gp, 17, Str 15— Disadvantage; 60 lb.
    Plate, // 1500 gp, 18, Str 15— Disadvantage; 65 lb.

    // shield:
    Shield, // 10gp, +2; 6 lb
}

export enum WeaponType {
    // Simple Melee weapons
    Club,
    Dagger,
    Greatclub,
    Handaxe,
    Javelin,
    LightHammer,
    Mace,
    Quarterstaff,
    Sickle,
    Spear,

    // Simple Ranged Weapons
    LightCrossbow,
    Dart,
    Shortbow,
    Sling,

    // Martial Melee Weapons
    Battleaxe,
    Flail,
    Glaive,
    Greataxe,
    Greatsword,
    Halberd,
    Lance,
    Longsword,
    Maul,
    Morningstar,
    Pike,
    Rapier,
    Scimitar,
    Shortsword,
    Trident,
    WarPick,
    Warhammer,
    Whip,

    // Martial Ranged Weapons
    Blowgun,
    HandCrossbow,
    HeavyCrossbow,
    Longbow,
    Net,
}

export const slashingWeaponTypes = [
    WeaponType.Greatsword,
    WeaponType.Longsword,
    WeaponType.Scimitar,
    WeaponType.Shortsword,
];

export const swordWeaponTypes = [
    WeaponType.Greatsword,
    WeaponType.Longsword,
    WeaponType.Rapier,
    WeaponType.Scimitar,
    WeaponType.Shortsword,
];

export const axeWeaponTypes = [
    WeaponType.Handaxe,
    WeaponType.Battleaxe,
    WeaponType.Greataxe,
];

export const lightArmorTypes = [
    ArmorType.Padded, // 5 gp, 11 + Dex modifier — Disadvantage; 8 lb.
    ArmorType.Leather, // 10 gp, 11 + Dex; 10 lb
    ArmorType.StuddedLeather, // 45 gp, 11 + Dex; 13 lb
];

export const mediumArmorTypes = [
    // med:
    ArmorType.Hide, // 10 gp, 12 + Dex (max 2); 12 lb
    ArmorType.ChainShirt, // 50 gb, 13 + Dex (max 2); 20lb
    ArmorType.ScaleMail, // 50 gp, 14 + Dex (max 2) — Disadvantage; 45 lb.
    ArmorType.Breastplate, // 400 gp, 14 + Dex (max 2); 20 lb
    ArmorType.HalfPlate, // 750 gp, 15 + Dex (max 2)— Disadvantage; 40 lb.
];

export const heavyArmorTypes = [
    // heavy:
    ArmorType.RingMail, // 30 gp, 14— Disadvantage; 40 lb.
    ArmorType.ChainMail, // 75 gp, 16, Str 13— Disadvantage; 55 lb.
    ArmorType.Splint, // 200 gp, 17, Str 15— Disadvantage; 60 lb.
    ArmorType.Plate, // 1500 gp, 18, Str 15— Disadvantage; 65 lb.
];

export interface IItemUse {
    /**
     * Optional; unnecessary for items with a single use
     */
    label?: string;

    /**
     * Number of charges/uses, or a string indicating a dice roll
     * for an initial number of charges
     */
    charges: string | number;

    /**
     * A die roll, a constant number (including 0 to never regain
     * any charges), or omit to regain all uses
     */
    regains?: string | number;
}

export interface IItemVariant {
    name: string;
    rarity?: ItemRarity;
    extraInfo?: {[key: string]: string};
}

export interface IItemPart extends IPart {
    name: string;

    kind: ItemKind;
    rarity: ItemRarity;

    armorTypes?: ArmorType[];
    weaponTypes?: WeaponType[];

    /** where attunement is required */
    attunes?: boolean;

    bonuses?: IBonus[];

    uses?: IItemUse[];

    info?: Part[];

    // variants are generically different verions,
    // similar to ArmorType and WeaponType for items
    // that are neither
    variants?: IItemVariant[];
}

export enum SpellAreaType {
    // cylinder:
    Cylinder,

    // radial:
    Circle,
    Sphere,
    Cone,

    // rectangular:
    Cube,
    Line,
    Square,
}

export interface ISpellArea {
    type: SpellAreaType;
}

export interface ICylinderSpellArea extends IRadialSpellArea {
    height: number;
}

export interface IRadialSpellArea extends ISpellArea {
    radius: number;
}

export interface IRectangularSpellArea extends ISpellArea {
    width: number;
    length: number;
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

    save?: Ability;
    dice?: ISpellDice;
    area?: ISpellArea;
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
export type Part = ICreaturePart | IItemPart | ISpellPart | IStringPart | ITablePart;

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
