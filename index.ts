#!/usr/bin/env ts-node

import { docopt } from 'docopt';
import { fs } from 'mz';

import { IFormatter } from './src/formatter';
import { parseFile } from './src/parser';
export { Parser, parseFile } from './src/parser';
export * from './src/parser-interface';

import { CompositeFormatter } from './src/formatters/composite';
import { DebugFormatter } from './src/formatters/debug';

const formatterFactories = {
    '--debug': (stream) => new DebugFormatter(stream),
};

function createFormatter(
    key: string,
    destination: string,
): IFormatter {
    const stream = (destination === '-' || destination === '')
        ? process.stdout
        : fs.createWriteStream(destination);
    return formatterFactories[key](stream);
}

async function main() {
    const version = require('./package.json').version;
    const opts = docopt(`
Usage:
    polymorph <srd.pdf> [options]
    polymorph -h | --help | --version

Options:
    --debug=<file>  Output debug-formatted output

Notes:
    A hyphen (-) can be used in place of any <file> to write to
    stdout. It is not recommended to do this for more than one format.
    `.trimRight(), {
        version: `polymorph ${version}`,
    });

    const sections = parseFile('/Users/dhleong/Documents/DND/SRD-OGL_V5.1.pdf');

    // create formatter(s)
    const formatters: IFormatter[] = [];
    for (const key of Object.keys(formatterFactories)) {
        if (opts[key]) {
            formatters.push(createFormatter(key, opts[key]));
        }
    }
    if (!formatters.length) {
        console.error('No output format options specified. Try polymorph -h');
        process.exit(1);
    }

    // composite formatters together
    const formatter: IFormatter = new CompositeFormatter(formatters);

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
