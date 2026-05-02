export const MISSIONS = {
  support_alliance: {
    id: 'support_alliance',
    name: 'Support the Alliance',
    desc: 'Defend an alliance ground installation. Hold the line through enemy waves and bomb their turrets.',
    reward: 20000,
    physicalRewards: [],
    sceneKey: 'AllianceBattleScene',
    onComplete: (state) => { state.missionFlags.combatVeteran = true; }
  }
};

export const MISSION_ORDER = ['support_alliance'];
