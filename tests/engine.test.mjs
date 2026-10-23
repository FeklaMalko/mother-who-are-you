import test from 'node:test';
import assert from 'node:assert/strict';
import { archetypes, questions, zodiacSigns, zodiacReadings, astroCombinations, getAstroCombination, getQuestions, childStageForMonths, getFamilyDynamicsReading, getPersonalizedReadout, zodiacSign, scoreAnswers } from '../engine.js';

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

test('each child age route keeps eight age-matched situations inside the 16-question flow', () => {
  const routes = ['baby', 'preschool', 'school', 'teen', 'adult'];
  for (const stage of routes) {
    const routeQuestions = getQuestions([stage]);
    assert.equal(routeQuestions.length, 16, stage);
    assert.equal(routeQuestions.filter(q => q.stageId === stage).length, 8, stage);
    for (const question of routeQuestions) {
      assert.equal(question.options.length, 4);
      assert.ok(question.options.every(option => option.label.length > 12));
    }
  }
  assert.match(getQuestions(['baby'])[8].text, /малыш|сон|прогулк|режим/i);
  assert.match(getQuestions(['teen'])[8].text, /подрост|планы|телефон/i);
  assert.match(getQuestions(['adult'])[8].text, /взросл|семейн/i);
  assert.equal(getQuestions(['baby', 'teen']).filter(q => q.stageId === 'baby').length, 4);
  assert.equal(getQuestions(['baby', 'teen']).filter(q => q.stageId === 'teen').length, 4);
});

test('a 6-month-old and a 2-year-old get the baby route without school or craft assumptions', () => {
  const stages = [...new Set([6, 24].map(childStageForMonths))];
  assert.deepEqual(stages, ['baby']);
  const routeQuestions = getQuestions(stages);
  assert.equal(routeQuestions.length, 16);
  const fullCopy = routeQuestions.map(question => `${question.text} ${question.options.map(option => option.label).join(' ')}`).join(' ');
  assert.doesNotMatch(fullCopy, /поделк|макет|школьн|родительск(?:ий|ом) чат|домашн(?:ее|его) задан|воспитател|учител|дневник|младенц/i);
  assert.match(routeQuestions[8].text, /малыш|сон|прогулк|режим/i);
});

test('shared questions use recognizable family scenes and avoid abstract filler', () => {
  const commonQuestions = getQuestions(['baby']).slice(0, 8);
  assert.match(commonQuestions[0].text, /перед выходом|у двери/i);
  assert.match(commonQuestions[1].text, /взрослого взять одно дело|что конкретно/i);
  assert.match(commonQuestions[2].text, /горячим кофе/i);
  assert.match(commonQuestions[3].text, /«Я не вмешиваюсь, но/);
  assert.match(commonQuestions[4].text, /23-м кадре/i);
  assert.match(commonQuestions[5].text, /молоко/i);
  assert.match(commonQuestions[6].text, /убрала стол/i);
  assert.match(commonQuestions[7].text, /семейном чате/i);
  for (const question of commonQuestions) assert.equal(question.options.length, 4, question.text);
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

test('result readout reflects the selected answer text and names the runner-up type', () => {
  const answers = questions.map(q => q.options.findIndex(option => 'queen' in option.scores));
  const result = scoreAnswers(answers);
  const readout = getPersonalizedReadout(answers, questions, result.scores);
  assert.equal(result.archetype.id, 'queen');
  assert.match(readout.summary, /Королева/);
  assert.ok(readout.evidence.length >= 1);
  for (const clue of readout.evidence) {
    assert.ok(answers.some((choice, index) => questions[index].text === clue.question && questions[index].options[choice].label === clue.answer));
  }
});

test('family context names exact ages, close spacing, and the archetype voice', () => {
  const reading = getFamilyDynamicsReading([6, 18, 96], 'queen');
  assert.match(reading, /6 месяцев/);
  assert.match(reading, /1 год 6 мес\./);
  assert.match(reading, /8 лет/);
  assert.match(reading, /почти погодки/);
  assert.match(reading, /Состав семьи добавляет контекст/);
  assert.match(reading, /приёмную закрыть|закрыть приёмную/i);
  assert.doesNotMatch(getFamilyDynamicsReading([6, 84], 'staff'), /Погодки или почти погодки/);
});

test('each archetype has a 150–200 word distinct monologue and complete editorial fields', () => {
  for (const type of archetypes) {
    assert.ok(type.title && type.short && type.quote && type.motto && type.illustration && type.deepDive);
    assert.equal(type.situations.length, 5, type.id);
    assert.equal(type.strengths.length, 3, type.id);
    assert.equal(type.habits.length, 3, type.id);
    assert.equal(type.tips.length, 3, type.id);
    const words = type.deepDive.trim().split(/\s+/).length;
    assert.ok(words >= 150 && words <= 200, `${type.id}: ${words} words`);
    assert.ok(type.quote && type.motto && type.deepDive.length > 500);
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
      assert.ok(copy?.length >= 45);
      assert.ok(!copy.includes('В материнском типе'));
      assert.ok(!copy.includes(zodiacReadings[sign]));
    }
  }
  assert.equal(new Set(Object.values(astroCombinations)).size, 96);
  for (const type of archetypes) assert.equal(astroCombinations[`${zodiacSigns[0]}|${type.id}`].length >= 45, true);
  assert.equal(getAstroCombination('Марс', 'staff'), null);
});
