export const MISSIONS = {
  support_alliance: {
    id: 'support_alliance',
    name: 'Support the Alliance',
    desc: 'Defend an alliance ground installation. Hold the line through enemy waves and bomb their turrets.',
    reward: 20000,
    physicalRewards: [],
    sceneKey: 'AllianceBattleScene',
    onComplete: (state) => { state.missionFlags.combatVeteran = true; }
  },
  mine_ore: {
    id: 'mine_ore',
    name: 'Prospecting Contract',
    desc: 'Mine 20 units of raw ore from asteroids. Either fragment them with the blaster or hold the mining laser on them.',
    reward: 5000,
    physicalRewards: [],
    type: 'progress',
    target: 20,
    unit: 'ore',
    onComplete: (state) => { state.missionFlags.prospector = true; }
  },
  unknown_signal: {
    id: 'unknown_signal',
    name: 'Investigate Unknown Signal',
    desc: 'A faint, unclassified transmission echoes from somewhere in this sector. Outcome depends on how you respond.',
    reward: 0,
    physicalRewards: [],
    sceneKey: 'AlienEncounterScene',
    markerColor: 0xa080ff,
    markerGlyph: '?',
    onComplete: (state) => { state.missionFlags.firstContact = true; }
  }
};

export const MISSION_ORDER = ['support_alliance', 'mine_ore', 'unknown_signal'];
