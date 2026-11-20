// 16 story missions — "Neon Bay" campaign across Coral Isle's 5 districts.
// Each mission: name, district, objective, next step, payout, respect, wanted on start.
export const MISSIONS = [
  { name: 'WAKE UP CALL', district: 'Beachfront', objective: 'Steal the Coral GT from the beach valet and lose the valet’s friends.', next: 'Drive to Mara’s garage', payout: 800, respect: 6, wanted: 1 },
  { name: 'SAND IN THE GEARS', district: 'Beachfront', objective: 'Win the midnight beach sprint — 3 checkpoints, no cops, no mercy.', next: 'Collect the entry fee from the bookie', payout: 1500, respect: 8, wanted: 2 },
  { name: 'TIDE RUNNER', district: 'Marina', objective: 'Smuggle the crates past the marina patrol boats before the tide turns.', next: 'Hide the boat at the old pier', payout: 2200, respect: 9, wanted: 2 },
  { name: 'NEON SIGNAL', district: 'Downtown', objective: 'Tag the billboard on Coral Tower so the whole city sees the crew’s name.', next: 'Meet Jax at the rooftop garage', payout: 1800, respect: 10, wanted: 3 },
  { name: 'DELIVER THE PACKAGE', district: 'Beachfront', objective: 'Drive the prototype to the marina drop-off. BCPD is on your tail — lose them or outrun them.', next: 'Lose the heat · then meet Mara at the safehouse', payout: 3200, respect: 12, wanted: 4 },
  { name: 'DEFEND THE MARKET', district: 'Old Market', objective: 'Hold the market square while Mara cracks the vault codes. No cop gets through.', next: 'Grab the ledger and run for the van', payout: 4100, respect: 14, wanted: 5 },
  { name: 'EXTRACT THE PROTOTYPE', district: 'Downtown', objective: 'Break into the Vantara server farm, pull the PROTOTYPE drive, and get out before SWAT breaches.', next: 'Reyes covers the door · Jax waits in the getaway car', payout: 6800, respect: 16, wanted: 5 },
  { name: 'STACKED HIGHWAY ESCAPE', district: 'Downtown', objective: 'Outrun the Rhino tank and the Air One gunship across the stacked tollway.', next: 'Lose the heli in the tunnel', payout: 7500, respect: 18, wanted: 5 },
  { name: 'HURRICANE BET', district: 'Marina', objective: 'Win the storm-eve street race — the pot is $20k and the rain has already started.', next: 'Bank the winnings before the bridge closes', payout: 9000, respect: 15, wanted: 3 },
  { name: 'GHOST FREQUENCY', district: 'Hills', objective: 'Climb the relay tower and hijack the BCPD dispatch channel for one night.', next: 'Keep the channel open for 90 seconds', payout: 5400, respect: 13, wanted: 4 },
  { name: 'SAFEHOUSE SIEGE', district: 'Old Market', objective: 'SWAT is raiding the safehouse. Hold the stairwell until the crew slips out the back.', next: 'Regroup at the beach house', payout: 6200, respect: 15, wanted: 5 },
  { name: 'THE LONG CON', district: 'Downtown', objective: 'Pose as a Vantara courier, walk the prototype through the front door, then vanish.', next: 'Swap the drive in the elevator', payout: 8100, respect: 17, wanted: 2 },
  { name: 'BURNING BRIDGES', district: 'Marina', objective: 'Torch the evidence boat before the harbor master boards it — then swim for it.', next: 'Dry off at the marina bar', payout: 4700, respect: 12, wanted: 4 },
  { name: 'KING TIDE', district: 'Beachfront', objective: 'Race the rising water along the flooded coast road with the gold in the trunk.', next: 'Deliver the gold to the fence', payout: 9800, respect: 19, wanted: 3 },
  { name: 'EYE OF THE STORM', district: 'Hills', objective: 'Drive into the hurricane’s eye to plant the beacon — the storm breaks in 20 minutes.', next: 'Get out before the eyewall closes', payout: 12000, respect: 22, wanted: 5 },
  { name: 'NEON BAY FINALE', district: 'Downtown', objective: 'One last job: empty the Vantara vault as the hurricane makes landfall, then disappear.', next: 'Coral Isle is yours', payout: 25000, respect: 30, wanted: 5 },
];

export const DISTRICTS = [
  { name: 'Beachfront', palette: ['#2ec8b8', '#f2d8a0', '#ff8d6b'], accent: 'teal / sand' },
  { name: 'Downtown', palette: ['#7a5cff', '#ff2e63', '#2ee6ff'], accent: 'neon' },
  { name: 'Old Market', palette: ['#ffb03c', '#d94f30', '#f2e3c0'], accent: 'warm' },
  { name: 'Marina', palette: ['#2e9ec8', '#e8f4ff', '#ff7a5c'], accent: 'harbor blue' },
  { name: 'Hills', palette: ['#8a6bff', '#3c2a5c', '#ffd75e'], accent: 'dusk violet' },
];
