// 連続日数(ストリーク)計算。日付はすべてローカル時刻のYYYY-MM-DD文字列で扱う

export function todayString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function updateStreak(prev, todayStr) {
  if (prev.lastPlayedDate === todayStr) {
    return { streak: prev.streak, lastPlayedDate: prev.lastPlayedDate };
  }
  const t = new Date(`${todayStr}T00:00:00`);
  t.setDate(t.getDate() - 1);
  const yesterday = todayString(t);
  const streak = prev.lastPlayedDate === yesterday ? prev.streak + 1 : 1;
  return { streak, lastPlayedDate: todayStr };
}
