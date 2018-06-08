import { ICreaturePart, IStringPart, PartType } from './interface';
import { Section } from './section';

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
}

export function alignmentFromString(alignmentStr: string): Alignment {
    if (alignmentStr === 'neutral') {
        return Alignment.TrueNeutral;
    } else {
        const [lawVsChaos, goodVsEvil] = alignmentStr
            .toLowerCase().split(' ');
        let align = 0;

        if (lawVsChaos[0] === 'n') {
            align += Alignment.NeutralGood;
        } else if (lawVsChaos[0] === 'c') {
            align += Alignment.ChaoticGood;
        }

        if (goodVsEvil[0] === 'n') {
            align += 1;
        } else if (goodVsEvil[0] === 'e') {
            align += 2;
        }

        return align;
    }
}

export enum Size {
    Tiny,
    Small,
    Medium,
    Large,
    Huge,
    Gargantuan,
}

const sizeByString = {
    gargantuan: Size.Gargantuan,
    huge: Size.Huge,
    large: Size.Large,
    medium: Size.Medium,
    small: Size.Small,
    tiny: Size.Tiny,
};

class Abilities {
    constructor(
        readonly str: number,
        readonly dex: number,
        readonly con: number,
        readonly int: number,
        readonly wis: number,
        readonly cha: number,
    ) {}
}

function splitByNumber(value: string): [number, string] {
    const first = parseInt(value, 10);
    const second = value
        .replace(first.toString(), '')
        .trim();

    return [first, second];
}

export class CreaturePart implements ICreaturePart {
    static from(sections: Section[]): CreaturePart {
        if (sections.length < 2) return;

        const creature = new CreaturePart();
        creature.name = sections[0].getHeader();

        const parts = sections[1].parts;
        if (!parts.length) return;

        const firstMap = (parts[0] as IStringPart).toMapBySpans();
        [creature.ac, creature.acSource] = splitByNumber(firstMap['Armor Class']);
        [creature.hp, creature.hpRoll] = splitByNumber(firstMap['Hit Points']);
        creature.speed = firstMap.Speed;

        const [sizeAndKind, alignmentStr] = firstMap[0].split(', ');
        const [sizeRaw, kind] = sizeAndKind.split(' ');
        creature.size = sizeByString[sizeRaw.toLowerCase()];
        creature.kind = kind;
        creature.align = alignmentFromString(alignmentStr);

        const nextMap = parts.length >= 3
            ? (parts[2] as IStringPart).toMapBySpans()
            : null;

        if (nextMap) {
            const rawAbilities: string = nextMap[0];
            const [str, dex, con, int, wis, cha] =
                rawAbilities.split(/\([-−\+0-9]+\)/)
                .map(raw => parseInt(raw.trim(), 10));
            creature.abilities = new Abilities(
                str, dex, con, int, wis, cha,
            );

            // TODO this could be an Abilities, perhaps?
            creature.savingThrows = nextMap['Saving Throws'];

            // TODO this could be a separate type,
            // eg: {passivePerception, darkvision, truesight, etc}
            creature.senses = nextMap.Senses;

            // TODO this could also be a separate type
            creature.skills = nextMap.Skills;

            creature.immunities = nextMap['Damage Immunities'];
            creature.resistances = nextMap['Damage Resistances'];
            creature.vulnerabilities = nextMap['Damage Vulnerabilities'];
            creature.conditionImmunities = nextMap['Condition Immunities'];

            creature.languages = nextMap.Languages;
            const [cr, rawExp] = splitByNumber(nextMap.Challenge);
            creature.cr = cr;
            creature.exp = parseInt(rawExp.replace(/[, ()]/g, ''), 10);
        }

        // TODO
        return creature;
    }

    type = PartType.CREATURE;

    name: string;
    size: Size;
    kind: string;
    align: Alignment;

    ac: number;
    acSource: string;
    hp: number;
    hpRoll: string;

    speed: string;

    abilities: Abilities;

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

    postProcess() {
        /* nop */
    }

    toJson() {
        return Object.assign({}, this);
    }
}
