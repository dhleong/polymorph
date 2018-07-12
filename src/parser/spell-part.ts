
import { StringPart } from '../parser';
import {
    Ability, ISection, ISpellDice,
    ISpellPart, IStringPart,
    Part,
    PartType,
    SpellAttackType,
    SpellSchool,
} from './interface';

function abilityFromStr(str: string): Ability {
    switch (str.toLowerCase()) {
    case 'strength':
        return Ability.Str;
    case 'dexterity':
        return Ability.Dex;
    case 'constitution':
        return Ability.Con;
    case 'intelligence':
        return Ability.Int;
    case 'wisdom':
        return Ability.Wis;
    case 'charisma':
        return Ability.Cha;
    }
}

export function extractSave(str: string): Ability {
    // saves?
    const m = str.match(/(?:make[s]?|succeed on) a ([a-zA-Z]+) saving/);
    if (m) {
        return abilityFromStr(m[1]);
    }
}

function extractSaveFrom(info: Part[]): Ability {
    for (const p of info) {
        if (p.type !== PartType.STRING) continue;

        const str = (p as IStringPart).str;
        const save = extractSave(str);
        if (save) {
            return save;
        }
    }
}

function extractDiceInfo(info: Part[]): ISpellDice {
    const result: ISpellDice = {};

    for (const p of info) {
        if (p.type !== PartType.STRING) continue;

        const str = (p as IStringPart).str;
        let m = str.match(/(\d+[dD]\d+(?: [+] [^ ]+)?) ([a-zA-Z]+) damage/);
        if (m) {
            result.base = m[1];
            result.damageType = m[2];
        }

        // healing spells are tricky
        m = str.match(/regain[s]?(?: a number of)? hit points equal to (\d+[dD]\d+( [+] [^.]+)?)/);
        if (m) {
            result.base = m[1];
        }

        m = str.match(/regain[s]? (\d+([dD]\d+)?( [+] [^.]+)?) hit points/);
        if (m) {
            result.base = m[1];
        }

        // slot / char level scaling
        m = str.match(/increases by (\d+([dD]\d+)?) for each slot/);
        if (m) {
            result.slotLevelBuff = m[1];
        }

        m = str.match(/increases by (\d+[dD]\d+) when you reach/);
        if (m) {
            result.charLevelBuff = m[1];
        }

        // spell attack type
        m = str.match(/[Mm]ake a ([a-z]+) spell attack/);
        if (m) {
            if (m[1] === 'ranged') {
                result.attackType = SpellAttackType.Ranged;
            } else if (m[1] === 'melee') {
                result.attackType = SpellAttackType.Melee;
            }
        }
    }

    if (result.base) {
        return result;
    }
}

export class SpellPart implements ISpellPart {
    static from(
        nameSection: ISection,
        bodySection: ISection,
    ): SpellPart {
        const name = (nameSection.parts[0] as IStringPart).str;
        const firstPart = bodySection.parts[0] as IStringPart;
        const fmts = firstPart.formatting;

        let levelAndSchool = '';
        let level: number = 0;
        if (fmts.length > 0) {
            levelAndSchool = firstPart.get(fmts[0]).toLowerCase();
            level = levelAndSchool.includes('cantrip')
                ? 0
                : parseInt(levelAndSchool[0], 10);
        }

        let school: SpellSchool;
        for (const schoolName in SpellSchool) {
            if (typeof(SpellSchool[schoolName]) !== 'number') continue;

            if (levelAndSchool.indexOf(schoolName.toLowerCase()) !== -1) {
                // we've verified this is a valid cast above, but
                // typescript isn't having it unless we trick it
                school = (SpellSchool[schoolName] as any) as SpellSchool;
                break;
            }
        }
        const ritual: boolean = levelAndSchool.indexOf('ritual') !== -1;

        let info: Part[];
        let castTime = '';
        let components = '';
        let range = '';
        let duration = '';
        let concentration = false;

        // NOTE: skip the first part; we looked at it above
        for (let i = 1; i < bodySection.parts.length; ++i) {
            const part = bodySection.parts[i];
            const map = (part as IStringPart).toMapBySpans();
            if (map['Casting Time']) {
                castTime = map['Casting Time'];
            } else if (map.Components || map.Component) {
                components = map.Components || map.Component;
            } else if (map.Range) {
                range = map.Range;
            } else if (map.Duration) {
                duration = map.Duration;
                if (duration.indexOf('Concentration') !== -1) {
                    concentration = true;
                }
            } else {
                // must've started the info
                info = bodySection.parts.slice(i)
                    .filter(it =>
                        !(it instanceof StringPart)
                        || it.str !== '',
                    );
                break;
            }
        }

        return new SpellPart(
            name,
            level,
            school,
            concentration,
            ritual,
            castTime,
            range,
            components,
            duration,
            info,

            extractSaveFrom(info),
            extractDiceInfo(info),
        );
    }

    type = PartType.SPELL;

    constructor(
        readonly name: string,
        readonly level: number,
        readonly school: SpellSchool,
        readonly concentration: boolean,
        readonly ritual: boolean,
        readonly castTime: string,
        readonly range: string,
        readonly components: string,
        readonly duration: string,
        readonly info: Part[],

        readonly save?: Ability,
        readonly dice?: ISpellDice,
    ) {}

    postProcess() {
        /* nop */
    }

    toJson() {
        return Object.assign({}, this);
    }
}
