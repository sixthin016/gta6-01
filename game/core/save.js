// Save / load — localStorage, one slot, survives reloads.
const KEY = 'neonbay.save.v1';

export function saveGame(state) {
  try {
    const data = {
      money: state.money,
      respect: state.respect,
      missionIndex: state.missionIndex,
      completed: state.completed.slice(),
      wanted: state.wanted,
      crew: state.crew.map((c) => ({ name: c.name, health: c.health, recruited: c.recruited })),
      garage: state.garage.slice(),
      radio: state.radio,
      stormMinutesLeft: state.stormMinutesLeft,
      savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.money !== 'number') return null;
    return data;
  } catch (e) { return null; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* no storage */ }
}
