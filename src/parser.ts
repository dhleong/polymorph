import { fs } from 'mz';

import { DepthTracker } from './depth-tracker';
import { normalizeString } from './format';
import { ITextItem, processPdf } from './pdf';

export const TABLE_HEADER_FONT_NAME = 'g_d0_f6';

const UNNECESSARY_HEADER_COLS = new Set([
    'Spell Slots per Spell Level',
]);

const stringIsOnlyWhitespace =
    (str: string): boolean =>
        str.match(/^[ ]+$/) != null;

export class StringPart {
    static from(item: ITextItem): StringPart {
        return new StringPart(
            normalizeString(item.str),
            item.x,
            item.y,
            item.width,
        );
    }

    constructor(
        public str: string,
        readonly x: number = 0,
        readonly y: number = 0,
        public width: number = 0,
    ) { }

    append(item: ITextItem) {
        this.str += normalizeString(item.str);
        this.width += item.width;
    }

    prepend(item: StringPart) {
        this.str = item.str.trimRight() + ' ' + this.str.trimLeft();
    }

    /**
     * @return True if the column starting at our `.x` with
     *  our `.width` could contain the given `x` value
     */
    couldContain(x: number): boolean {
        return this.x <= x && x <= this.x + this.width;
    }

    postProcess() {
        this.str = this.str.trimRight();
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

    valueOf(): string {
        return this.str;
    }
}

export class TablePart {

    headers: StringPart[][] = [];
    rows: StringPart[][] = [];

    lastX = -1;
    lastY = Number.MAX_VALUE;
    lastHeight = Number.MAX_VALUE;

    feed(item: ITextItem) {
        const destination = (item.fontName === TABLE_HEADER_FONT_NAME)
            ? this.headers
            : this.rows;

        if (item.y < this.lastY || !destination.length) {

            if (destination === this.headers && destination.length) {
                this.trimUnnecessaryHeaderRows();
            }

            destination.push([]);
        }

        const resumePart: StringPart = this.extractResumePart(
            destination,
            item,
        );
        if (resumePart) {
            resumePart.append(item);
        } else {
            const row = destination[destination.length - 1];
            row.push(StringPart.from(item));
        }

        this.lastX = item.x;
        this.lastY = item.y;
        this.lastHeight = item.height;
    }

    postProcess() {
        // TODO much more, probably

        for (const row of this.headers) {
            if (row[row.length - 1].isOnlyWhitespace()) {
                row.pop();
            }
        }

        // merge vertically-aligned headers in separate rows
        if (this.headers.length === 3) {
            // merge vertically-aligned headers *down*
            for (const mergeCandidate of this.headers[1]) {
                if (mergeCandidate.isOnlyWhitespace()) continue;

                const mergeCenter = mergeCandidate.x + mergeCandidate.width / 2;
                for (const destCandidate of this.headers[2]) {
                    if (destCandidate.couldContain(mergeCenter)) {
                        destCandidate.prepend(mergeCandidate);
                        break;
                    }
                }
            }

            // remove the old row
            this.headers.splice(1, 1);
        } else if (this.headers.length > 3) {
            console.warn('Unexpected number of header rows: ' + JSON.stringify(this.headers, null, ' '));
        }

        for (const row of this.rows) {
            if (row[row.length - 1].isOnlyWhitespace()) {
                row.pop();
            }
        }
    }

    toJson() {
        return {
            headers: this.headers.map(row =>
                row.map(p => p.str),
            ),

            rows: this.rows.map(row =>
                row.map(p => p.str),
            ),
        };
    }

    toString(): string {
        return 'TABLE: ' + JSON.stringify(
            this.toJson(), null, ' ',
        );
    }

    private trimUnnecessaryHeaderRows() {
        const lastHeaderRow = this.headers[this.headers.length - 1];
        let isAllWhitespace = true;
        for (const col of lastHeaderRow) {
            if (isAllWhitespace && col.str.length && !col.isOnlyWhitespace()) {
                isAllWhitespace = false;
            }
            if (UNNECESSARY_HEADER_COLS.has(col.str)) {
                this.headers.pop();
                return;
            }
        }

        if (isAllWhitespace) {
            this.headers.pop();
        }
    }

    private extractResumePart(destination: StringPart[][], item: ITextItem): StringPart {
        const row = destination[destination.length - 1];
        if (!row.length) {
            return this.consolidateColumnCell(destination, item);
        }

        const last = row[row.length - 1];
        const lastIsOnlyWhitespace = last.isOnlyWhitespace();

        if (lastIsOnlyWhitespace
            && row.length > 1
            && !row[row.length - 2].isOnlyWhitespace()
        ) {
            // can't resume, but *can* clean up excess whitespace
            row.pop();

            // well... maybe...
            return this.detectSplitColumn(row, item);
        }

        const itemIsOnlyWhitespace = stringIsOnlyWhitespace(item.str);
        if (!lastIsOnlyWhitespace
            && !itemIsOnlyWhitespace
            && this.itemShouldShareColumnWith(item, last)
        ) {
            return last;
        }
    }

    private detectSplitColumn(row: StringPart[], item: ITextItem): StringPart {
        // table headers aren't split across 2-column pages
        if (item.fontName === TABLE_HEADER_FONT_NAME) return;

        let candidate: StringPart;
        for (const col of row) {
            if (item.y <= col.y) return;
            if (item.x <= col.x + col.width) return;

            if (!candidate && col.endsWithSpace()) {
                candidate = col;
            }
        }

        // okay, higher on the page and further-right on the page
        // than anyone else in this row...
        // If anyone ends with whitespace, that's our guy (hopefully).

        return candidate;
    }

    private itemShouldShareColumnWith(item: ITextItem, last: StringPart): boolean {
        // guess which column `last` belongs to, then see if
        // item.x is within that range
        for (const header of this.headers[0]) {
            if (header.couldContain(last.x)) {
                return header.couldContain(item.x);
            }
        }

        return false;
    }

    private consolidateColumnCell(
        destination: StringPart[][],
        item: ITextItem,
    ) {
        if (destination.length < 2) return;
        const prevRow = destination[destination.length - 2];

        if (!prevRow.length) return;
        const last = prevRow[prevRow.length - 1];

        const lastIsOnlyWhitespace = last.isOnlyWhitespace();
        const itemIsOnlyWhitespace = stringIsOnlyWhitespace(item.str);

        if (!lastIsOnlyWhitespace
            && item.y < last.y
            && !itemIsOnlyWhitespace
        ) {
            destination.pop();
            return last;
        }

        // TODO handle split across page

        if (lastIsOnlyWhitespace && prevRow.length > 1) {
            const possibleColumn = prevRow[prevRow.length - 2];
            if (!possibleColumn.isOnlyWhitespace()
                && possibleColumn.x === item.x
            ) {
                prevRow.pop();
                destination.pop();
                possibleColumn.str += ' ';
                return possibleColumn;
            }
        }
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

    postProcess() {
        this.parts.forEach(p => p.postProcess());
    }

    push(item: ITextItem) {
        if (item.fontName === TABLE_HEADER_FONT_NAME) {
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
        await processPdf(data, (page, content) =>
            this.processPage(this.skipFooters(content.items)),
        );

        for (const section of this.sections) {
            section.postProcess();

            const level = this.headerLevels.pickLevelFor(section.headerLevelValue);
            for (const part of section.parts) {
                console.log(' '.repeat(level), part.toString(), `[${level}]`);
            }
        }
    }

    processPage(content: ITextItem[]) {
        for (const item of content) {
            // this will store it at an appropriate place in the headerLevels list
            this.headerLevels.feed(item.height);

            if ((!this.currentSection || this.currentSection.headerLevelValue !== item.height)
                    && !this.shouldMergeTable(item)) {
                const newSection = new Section(item.height);
                this.currentSection = newSection;
                this.sections.push(newSection);
            }

            this.currentSection.push(item);
        }
    }

    private shouldMergeTable(item: ITextItem): boolean {
        if (item.fontName !== TABLE_HEADER_FONT_NAME) return false;
        if (!this.currentSection) return false;

        const parts = this.currentSection.parts;
        if (!parts.length) return false;

        const lastPart = parts[parts.length - 1];
        if (!(lastPart instanceof TablePart)) return false;

        return !lastPart.rows.length;
    }

    private skipFooters(items: ITextItem[]) {
        // is this safe to hard-code?
        const footersOffset = 10;
        return items.slice(footersOffset);
    }
}
