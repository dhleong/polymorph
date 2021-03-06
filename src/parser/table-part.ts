
import { ITextItem } from '../pdf';
import {
    ITablePart,
    PartType,
} from './interface';
import { StringPart } from './string-part';
import {
    stringIsOnlyWhitespace,
    TABLE_HEADER_FONT_NAME,
} from './utils';

const UNNECESSARY_HEADER_COLS = new Set([
    'Spell Slots per Spell Level',
    'Spell    Slots    per    Spell    Level',
    '—',
]);

export class TablePart implements ITablePart {

    readonly type = PartType.TABLE;

    headers: StringPart[][] = [];
    rows: StringPart[][] = [];

    lastHeight = Number.MAX_VALUE;

    private lastY = Number.MAX_VALUE;

    feed(item: ITextItem) {
        const destination = (item.fontName === TABLE_HEADER_FONT_NAME)
            ? this.headers
            : this.rows;

        if (this.itemStartsNewRow(item) || !destination.length) {

            if (destination === this.headers && destination.length) {
                this.trimUnnecessaryHeaderRows();
            } else if (destination.length) {
                // update effective width of header columns
                const headersRow = this.pickActualHeadersRow();
                const lastRow = destination[destination.length - 1];
                for (let i = 0; i < lastRow.length; ++i) {
                    if (i >= headersRow.length) {
                        console.warn('More cols in row than headers:\n',
                            this.headers[0].join(''), '\n',
                            lastRow.map(it => it.str), '\n',
                            headersRow.map(it => it.str),
                        );
                        break;
                    }

                    const itemsWidth = lastRow[i].width;
                    headersRow[i].effectiveWidth = Math.max(
                        headersRow[i].effectiveWidth,
                        itemsWidth,
                    );
                }
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
            // attempt to handle a split table
            this.startSplitTableRowWith(item);

            const row = destination[destination.length - 1];
            row.push(StringPart.from(item));
        }

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
                if (UNNECESSARY_HEADER_COLS.has(mergeCandidate.str)) continue;

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

        const headerColumns = this.headers[0].length;
        for (let i = 0; i < this.rows.length; ++i) {
            const row = this.rows[i];
            if (row.length && row[row.length - 1].isOnlyWhitespace()) {
                row.pop();
            }

            // clean out empty rows
            if (!row.length) {
                this.rows.splice(i, 1);
                --i;
                continue;
            }

            // detect split rows and merge them into the previous row
            if (row.length < headerColumns && i > 0) {
                const parentRow = this.rows[i - 1];
                for (let j = 0; j < row.length; ++j) {
                    const cell = row[row.length - 1 - j];
                    const dest = parentRow[parentRow.length - 1 - j];
                    if (dest) {
                        dest.append(cell);
                    }
                }

                this.rows.splice(i, 1);
                --i;
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

    clone(): TablePart {
        const clone = new TablePart();
        clone.headers = this.headers.slice();
        clone.rows = this.rows; // shallow copy
        return clone;
    }

    private itemStartsNewRow(item: ITextItem): boolean {
        // return item.y < this.lastY;

        const delta = this.lastY - item.y;
        if (Math.abs(delta) < 1) {
            // ignore small deltas
            return false;
        }

        if (delta > 0) {
            // item.y < last.y; simple case, it's lower on the page
            return true;
        }

        const headers = this.pickActualHeadersRow();
        if (item.x <= headers[0].x) {
            // new page... crap
            return true;
        }

        // if (delta < 0) {
        //     // higher on the page. If it's a new column, it should
        //     // be a new row
        //     const lastHeaderRow = this.headers[this.headers.length - 1];
        //     const rightmostHeader = lastHeaderRow[lastHeaderRow.length - 1];
        //     if (item.x > rightmostHeader.x + rightmostHeader.width) {
        //         return true;
        //     }
        // }

        return false;
    }

    /**
     * If the item belongs to the first column of a split table
     * (such as level 16 of the Fighter table), then this will
     * create a new row and return True.
     *
     * Note that this has to be separate from `itemStartsNewRow`
     * in order to be able to handle a column continued in a spli
     * table, such as for "Relentless / Rage" from The Barbarian.
     */
    private startSplitTableRowWith(item: ITextItem): boolean {
        if (!this.rows.length) return false;

        const lastRow = this.rows[this.rows.length - 1];
        if (!lastRow.length) return false;

        const lastItem = lastRow[lastRow.length - 1];
        if (item.y <= lastItem.y) return false;

        // higher on the page. If it's a new column, it should
        // be a new row
        const lastHeaderRow = this.headers[this.headers.length - 1];
        const rightmostHeader = lastHeaderRow[lastHeaderRow.length - 1];
        if (item.x > rightmostHeader.x + rightmostHeader.width) {
            this.rows.push([]);
            return true;
        }

        return false;
    }

    private trimUnnecessaryHeaderRows() {
        const lastHeaderRow = this.headers[this.headers.length - 1];
        let isAllWhitespace = true;
        for (const col of lastHeaderRow) {
            if (isAllWhitespace && col.str.length && !col.isOnlyWhitespace()) {
                isAllWhitespace = false;
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

        let last = row[row.length - 1];
        let lastIsOnlyWhitespace = last.isOnlyWhitespace();
        let followedWhitespace = false;

        if (lastIsOnlyWhitespace
            && row.length > 1
        ) {
            // can't resume, but *can* clean up excess whitespace
            row.pop();

            const beforeLast = row[row.length - 2];
            if (stringIsOnlyWhitespace(item.str)
                && beforeLast
                && !beforeLast.isOnlyWhitespace()
            ) {
                row.push(new StringPart(''));
            }

            // well... maybe...
            const splitColumn = this.detectSplitColumn(row, item);
            if (splitColumn || item.fontName === TABLE_HEADER_FONT_NAME) {
                // NOTE: table headers don't need to try to share columns;
                // just abide by this result:
                return splitColumn;
            }

            lastIsOnlyWhitespace = false; // not anymore
            last = row[row.length - 1]; // new last
            followedWhitespace = true;
        }

        const itemIsOnlyWhitespace = stringIsOnlyWhitespace(item.str);
        const isHeaderPart = destination === this.headers;
        if (isHeaderPart && UNNECESSARY_HEADER_COLS.has(item.str)) {
            return;
        }

        if (!lastIsOnlyWhitespace
            && !itemIsOnlyWhitespace
            && (isHeaderPart || this.itemShouldShareColumnWith(item, last))
        ) {
            if (followedWhitespace) {
                last.appendString(' ');
            }
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
        if (last.isEmptyColumn()) {
            // never
            return false;
        }

        if (last.endsWithComma() || item.str.startsWith(', ')) {
            return true;
        }
        if (!last.endsWithSpace() && !item.str.startsWith(' ')
            && last.y === item.y
            && Math.abs(item.x - (last.x + last.width)) < 0.1
        ) {
            // same line, right after previous... seems like a
            // strong indicator to me
            return true;
        }

        // guess which column `last` belongs to, then see if
        // item.x is within that range
        for (const header of this.pickActualHeadersRow()) {
            if (header.couldContain(last.x)) {
                if (header.couldContain(item.x)) {
                    return true;
                }
                break;
            }
        }

        return false;
    }

    private pickActualHeadersRow(): StringPart[] {
        if (!this.headers.length) return;

        // I *think* it's always the bottom-most?
        return this.headers[this.headers.length - 1];
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
            && (
                item.y < last.y
                || last.endsWithSpace()
            )
            && !itemIsOnlyWhitespace
        ) {
            destination.pop();
            return last;
        }

        if (lastIsOnlyWhitespace && prevRow.length > 1) {
            const possibleColumn = prevRow[prevRow.length - 2];
            if (!possibleColumn.isOnlyWhitespace()
                && possibleColumn.height === item.height
                && possibleColumn.couldContain(item.x + item.width / 2)
            ) {
                prevRow.pop();
                destination.pop();
                possibleColumn.str += ' ';
                return possibleColumn;
            }
        }
    }
}
