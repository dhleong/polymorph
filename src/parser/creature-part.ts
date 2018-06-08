import { ICreaturePart, IStringPart, PartType } from './interface';
import { Section } from './section';

class Abilities {
    constructor(
        readonly str: number,
        readonly dex: number,
        readonly con: number,
        readonly int: number,
        readonly wis: number,
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

        const nextMap = parts.length >= 3
            ? (parts[2] as IStringPart).toMapBySpans()
            : null;

        if (nextMap) {
            const rawAbilities: string = nextMap[0];
            const [str, dex, con, int, wis] =
                rawAbilities.split(/\([-−\+0-9]+\)/)
                .map(raw => parseInt(raw.trim(), 10));
            creature.abilities = new Abilities(
                str, dex, con, int, wis,
            );
        }

        // TODO
        return creature;
    }

    type = PartType.CREATURE;

    name: string;

    ac: number;
    acSource: string;
    hp: number;
    hpRoll: string;

    speed: string;

    abilities: Abilities;

    postProcess() {
        /* nop */
    }

    toJson() {
        return Object.assign({}, this);
    }
}
