// バトル(1セッション)の状態遷移。純粋・イミュータブル

export function createBattle(questions, monster) {
  return {
    questions,
    monster,
    index: 0,
    correctCount: 0,
    hp: questions.length,
    maxHp: questions.length,
    results: [],
    finished: false,
  };
}

export function answer(battle, value) {
  if (battle.finished) return { battle, correct: false, question: null };
  const question = battle.questions[battle.index];
  const correct =
    question.choices != null
      ? value === question.answer
      : Number(value) === question.answer;
  const next = {
    ...battle,
    index: battle.index + 1,
    correctCount: battle.correctCount + (correct ? 1 : 0),
    hp: battle.hp - (correct ? 1 : 0),
    results: [...battle.results, { skillTag: question.skillTag, correct }],
  };
  next.finished = next.index >= battle.questions.length;
  return { battle: next, correct, question };
}
