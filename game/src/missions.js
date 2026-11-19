// Neon Bay — the story: 14 missions in four acts, as the Category 5
// hurricane bears down on the island. Each mission has an intro line, a
// live objective, a target on the map, and a cash reward. The game loop
// drives the state machine; this file only describes what each mission is
// and when it counts as done.
// Types: goto, steal, lose, rob, wait, multi, race, shoot, survive.

import { PLACES } from './city.js';

export const STORY_INTRO = [
  'ROOK: "Neon Bay, kid. Sun, sand, and everybody owes somebody."',
  'ROOK: "A hurricane is coming in 20 minutes. We work fast or we drown."',
  'ROOK: "Fourteen jobs. Do them all and the Bay is yours."',
];

export const MISSIONS = [
  { id: 0, title: 'Neon Tide', type: 'goto', place: 'marina', reward: 200,
    brief: 'ROOK: "First job is easy — get a car and meet my boat at the Marina."',
    objective: 'Steal any car, drive to the Marina' },
  { id: 1, title: 'First Light', type: 'steal', place: 'garage', reward: 300,
    brief: 'ROOK: "A cherry-red coupe is parked downtown. It\'s ours now. Bring it home."',
    objective: 'Steal the red coupe, then drive it home',
    stealAt: { x: -78, z: -52 } },
  { id: 2, title: 'Paper Trail', type: 'rob', place: 'cityhall', reward: 450,
    brief: 'MARA: "City Hall hides the mayor\'s cartel ledger. Get inside and hold E to hack it."',
    objective: 'Hack City Hall (hold E), then reach the garage',
    after: 'garage' },
  { id: 3, title: 'Dockwork', type: 'rob', place: 'docks', reward: 500,
    brief: 'ROOK: "A container at the Docks holds smuggled cash. Crack it open, then run."',
    objective: 'Crack the container (hold E), then reach the hideout',
    after: 'hideout' },
  { id: 4, title: 'Street Cred', type: 'race', place: null, reward: 700,
    brief: 'ROOK: "Viper\'s crew owns the night races. Beat their ring — 8 checkpoints, no mercy."',
    objective: 'Race the ring: hit all 8 checkpoints' },
  { id: 5, title: 'Silver Tongue', type: 'shoot', place: 'watertower', reward: 600,
    brief: 'MARA: "Viper\'s lookouts watch the Water Tower. Drop all 4 — click to shoot, 1-4 switch guns."',
    objective: 'Take out all 4 lookouts at the Water Tower',
    targets: [
      { x: 200, z: -200, name: 'Lookout 1' }, { x: 216, z: -200, name: 'Lookout 2' },
      { x: 200, z: -216, name: 'Lookout 3' }, { x: 216, z: -216, name: 'Lookout 4' },
    ] },
  { id: 6, title: 'Blackout', type: 'goto', place: 'plant', reward: 550,
    brief: 'ROOK: "Kill the Power Plant grid and the city goes dark. Three stars will follow you."',
    objective: 'Reach the Power Plant with the heat on',
    startWanted: 3, keepWanted: true, timeLimit: 120 },
  { id: 7, title: 'Eye Wall', type: 'survive', place: 'docks', reward: 650,
    brief: 'JAX: "The storm surge is flooding the Docks. Hold the yard for 30 seconds."',
    objective: 'Survive 30 seconds in the flooded Docks',
    surviveSeconds: 30 },
  { id: 8, title: 'Levee Breach', type: 'goto', place: 'lighthouse', reward: 500,
    brief: 'ROOK: "A buyer waits at Lighthouse Point. Take the beach road — 75 seconds, NOS helps."',
    objective: 'Reach Lighthouse Point in 75 seconds',
    timeLimit: 75 },
  { id: 9, title: 'Turncoat', type: 'lose', place: null, reward: 600,
    brief: 'JAX: "Jax sold us out — four stars and every cop in the Bay. Lose them all."',
    objective: 'Lose your 4-star wanted level',
    startWanted: 4 },
  { id: 10, title: 'Radio Free Bay', type: 'multi', place: 'tower', reward: 900,
    brief: 'MARA: "Seize the Radio Tower, broadcast the ledger, then vanish to the hideout."',
    objective: 'Broadcast from the tower (hold E), then reach the hideout',
    after: 'hideout' },
  { id: 11, title: 'High Stakes', type: 'multi', place: 'bank', reward: 1200,
    brief: 'ROOK: "The Big Score. Hit Bay Trust Bank with the crew, then bring it all home."',
    objective: 'Hit the bank (hold E), then reach the garage',
    after: 'garage', timeLimit: 180 },
  { id: 12, title: 'Category 5', type: 'shoot', place: 'stadium', reward: 1000,
    brief: 'REYES: "Viper\'s last crew holds the Stadium in the storm. Drop all 5."',
    objective: 'Take out all 5 of Viper\'s crew at the Stadium',
    targets: [
      { x: 96, z: 148, name: 'Viper 1' }, { x: 112, z: 148, name: 'Viper 2' },
      { x: 96, z: 164, name: 'Viper 3' }, { x: 112, z: 164, name: 'Viper 4' },
      { x: 104, z: 156, name: 'Viper himself' },
    ] },
  { id: 13, title: 'Neon Dawn', type: 'wait', place: 'beach', reward: 1500,
    brief: 'ROOK: "The storm breaks at dawn. Meet me on Sunset Beach — the Bay is ours now."',
    objective: 'Wait on Sunset Beach as the storm breaks',
    waitSeconds: 5 },
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
  if (index >= MISSIONS.length) return 'ROOK: "That\'s all fourteen jobs, kid. The Bay is yours now."';
  return MISSIONS[index].brief;
}

/** The live target for the current mission stage, or null when there is none. */
export function missionTarget(index, stage) {
  if (index >= MISSIONS.length) return null;
  const m = MISSIONS[index];
  if (m.type === 'lose') return null;
  if (m.type === 'steal' && stage === 0) return { ...m.stealAt, radius: 6, name: 'Red Coupe' };
  if (m.type === 'race') return null; // checkpoints are drawn separately
  if (m.type === 'shoot') {
    const p = PLACES[m.place];
    return { ...p, radius: 10, name: 'Targets' };
  }
  if ((m.type === 'rob' || m.type === 'multi') && stage === 1) {
    const p = PLACES[m.after];
    return { ...p, radius: 8 };
  }
  const p = PLACES[m.place];
  return p ? { ...p, radius: 8 } : null;
}
