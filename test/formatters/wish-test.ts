import * as chai from 'chai';

import { ISpellDice } from '../..';
import { generateDiceFn } from '../../src/formatters/wish';

chai.should();

function simpleDiceFn(dice: ISpellDice, level: number = 1) {
    return generateDiceFn(dice, level).replace(/\s+/g, ' ');
}

describe('generateDiceFn supports', () => {

    it('static dice/amounts', () => {
        simpleDiceFn({
            base: '1d6',
        }).should.equal(
            `"1d6"`,
        );
    });

    it('static number with scaling', () => {
        simpleDiceFn({
            base: '70',
            slotLevelBuff: '10',
        }, /* spell-level=*/ 6).should.equal(
            `(fn [spell-level] (str (+ 70 (* 10 (- spell-level 6)))))`,
        );
    });

    it('static dice with spell modifier', () => {
        simpleDiceFn({
            base: '1d6 + your spellcasting ability modifier',
        }).should.equal(
            `(fn [spell-mod] (str "1d6 + " spell-mod))`,
        );
    });

    it('spell slot scaling @ level 1', () => {
        simpleDiceFn({
            base: '1d6',
            slotLevelBuff: '1d6',
        }).should.equal(
            `(fn [spell-level] (str spell-level "d6"))`,
        );
    });

    it('spell slot scaling @ level 2', () => {
        simpleDiceFn({
            base: '2d8',
            slotLevelBuff: '1d8',
        }, /* spell-level=*/ 2).should.equal(
            `(fn [spell-level] (str spell-level "d8"))`,
        );
    });

    it('multiple slot scaling dice', () => {
        simpleDiceFn({
            base: '8d6',
            slotLevelBuff: '2d6',
        }, /* spell-level=*/ 6).should.equal(
            `(fn [spell-level] (str (+ 8 (* 2 (- spell-level 6))) "d6"))`,
        );
    });

    it('spell slot scaling w/more than one die @ level 1', () => {
        simpleDiceFn({
            base: '3d6',
            slotLevelBuff: '1d6',
        }).should.equal(
            `(fn [spell-level] (str (+ 2 spell-level) "d6"))`,
        );
    });

    it('spell slot scaling w/more than one die @ level 4', () => {
        simpleDiceFn({
            base: '3d10',
            slotLevelBuff: '1d10',
        }, /* spell-level=*/ 4).should.equal(
            // NOTE: simplified from 3 + spell-level - 4
            `(fn [spell-level] (str (+ -1 spell-level) "d10"))`,
        );
    });

    it('char level scaling', () => {
        simpleDiceFn({
            base: '1d10',
            charLevelBuff: '1d10',
        }).should.equal(
            `(fn [total-level] (str (cond ` +
            `(< total-level 5) 1 ` +
            `(< total-level 11) 2 ` +
            `(< total-level 17) 3 ` +
            `:else 4) "d10"))`,
        );
    });

});