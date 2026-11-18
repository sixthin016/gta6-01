// Neon Bay — the story: five missions for Rook, a getaway driver for the
// Bay crew. Each mission has an intro line, a live objective, a target on
// the map, and a cash reward. The world drives the state machine; this file
// only describes what each mission is and when it counts as done.
import { LANDMARKS } from './city.js';
import { MISSION_REWARDS } from './config.js';

export const STORY_INTRO = [
  'ROOK: "Neon Bay, kid. Sun, sand, and everybody owes somebody."',
  'ROOK: "Drive for my crew and the Bay pays. Five jobs. No questions."',
  'ROOK: "First job is easy — just get behind a wheel and come to me."',
];

export const MISSIONS = [
  {
    id: 0,
    title: 'Joyride',
    brief: 'ROOK: "Borrow any car and bring it to my garage. Don\'t scratch it. Much."',
    objective: 'Steal any car, drive to the garage',
    reward: MISSION_REWARDS[0],
    target() { return { x: LANDMARKS.garage.x, y: LANDMARKS.garage.y, radius: 90 }; },
  },
  {
    id: 1,
    title: 'The Red Coupe',
    brief: 'ROOK: "A cherry-red coupe is parked uptown. It\'s ours now. Bring it home."',
    objective: 'Steal the red coupe, then drive it home',
    reward: MISSION_REWARDS[1],
    target(state) {
      if (state.missionStage === 0) return { x: 660, y: 430, radius: 70 };
      return { x: LANDMARKS.garage.x, y: LANDMARKS.garage.y, radius: 90 };
    },
  },
  {
    id: 2,
    title: 'Lay Low',
    brief: 'ROOK: "You\'re hot — two stars. Lose the cops and stay out of sight."',
    objective: 'Lose your 2-star wanted level',
    reward: MISSION_REWARDS[2],
    target() { return null; },
  },
  {
    id: 3,
    title: 'Package Run',
    brief: 'ROOK: "A package needs to reach the pier in 90 seconds. Drive like you mean it."',
    objective: 'Deliver the package to Neon Pier in time',
    reward: MISSION_REWARDS[3],
    target() { return { x: LANDMARKS.pier.x, y: LANDMARKS.pier.y, radius: 90 }; },
    timeLimit: 90,
  },
  {
    id: 4,
    title: 'Corner Store Job',
    brief: 'ROOK: "Last one. Clean out the Sunset Corner Store, then lose the heat and get home."',
    objective: 'Rob the store (hold E), then escape home',
    reward: MISSION_REWARDS[4],
    target(state) {
      if (state.missionStage === 0) return { x: LANDMARKS.store.x, y: LANDMARKS.store.y, radius: 80 };
      return { x: LANDMARKS.garage.x, y: LANDMARKS.garage.y, radius: 90 };
    },
  },
];

export function missionTitle(index) {
  if (index >= MISSIONS.length) return 'Free Roam';
  return MISSIONS[index].title;
}

export function missionObjective(index, state) {
  if (index >= MISSIONS.length) return 'Free roam — explore Neon Bay, earn cash, stay out of trouble.';
  return MISSIONS[index].objective;
}

export function missionBrief(index) {
  if (index >= MISSIONS.length) return 'ROOK: "That\'s all five jobs, kid. The Bay is yours now."';
  return MISSIONS[index].brief;
}

/** The live target marker for the current mission, or null when there is none. */
export function missionTarget(index, state) {
  if (index >= MISSIONS.length) return null;
  return MISSIONS[index].target(state);
}
