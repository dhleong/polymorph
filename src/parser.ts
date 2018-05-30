import { fs } from 'mz';

import { DepthTracker } from './depth-tracker';
import { normalizeString } from './format';
import { ITextItem, processPdf } from './pdf';

const stringIsOnlyWhitespace =
    (str: string): boolean =>
        str.match(/^[ ]+$/) != null;

export class StringPart {
    str: string;

    constructor(str: string) {
        this.str = str;
    }

    isOnlyWhitespace() {
        return stringIsOnlyWhitespace(this.str);
    }

    endsWithSpace(): boolean {
        return this.str.endsWith(' ');
    }

    toString(): string {
        return this.str;
    }
}

export class TablePart {

    rows: string[][];

    lastX = -1;
    lastY = Number.MAX_VALUE;
    lastHeight = Number.MAX_VALUE;

    constructor() {
        this.rows = [];
    }

    feed(item: ITextItem) {
        if (item.y < this.lastY) {
            this.rows.push([]);
        }

        this.rows[this.rows.length - 1].push(
            normalizeString(item.str),
        );

        this.lastX = item.x;
        this.lastY = item.y;
        this.lastHeight = item.height;
    }

    toString(): string {
        return 'TABLE: ' + JSON.stringify(this.rows, null, ' ');
    }
}

// union type of all part kinds
export type Part = StringPart | TablePart;

export class Section {
    /** value in Parser.headerLevels array */
    headerLevelValue: number;

    parts: Part[] = [];

    constructor(headerLevelValue) {
        this.headerLevelValue = headerLevelValue;
    }

    push(item: ITextItem) {
        if (item.fontName === 'g_d0_f6') {
            this.pushTablePart(item);
            return;
        }

        const tableToContinue = this.extractTablePartToContinue(item);
        if (tableToContinue) {
            tableToContinue.feed(item);
            return;
        }

        this.pushString(item.str);
    }

    pushString(str: string) {
        // const lastPart = this.parts[this.parts.length - 1];
        const partToContinue = this.extractStringPartToContinueFor(str);
        if (partToContinue) {
            partToContinue.str += normalizeString(str);
            return;
        }

        this.parts.push(new StringPart(normalizeString(str)));
    }

    pushTablePart(item: ITextItem) {
        const partToContinue = this.extractTablePartToContinue();
        if (partToContinue) {
            partToContinue.feed(item);
            return;
        }

        const newTable = new TablePart();
        newTable.feed(item);
        this.parts.push(newTable);
    }

    private extractTablePartToContinue(item?: ITextItem): TablePart {
        if (!this.parts.length) return;

        const last = this.parts[this.parts.length - 1];
        if (!(last instanceof TablePart)) return;

        // if no item provided, always return the table
        if (!item) return last;

        // if provided, compare with item
        if (item.height <= last.lastHeight) {
            // continue as long as our font size is smaller or matching
            return last;
        }
    }

    private extractStringPartToContinueFor(str: string): StringPart {
        if (!this.parts.length) return;

        if (str.startsWith('•')) {
            // bulleted list always gets a new part
            return;
        }

        if (stringIsOnlyWhitespace(str)) {
            // only-whitespace parts must always be added as-is.
            // this is so we can distinguish between an actual paragraph
            // break (indicated by two sets of only-whitespace) and just
            // ...some kind of PDF wackiness (indicated by a single
            // instance of a whitespace-only part).
            return;
        }

        const last = this.parts[this.parts.length - 1];
        if (!(last instanceof StringPart)) return;
        if (!last.isOnlyWhitespace()) {
            // if there's any text, continue it.
            return last;
        }

        if (this.parts.length < 2) return;

        // either there's a single whitespace, in which case we don't
        // want this and we'll continue `beforeLast` below, or there
        // are two whitespaces and they should both go since it's
        // a paragraph break.
        this.parts.pop();

        const beforeLast = this.parts[this.parts.length - 1];
        if (!(beforeLast instanceof StringPart)) return;
        if (beforeLast.isOnlyWhitespace()) {
            // don't continue, and remove the whitespace
            this.parts.pop();
            return;
        }

        // continue the non-whitespace-only
        if (!beforeLast.endsWithSpace()) {
            // fill in a missing space
            beforeLast.str += ' ';
        }

        return beforeLast;
    }
}

export class Parser {

    private headerLevels = new DepthTracker();

    private sections: Section[] = [];
    private currentSection: Section;

    async run(file: string) {
        const data = await fs.readFile(file);
        await processPdf(data, (page, content) => {
            this.processPage(this.skipFooters(content.items));
        });

        for (const section of this.sections) {
            const level = this.headerLevels.pickLevelFor(section.headerLevelValue);
            for (const part of section.parts) {
                console.log(' '.repeat(level), part.toString(), `[${level}]`);
            }
        }
    }

    async processPage(content: ITextItem[]) {
        for (const item of content) {
            // this will store it at an appropriate place in the headerLevels list
            this.headerLevels.feed(item.height);

            if (!this.currentSection || this.currentSection.headerLevelValue !== item.height) {
                const newSection = new Section(item.height);
                this.currentSection = newSection;
                this.sections.push(newSection);
            }

            this.currentSection.push(item);
        }
    }

    private skipFooters(items: ITextItem[]) {
        // is this safe to hard-code?
        const footersOffset = 10;
        return items.slice(footersOffset);
    }
}
