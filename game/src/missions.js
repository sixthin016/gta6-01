// Neon Bay — the story: 10 missions for Rook and the Bay crew. Each mission
// has an intro line, a live objective, a target on the map, and a cash reward.
// The game loop drives the state machine; this file only describes what each
// mission is and when it counts as done. Types: goto, steal, lose, wait, multi.
import { PLACES } from './config.js';

export const STORY_INTRO = [
  'ROOK: "Neon Bay, kid. Sun, sand, and everybody owes somebody."',
  'ROOK: "Drive for my crew and the Bay pays. Ten jobs. No questions."',
  'ROOK: "First job is easy — just get behind a wheel and come to me."',
];

export const MISSIONS = [
  {
    id: 0, title: 'Joyride', type: 'goto', place: 'garage', reward: 150,
    brief: 'ROOK: "Borrow any car and bring it to my garage. Don\'t scratch it. Much."',
    objective: 'Steal any car, drive to the garage',
  },
  {
    id: 1, title: 'The Red Coupe', type: 'steal', place: 'garage', reward: 300,
    brief: 'ROOK: "A cherry-red coupe is parked downtown. It\'s ours now. Bring it home."',
    objective: 'Steal the red coupe, then drive it home',
    stealAt: { x: -72, z: -48 },
  },
  {
    id: 2, title: 'Lay Low', type: 'lose', place: null, reward: 250,
    brief: 'ROOK: "You\'re hot — two stars. Lose the cops and stay out of sight."',
    objective: 'Lose your 2-star wanted level',
    startWanted: 2,
  },
  {
    id: 3, title: 'Package Run', type: 'goto', place: 'pier', reward: 400, timeLimit: 90,
    brief: 'ROOK: "A package needs to reach Neon Pier in 90 seconds. Drive like you mean it."',
    objective: 'Deliver the package to Neon Pier in time',
  },
  {
    id: 4, title: 'Corner Store Job', type: 'rob', place: 'store', reward: 600,
    brief: 'ROOK: "Last of the small ones. Clean out the Sunset Corner Store, then get home."',
    objective: 'Rob the store (hold E), then escape home',
    after: 'garage',
  },
  {
    id: 5, title: 'Crew Pickup', type: 'wait', place: 'diner', reward: 350,
    brief: 'ROOK: "Pick up Maya at the Neon Diner. She\'s the wheel for the big one — be nice."',
    objective: 'Pick up Maya at the diner (wait beside her)',
    waitSeconds: 4,
  },
  {
    id: 6, title: 'Getaway', type: 'goto', place: 'hideout', reward: 450, timeLimit: 120,
    brief: 'ROOK: "The cops are coming. Three stars, two minutes — get to the hideout."',
    objective: 'Reach the hideout with the heat on',
    startWanted: 3, keepWanted: true,
  },
  {
    id: 7, title: 'Beach Dash', type: 'goto', place: 'lighthouse', reward: 400, timeLimit: 75,
    brief: 'ROOK: "A buyer waits at Lighthouse Point. Take the beach road — 75 seconds."',
    objective: 'Reach Lighthouse Point in 75 seconds',
  },
  {
    id: 8, title: 'Night Drop', type: 'goto', place: 'marina', reward: 500, timeLimit: 100,
    brief: 'ROOK: "One quiet drop at the Marina. No sirens, no scratches, no questions."',
    objective: 'Deliver the drop to the Marina in time',
  },
  {
    id: 9, title: 'The Big Score', type: 'multi', place: 'bank', reward: 1200, timeLimit: 150,
    brief: 'ROOK: "The Big Score. Hit Bay Trust Bank with Maya, then bring it all home."',
    objective: 'Hit the bank, then reach the garage',
    after: 'garage',
  },
];

export function missionTitle(index) {
  if (index >= MISSIONS.length) return 'Free Roam';
  return MISSIONS[index].title;
}

export function missionObjective(index) {
  if (index >= MISSIONS.length) return 'Free roam — explore Neon Bay, earn cash, stay out of trouble.';
  return MISSIONS[index].objective;
}

export function missionBrief(index) {
  if (index >= MISSIONS.length) return 'ROOK: "That\'s all ten jobs, kid. The Bay is yours now."';
  return MISSIONS[index].brief;
}

/** The live target for the current mission stage, or null when there is none. */
export function missionTarget(index, stage) {
  if (index >= MISSIONS.length) return null;
  const m = MISSIONS[index];
  if (m.type === 'lose') return null;
  if (m.type === 'steal' && stage === 0) return { ...m.stealAt, radius: 6, name: 'Red Coupe' };
  if ((m.type === 'rob' || m.type === 'multi') && stage === 1) {
    const p = PLACES[m.after];
    return { ...p, radius: 8 };
  }
  const p = PLACES[m.place];
  return { ...p, radius: 8 };
}
