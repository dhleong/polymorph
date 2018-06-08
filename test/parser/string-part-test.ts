import * as chai from 'chai';

import { FormatSpan, Formatting } from '../../src/parser/interface';
import { StringPart } from '../../src/parser/string-part';

import { JsonParser } from '../test-utils';

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

        it('prepend combines FormatSpans', () => {
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

    describe('toMapBySpans', () => {
        it('puts labels without content', () => {
            // tslint:disable-next-line
            const json = {type: 'text', text: 'Large aberration, lawful evil Armor Class 17 (natural armor) Hit Points 135 (18d10 + 36) Speed 10 ft., swim 40 ft.', spans: [{style: 'i', start: 0, length: 29}, {style: 'b', start: 30, length: 11}, {style: 'b', start: 61, length: 10}, {style: 'b', start: 89, length: 5}]};
            const part = JsonParser.text(json);
            const map = part.toMapBySpans();
            map.should.have.property('Hit Points')
                .that.equals('135 (18d10 + 36)');
            map.should.have.property('0')
                .that.equals('Large aberration, lawful evil');
        });

        it('handles indexed content before spans', () => {
            // tslint:disable-next-line
            const json = {"type":"text","text":"21 (+5) 9 (−1) 15 (+2) 18 (+4) 15 (+2) 18 (+4) Saving Throws Con +6, Int +8, Wis +6 Skills History +12, Perception +10 Senses darkvision 120 ft., passive Perception 20 Languages Deep Speech, telepathy 120 ft. Challenge 10 (5,900 XP)","spans":[{"style":"b","start":47,"length":13},{"style":"b","start":84,"length":6},{"style":"b","start":119,"length":6},{"style":"b","start":168,"length":9},{"style":"b","start":209,"length":9}]};
            const part = JsonParser.text(json);
            const map = part.toMapBySpans();
            map.should.have.property('0')
                .that.equals('21 (+5) 9 (−1) 15 (+2) 18 (+4) 15 (+2) 18 (+4)');
        });
    });
});
