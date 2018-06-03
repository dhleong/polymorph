#!/usr/bin/env ts-node

import { IFormatter } from './src/formatter';
import { parseFile } from './src/parser';
export { Parser, parseFile } from './src/parser';
export * from './src/parser-interface';

import { DebugFormatter } from './src/formatters/debug';

async function main() {
    const sections = parseFile('/Users/dhleong/Documents/DND/SRD-OGL_V5.1.pdf');

    // create a formatter writing to stdout
    const formatter: IFormatter = new DebugFormatter(process.stdout);

    // process and format
    for await (const section of sections) {
        await formatter.format(section);
    }

    // finish up
    formatter.end();
}

if (require.main === module) {
    main().catch((e) => {
        console.error('ERROR!');
        console.error(e);
    });
}
