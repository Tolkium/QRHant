/** Decorative card art variants — ported from design/index.html (4 rotating scenes). */

export type KanjiStyle = 'parch' | 'ink' | 'red';

export interface ZenVariant {
  kanji: string;
  kanjiStyle: KanjiStyle;
  found: boolean;
}

const ZEN_KANJI: ZenVariant[] = [
  { kanji: '狩', kanjiStyle: 'parch', found: true },
  { kanji: '発', kanjiStyle: 'ink', found: true },
  { kanji: '未', kanjiStyle: 'red', found: false },
  { kanji: '秘', kanjiStyle: 'ink', found: false },
];

export function zenVariant(index: number, found: boolean): ZenVariant {
  const base = ZEN_KANJI[index % 4];
  if (base.found === found) return base;
  return found
    ? { kanji: base.kanji, kanjiStyle: base.kanjiStyle === 'red' ? 'ink' : base.kanjiStyle, found: true }
    : { kanji: base.kanji, kanjiStyle: 'red', found: false };
}

export function cardVariant(index: number): number {
  return index % 4;
}
