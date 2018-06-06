
import {
    ISection, ISpellPart, IStringPart,
    Part, PartType,
    SpellSchool,
} from './interface';

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
            level = levelAndSchool[0] === 'c'
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

        // TODO:
        let castTime: string = '';
        let range: string = '';
        let components: string = '';

        let duration: string = '';
        let concentration: boolean = false;

        for (let i = 0; i < fmts.length; ++i) {
            const fmt = fmts[i];
            const label = firstPart.get(fmt)
                .replace(/[:]/, '')
                .trim();

            const nextStringEnd = i + 1 < fmts.length
                ? fmts[i + 1].start
                : firstPart.str.length;

            const nextString = firstPart.str.substring(
                fmt.start + fmt.length,
                nextStringEnd,
            ).trim();

            switch (label) {
            case 'Casting Time':
                castTime = nextString;
                break;

            case 'Components':
                components = nextString;
                break;

            case 'Range':
                range = nextString;
                break;

            case 'Duration':
                duration = nextString;

                if (duration.indexOf('Concentration') !== -1) {
                    concentration = true;
                }
                break;
            }
        }

        const info: Part[] = bodySection.parts.slice(1);

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
        return this;
    }
}
