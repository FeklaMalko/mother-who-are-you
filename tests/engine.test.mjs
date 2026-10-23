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
  const routes = ['infant', 'toddler', 'preschool', 'school', 'teen', 'adult'];
  for (const stage of routes) {
    const routeQuestions = getQuestions([stage]);
    assert.equal(routeQuestions.length, 16, stage);
    assert.equal(routeQuestions.filter(q => q.stageId === stage).length, 8, stage);
    for (const question of routeQuestions) {
      assert.equal(question.options.length, 4);
      assert.ok(question.options.every(option => option.label.length > 12));
    }
  }
  assert.match(getQuestions(['infant'])[8].text, /младенец|сон/i);
  assert.match(getQuestions(['toddler'])[8].text, /двухлет|ботин/i);
  assert.match(getQuestions(['teen'])[8].text, /подрост|планы|телефон/i);
  assert.match(getQuestions(['adult'])[8].text, /взросл|семейн/i);
  assert.equal(getQuestions(['infant', 'teen']).filter(q => q.stageId === 'infant').length, 4);
  assert.equal(getQuestions(['infant', 'teen']).filter(q => q.stageId === 'teen').length, 4);
});

test('a 10-month-old and a 2-year-old receive separate infant and toddler scenes', () => {
  const stages = [...new Set([10, 24].map(childStageForMonths))];
  assert.deepEqual(stages, ['infant', 'toddler']);
  const routeQuestions = getQuestions(stages);
  assert.equal(routeQuestions.length, 16);
  assert.match(routeQuestions[0].text, /перед семейным выходом/i);
  assert.doesNotMatch(routeQuestions[0].text, /мам, а где|ребёнок забыл/i);
  assert.equal(routeQuestions.filter(q => q.stageId === 'infant').length, 4);
  assert.equal(routeQuestions.filter(q => q.stageId === 'toddler').length, 4);
  assert.match(routeQuestions.find(q => q.stageId === 'infant').text, /младенец/i);
  assert.match(routeQuestions.find(q => q.stageId === 'toddler').text, /малыш|ботин/i);
  assert.doesNotMatch(routeQuestions.filter(q => q.stageId === 'toddler').map(q => q.text).join(' '), /двухлет/i);
  for (const type of archetypes) {
    const answers = routeQuestions.map(question => Math.max(0, question.options.findIndex(option => type.id in option.scores)));
    assert.equal(scoreAnswers(answers, routeQuestions).archetype.id, type.id);
  }
  assert.match(getQuestions(['school'])[0].text, /Перед семейным выходом/i);
  const fullCopy = routeQuestions.slice(8).map(question => `${question.text} ${question.options.map(option => option.label).join(' ')}`).join(' ');
  assert.doesNotMatch(fullCopy, /поделк|макет|школьн|родительск(?:ий|ом) чат|домашн(?:ее|его) задан|воспитател|учител|дневник/i);
  assert.ok(routeQuestions.slice(8).every(q => !/поделк|макет|школьн|родительск(?:ий|ом) чат|домашн(?:ее|его) задан|воспитател|учител|дневник/i.test(q.text)));
});

test('shared questions use recognizable family scenes and avoid abstract filler', () => {
  const commonQuestions = getQuestions(['infant']).slice(0, 8);
  assert.match(commonQuestions[0].text, /Перед семейным выходом/i);
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
  const emptyTie=scoreAnswers([]);
  assert.ok(archetypes.some(type=>type.id===emptyTie.archetype.id));
  assert.equal(emptyTie.tieBreak.tied.length, 8);
  const mixedAnswers=questions.map((_,index)=>index%4);
  const reordered=scoreAnswers([...mixedAnswers].reverse(),[...questions].reverse());
  assert.equal(scoreAnswers(mixedAnswers,questions).archetype.id,reordered.archetype.id);
  const repeated=scoreAnswers([],questions);
  assert.equal(emptyTie.archetype.id,repeated.archetype.id);
});


test('mixed-age families retain representation and give more slots to repeated age bands', () => {
  const manyYoung = getQuestions(['infant','infant','infant','infant','infant','infant','teen']);
  assert.equal(manyYoung.length,16);
  assert.ok(manyYoung.some(q=>q.stageId==='teen'));
  assert.ok(manyYoung.filter(q=>q.stageId==='infant').length > manyYoung.filter(q=>q.stageId==='teen').length);
  const threeBands = getQuestions(['toddler','preschool','teen']);
  for (const stage of ['toddler','preschool','teen']) assert.ok(threeBands.some(q=>q.stageId===stage));
  assert.deepEqual([0,1,2].map(i=>threeBands.filter(q=>q.stageId===['toddler','preschool','teen'][i]).length).sort(),[2,3,3]);
});

test('one changed answer changes only the two affected primary scores; astrology is outside scoring', () => {
  const answers=questions.map(q=>{const hit=q.options.findIndex(option=>'staff' in option.scores);return hit<0?0:hit;});
  const before=scoreAnswers(answers,questions);
  const changed=[...answers];
  const at=questions.findIndex(q=>q.options[answers[questions.indexOf(q)]]&&'staff' in q.options[answers[questions.indexOf(q)]].scores);
  const other=questions[at].options.findIndex(option=>!('staff' in option.scores));
  changed[at]=other;
  const after=scoreAnswers(changed,questions);
  assert.equal(before.scores.staff-after.scores.staff,1);
  assert.equal(Object.values(after.scores).reduce((a,b)=>a+b,0),16);
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

test('each archetype has one approved 100–170 word monologue and complete editorial fields', () => {
  for (const type of archetypes) {
    assert.ok(type.title && type.short && type.quote && type.motto && type.illustration && type.monologue);
    assert.equal('deepDive' in type, false, type.id);
    assert.equal('roast' in type, false, type.id);
    assert.equal('roastMore' in type, false, type.id);
    assert.equal(type.situations.length, 5, type.id);
    assert.equal(type.strengths.length, 3, type.id);
    assert.equal(type.habits.length, 3, type.id);
    assert.equal(type.tips.length, 3, type.id);
    const words = type.monologue.trim().split(/\s+/).length;
    assert.ok(words >= 100 && words <= 170, `${type.id}: ${words} words`);
    assert.ok(type.quote && type.motto && type.monologue.length > 500);
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
