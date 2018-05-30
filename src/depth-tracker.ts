
// ts doesn't seem to like the defs that come with this lib :\
// import * as bs from 'binary-search';
const bs = require('binary-search'); // tslint:disable-line

const bsComparator = (element, needle) => needle - element;

export class DepthTracker {
    private depths: number[] = [];

    feed(value: number) {
        this.pickLevelFor(value);
    }

    pickLevelFor(height: number): number {
        const index = bs(this.depths, height, bsComparator);
        if (index >= 0) {
            return index;
        }

        const insertAt = -index - 1;

        this.depths.splice(insertAt, 0, height);
        return insertAt;
    }

}
