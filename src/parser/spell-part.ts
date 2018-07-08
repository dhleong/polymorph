
import {
    ISection, ISpellPart, IStringPart,
    Part, PartType,
    SpellSchool,
} from './interface';
import { StringPart } from './string-part';

/**
 * Current parsing concatenates the first paragraph of
 * info on a Spell to the end of its Duration. There's
 * no obvious way to safely separate this into a separate
 * StringPart, so we split it up ourselves (for now...)
 * by finding the first capital letter.
 */
function findDurationSplitIndex(duration: string): number {
    // NOTE: skip i == 0 since that will probably be
    // upper case and confuse us since it's not
    // definitely not what we want, anyway
    for (let i = 1; i < duration.length; ++i) {
        if (duration[i].match(/[A-Z]/)) {
            return i;
        }
    }

    return -1;
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

        const info: Part[] = bodySection.parts.slice(1);

        const map = firstPart.toMapBySpans();
        const castTime = map['Casting Time'] || '';
        const components = map.Components || '';
        const range = map.Range || '';
        let duration = map.Duration || '';
        let concentration: boolean = false;
        if (duration.indexOf('Concentration') !== -1) {
            concentration = true;
        }

        const splitI = findDurationSplitIndex(duration);
        if (splitI !== -1) {
            const infoPart = duration.substring(splitI);
            duration = duration.substring(0, splitI).trimRight();
            info.splice(0, 0, new StringPart(infoPart));
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
    ) {}

    postProcess() {
        /* nop */
    }

    toJson() {
        return Object.assign({}, this);
    }
}
