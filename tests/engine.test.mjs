import test from 'node:test';
import assert from 'node:assert/strict';
import { archetypes, questions, zodiacSigns, zodiacReadings, astroCombinations, getAstroCombination, zodiacSign, scoreAnswers } from '../engine.js';

test('quiz has sixteen distinct prompts and four scored options each', () => {
  assert.equal(questions.length, 16);
  assert.equal(new Set(questions.map(q => q.text)).size, 16);
  for (const q of questions) {
    assert.equal(q.options.length, 4, q.text);
    for (const option of q.options) {
      assert.ok(option.label.length > 12);
      assert.equal(Object.keys(option.scores).length, 1);
      assert.ok(archetypes.some(type => type.id in option.scores));
    }
  }
});

test('all eight archetypes are reachable and have a stable tie rule', () => {
  assert.equal(archetypes.length, 8);
  const targetIds = new Set();
  for (const target of archetypes) {
    const answers = questions.map(q => {
      const matching = q.options.findIndex(option => target.id in option.scores);
      return matching < 0 ? 0 : matching;
    });
    const result = scoreAnswers(answers);
    assert.equal(result.archetype.id, target.id);
    targetIds.add(result.archetype.id);
  }
  assert.equal(targetIds.size, 8);
  assert.equal(scoreAnswers([]).archetype.id, archetypes[0].id);
});

test('each archetype has every required editorial field and a 150–250 word roast', () => {
  for (const type of archetypes) {
    assert.ok(type.title && type.short && type.quote && type.illustration);
    assert.equal(type.situations.length, 5, type.id);
    assert.equal(type.strengths.length, 3, type.id);
    assert.equal(type.habits.length, 3, type.id);
    assert.equal(type.tips.length, 3, type.id);
    const words = `${type.roast} ${type.roastMore}`.trim().split(/\s+/).length;
    assert.ok(words >= 150 && words <= 250, `${type.id}: ${words} words`);
  }
});

test('zodiac dates use standard western sign boundaries and reject malformed dates', () => {
  const boundaries = [
    ['2026-03-20', 'Рыбы'], ['2026-03-21', 'Овен'], ['2026-04-19', 'Овен'], ['2026-04-20', 'Телец'],
    ['2026-05-21', 'Близнецы'], ['2026-06-21', 'Рак'], ['2026-07-23', 'Лев'], ['2026-08-23', 'Дева'],
    ['2026-09-23', 'Весы'], ['2026-10-23', 'Скорпион'], ['2026-11-22', 'Стрелец'], ['2026-12-22', 'Козерог'],
    ['2026-01-20', 'Водолей'], ['2026-02-19', 'Рыбы']
  ];
  for (const [date, sign] of boundaries) assert.equal(zodiacSign(date), sign, date);
  assert.equal(zodiacSign(''), null);
  assert.equal(zodiacSign('2026-02-30'), null);
  assert.equal(zodiacSign('03/21/2026'), null);
});

test('all 96 sign-by-archetype comments exist and are distinct', () => {
  assert.equal(zodiacSigns.length, 12);
  assert.equal(new Set(Object.keys(zodiacReadings)).size, 12);
  assert.equal(Object.keys(astroCombinations).length, 96);
  for (const sign of zodiacSigns) {
    assert.ok(zodiacReadings[sign]);
    for (const type of archetypes) {
      const copy = getAstroCombination(sign, type.id);
      assert.ok(copy?.includes(zodiacReadings[sign]));
      assert.ok(copy.length > zodiacReadings[sign].length + 20);
    }
  }
  assert.equal(new Set(Object.values(astroCombinations)).size, 96);
  assert.equal(getAstroCombination('Марс', 'staff'), null);
});
