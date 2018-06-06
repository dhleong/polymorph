import * as chai from 'chai';

import { FormatSpan, Formatting } from '../../src/parser/interface';
import { StringPart } from '../../src/parser/string-part';

chai.should();

describe('StringPart', () => {
    describe('isOnlyWhitespace', () => {
        it('works', () => {
            new StringPart('  ').isOnlyWhitespace().should.be.true;
            new StringPart('a ').isOnlyWhitespace().should.be.false;
        });
    });

    describe('formatSpan handling', () => {
        it('picks formatting on create', () => {
            StringPart.from({
                fontName: 'g_d0_f8',

                str: 'Bold',
            }).formatting.should.deep.include(
                new FormatSpan(
                    Formatting.Bold,
                    0,
                    4,
                ),
            );
        });

        it('picks formatting on append', () => {
            const part = StringPart.from({
                str: 'Norm',
            });
            part.formatting.should.be.empty;

            part.append({
                fontName: 'g_d0_f5',

                str: 'BoldItalic',
            });

            part.formatting.should.deep.include(
                new FormatSpan(
                    Formatting.BoldItalic,
                    4,
                    10,
                ),
            );
        });

        it('repositions formatting on prepend', () => {
            const part = StringPart.from({
                fontName: 'g_d0_f3',

                str: 'Bold',
            });
            part.formatting.should.deep.equal([
                new FormatSpan(
                    Formatting.Bold,
                    0,
                    4,
                ),
            ]);

            part.prepend(StringPart.from({
                fontName: 'g_d0_f7',

                str: 'Italic',
            }));

            part.str.should.equal('Italic Bold');
            part.formatting.should.deep.equal([
                new FormatSpan(
                    Formatting.Italic,
                    0,
                    6,
                ),

                new FormatSpan(
                    Formatting.Bold,
                    7,
                    4,
                ),
            ]);
        });

        it('append combines FormatSpans', () => {
            const part = StringPart.from({
                fontName: 'g_d0_f3',

                str: 'Bold',
            });

            part.append({
                fontName: 'g_d0_f3',

                str: '+Also Bold',
            });

            part.formatting.should.deep.equal([
                new FormatSpan(
                    Formatting.Bold,
                    0,
                    14,
                ),
            ]);
        });

        it('append combines FormatSpans', () => {
            const part = StringPart.from({
                fontName: 'g_d0_f3',

                str: 'Bold',
            });

            part.prepend(StringPart.from({
                fontName: 'g_d0_f3',

                str: 'Also Bold',
            }));

            part.str.should.equal('Also Bold Bold');
            part.formatting.should.deep.equal([
                new FormatSpan(
                    Formatting.Bold,
                    0,
                    14,
                ),
            ]);
        });
    });
});
