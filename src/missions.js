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
  }
};

export const MISSION_ORDER = ['support_alliance', 'mine_ore'];
