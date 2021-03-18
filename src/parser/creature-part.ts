import {
    Alignment,
    IAbilities,
    ICreaturePart,
    IStringPart, PartType,
    Size,
} from './interface';
import { Section } from './section';

export function alignmentFromString(alignmentStr: string): Alignment {
    try {
        if (alignmentStr === 'unaligned') {
            return Alignment.Unaligned;
        } else if (alignmentStr.startsWith('any')) {
            return Alignment.Any;
        } else if (alignmentStr === 'neutral') {
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
    } catch (e) {
        throw new Error(`Failed to parse alignment '${alignmentStr}': ${e.message}`);
    }
}

const sizeByString = {
    gargantuan: Size.Gargantuan,
    huge: Size.Huge,
    large: Size.Large,
    medium: Size.Medium,
    small: Size.Small,
    tiny: Size.Tiny,
};

class Abilities implements IAbilities {
    constructor(
        readonly str: number,
        readonly dex: number,
        readonly con: number,
        readonly int: number,
        readonly wis: number,
        readonly cha: number,
    ) {}
}

function getArmorClass(map: any): string {
    if (map['Armor Class']) {
        return map['Armor Class'];
    }

    if (map.Armor) {
        return map.Armor.replace('Class ', '');
    }
}

function splitByNumber(value: string): [number, string] {
    const first = parseInt(value, 10);
    const second = value
        .replace(first.toString(), '')
        .trim();

    return [first, second];
}

function splitAt(
    value: string,
    splitI: number,
    separatorWidth: number = 1,
): [string, string] {
    return [
        value.substring(0, splitI),
        value.substring(splitI + separatorWidth),
    ];
}

const fractionalChallengeRatings = {
    '1/2': 0.5,
    '1/4': 0.25,
    '1/8': 0.125,
};

function parseChallengeExp(value: string): {cr: number, exp: string} {
    const m = value.match(/([0-9\/]+) \(([0-9,]+) xp\)/i);
    if (!m) throw new Error(`Could not parse CR+EXP: ${value}`);

    const rawChallenge = m[1];
    const exp = m[2];

    const cr = fractionalChallengeRatings[rawChallenge] || parseInt(rawChallenge, 10);

    return {
        cr,
        exp,
    };
}

function combineFirstMapParts(parts: any[]): [any, IStringPart[]] {
    const [first, ...remainingParts] = parts;
    let map = (first as IStringPart).toMapBySpans();
    if (Object.keys(map).length === 1 && map['0']) {
        // combine singular map parts:
        while (remainingParts.length) {
            const nextMap = (remainingParts[0] as IStringPart).toMapBySpans();
            if (nextMap['0']) {
                // we've hit the abilities table
                break;
            }

            remainingParts.splice(0, 1);
            map = {
                ...map,
                ...nextMap,
            };
        }
    }

    return [map, remainingParts];
}

export class CreaturePart implements ICreaturePart {
    static from(sections: Section[]): CreaturePart {
        if (sections.length < 2) return;

        try {
            const part = CreaturePart.parseUnsafe(sections);

            // if (!part && !sections[0].canHaveTables) {
            //     console.warn('Unable to parse:', JSON.stringify(sections));
            // }

            return part;
        } catch (e) {
            const message = `Error parsing creature '${sections[0].getHeader()}':\n  ${e.stack}`;
            throw new Error(message);
        }
    }

    private static parseUnsafe(sections: Section[]): CreaturePart {
        const creature = new CreaturePart();
        const nameSection = sections[0].clone();
        nameSection.parts = nameSection.parts
            .filter(p => (p as IStringPart).str !== '');
        creature.name = nameSection.getHeader();

        // sections like the half-dragon template
        if (sections[1].canHaveTables) return;

        const [firstMap, parts] = combineFirstMapParts(sections[1].parts);
        if (!Object.keys(firstMap).length) return;

        const rawAC = getArmorClass(firstMap);
        if (!rawAC) {
            // things like "Black Dragon" that are just a header for
            // variants
            return;
        }

        if (!firstMap['Hit Points']) {
            throw new Error(JSON.stringify(firstMap));
        }

        [creature.ac, creature.acSource] = splitByNumber(rawAC);
        [creature.hp, creature.hpRoll] = splitByNumber(firstMap['Hit Points']);
        creature.speed = firstMap.Speed;

        creature.readSizeKindAlign(firstMap['0']);

        const nextMap = parts.length >= 2
            ? (parts[1] as IStringPart).toMapBySpans()
            : null;

        if (nextMap) {
            const rawAbilities: string = nextMap['0'];
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
            console.log(nextMap.Challenge);
            const {cr, exp} = parseChallengeExp(nextMap.Challenge);
            creature.cr = cr;
            creature.exp = parseInt(exp.replace(/[, ()]/g, ''), 10);
        }

        // TODO: future work could split up these parts by formatting
        for (let i = 2; i < parts.length; ++i) {
            if (!creature.info) creature.info = [];
            creature.info.push(parts[i] as IStringPart);
        }

        for (let i = 2; i < sections.length; ++i) {
            if (!creature.info) creature.info = [];
            creature.info.push(...sections[i].parts as IStringPart[]);
        }

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

    // NOTE: this property is lazy-init'd so it can be omitted
    // for any creature that doesn't have any text parts
    info: IStringPart[];

    postProcess() {
        /* nop */
    }

    readSizeKindAlign(input: string) {
        const splitI = input.lastIndexOf(', ');
        const [sizeAndKind, alignmentStr] = splitAt(input, splitI, 2);

        const sizeKindSplitI = sizeAndKind.indexOf(' ');
        const [sizeRaw, kind] = splitAt(sizeAndKind, sizeKindSplitI);
        this.size = sizeByString[sizeRaw.toLowerCase()];
        this.kind = kind;
        this.align = alignmentFromString(alignmentStr);

        if (!this.size) {
            console.log(input);
        }
    }

    toJson() {
        return Object.assign({}, this);
    }
}
