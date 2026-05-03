export const LEVELS = {
  starbase_bay_1: {
    id: 'starbase_bay_1',
    width: 10,
    height: 6,
    tileSize: 96,
    spawn: { x: 1, y: 4, gravity: 'down' },
    tiles: [
      '##########',
      '#........#',
      '#........#',
      '#........#',
      '#........#',
      '##########'
    ].join('\n'),
    props: [
      { type: 'insurance',   x: 5, y: 1 },
      { type: 'mission',     x: 5, y: 4 },
      { type: 'engineering', x: 7, y: 4 },
      { type: 'airlock',     x: 8, y: 4 }
    ]
  }
};

export function loadLevel(id) {
  const def = LEVELS[id];
  if (!def) throw new Error(`Unknown level ${id}`);
  return {
    ...def,
    tilesArr: def.tiles.split('\n')
  };
}
