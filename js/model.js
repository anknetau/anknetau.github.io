import { healthMax, goldMax } from "./utils.js";

export const NUM_COLS = 13;
export const NUM_ROWS = 10;
export const TILE_COUNT = NUM_COLS * NUM_ROWS;

export const tileMap = {
  cols: NUM_COLS,
  rows: NUM_ROWS,
};
tileMap.count = TILE_COUNT;

tileMap.tileIndexToXY = (index) => {
  const x = index % tileMap.cols;
  const y = Math.floor(index / tileMap.cols);
  return [x, y];
};

tileMap.xyToTileIndex = (x, y) => tileMap.cols * y + x;

tileMap.inBounds = (x, y) => x >= 0 && x < tileMap.cols && y >= 0 && y < tileMap.rows;

tileMap.iterateAround = (index, size, f) => {
  const [x, y] = tileMap.tileIndexToXY(index);
  for (let dx = -size; dx <= size; dx++) {
    for (let dy = -size; dy <= size; dy++) {
      if (size === 2 && Math.abs(dx) + Math.abs(dy) > size) {
        continue;
      }
      if (tileMap.inBounds(x + dx, y + dy)) {
        f(x + dx, y + dy);
      }
    }
  }
};

tileMap.findEmptySpace = (data, keyEmpty) => {
  let count = 100;
  while (count--) {
    const index = Math.floor(Math.random() * tileMap.count);
    if (data[index].key === keyEmpty) {
      return index;
    }
  }
  throw new Error("Something went wrong");
};

export const GUESS_NONE = "-";

export const KEY_EMPTY = "-";
export const KEY_DRAGON = "D";
export const KEY_START_SPHERE = "SS";
export const KEY_HEART = "HEART";
export const tileTypes = [
  ["Rat", "Rat", 13, 1, "🐁", "OcularWatcher"],
  ["Bat", "Bat", 12, 2, "🦇", "SwoopingBat"],
  ["Sk", "Skeleton", 10, 3, "🩻", "FireElemental"],
  ["D1", "Dunno 1", 8, 4, "🦧", "HumongousEttin"],
  ["B1", "Blob", 8, 5, "🪼", "DeathSlime"],
  ["F", "Fishman", 5, 6, "🦈", "WarpSkull"],
  ["K", "Knight", 4, 7, "👮", "InfectedMouse"],
  ["B2", "Mean Blob", 5, 8, "🪻", "OchreJelly"],
  ["f", "Fairy", 2, 9, "🧚", "MagicalFairy"],
  ["D2", "Dunno 2", 1, 10, "🐒", "SwordArchon"],
  ["RK", "Rat King", 1, 5, "🤴", "BloodshotEye"],
  ["B3", "Mystery Blob", 8, 5, "👁️", "BabyWhiteDragon"],
  ["BK", "Blob King", 1, 1, "👑", "AdultWhiteDragon"],
  ["GO", "Golem", 1, 11, "G", "IronGolem"],
  ["B", "Bomb", 9, 100, "💣", "FloatingEye"],
  ["C", "Chest", 5, 0, "🧰", "chest"],
  [KEY_HEART, "Heart", 9, 0, "❤️", "heart"],
  [KEY_START_SPHERE, "Start Sphere", 1, 0, "🪩", "GlowingWisp"],
  [KEY_DRAGON, "Dragon", 1, 13, "🐉", "AdultGreenDragon"],
];
export const tileTypeByKey = {};
export const data = Array(tileMap.count).fill({});

export const MAX_HEALTH_EVER = 19;

export const DEFAULT_STATS = {
  health: 5,
  gold: 0,
  level: 0,
};

export const STATE_COVERED = "covered";
export const STATE_REVEALED_ITEM = "revealed_item";
export const STATE_REVEALED_EMPTY = "revealed_empty";
export const STATE_REVEALED_GOLD = "revealed_gold";

export const makeTileData = () => ({ key: KEY_EMPTY, state: STATE_COVERED, guess: GUESS_NONE });

export const E_NOTHING = "nothing";
export const E_CLICK_COVERED_REVEALED_EMPTY = "E_CLICK_COVERED_REVEALED_EMPTY";
export const E_CLICK_COVERED_REVEALED_SPECIAL = "E_CLICK_COVERED_REVEALED_SPECIAL";
export const E_CLICK_COVERED_REVEALED_KILL_GOLD = "E_CLICK_COVERED_REVEALED_KILL_GOLD";
export const E_CLICK_COVERED_REVEALED_KILL_DIED = "E_CLICK_COVERED_REVEALED_KILL_DIED";
export const E_CLICK_PICKED_UP_GOLD = "E_CLICK_PICKED_UP_GOLD";
export const E_CLICK_PICKED_UP_HEART = "E_CLICK_PICKED_UP_HEART";
export const E_CLICK_START_SPHERE = "E_CLICK_START_SPHERE";
export const E_CLICK_PICKED_UP_SPECIAL = "E_CLICK_PICKED_UP_SPECIAL";
export const E_CLICK_ENEMY_KILL_GOLD = "E_CLICK_ENEMY_KILL_GOLD";
export const E_CLICK_ENEMY_KILL_DIED = "E_CLICK_ENEMY_KILL_DIED";

export let stats = { ...DEFAULT_STATS };

let model;
export function setModelInstance(instance) {
  model = instance;
}

export function resetStats() {
  stats = { ...DEFAULT_STATS };
}

export const makeModel = () => ({
  totals: () => {
    const result = { total: 0 };
    for (let i = 0; i < tileMap.count; i++) {
      const tdata = data[i];
      if (tileTypeByKey[tdata.key] === undefined || tdata.state === STATE_REVEALED_GOLD) {
        continue;
      }
      result.total += tileTypeByKey[tdata.key].power;
    }
    return result;
  },
  canLevelUp: () => stats.gold >= goldMax(stats),
  reset: () => {
    for (let i = 0; i < tileMap.count; i++) {
      data[i] = makeTileData();
    }
    for (let i = 0; i < tileTypes.length; i++) {
      const [key, name, count, power, display, anim] = tileTypes[i];
      tileTypeByKey[key] = { key, name, count, power, display, anim };
      for (let j = 0; j < count; j++) {
        const idx = tileMap.findEmptySpace(data, KEY_EMPTY);
        data[idx].key = key;
        if (key === KEY_DRAGON || key === KEY_START_SPHERE) {
          data[idx].state = STATE_REVEALED_ITEM;
        }
      }
    }
  },

  reveal: (index) => {
    const tData = data[index];
    tData.guess = GUESS_NONE;
    if (tData.state === STATE_COVERED) {
      if (tData.key === KEY_EMPTY) {
        tData.state = STATE_REVEALED_EMPTY;
      } else {
        tData.state = STATE_REVEALED_ITEM;
      }
    }
  },
  revealAll: () => {
    for (let i = 0; i < tileMap.count; i++) {
      model.reveal(i);
    }
  },
  calcPowerForTile: (i) => {
    let sum = 0;
    tileMap.iterateAround(i, 1, (x, y) => {
      const index = tileMap.xyToTileIndex(x, y);
      const { key } = data[index];
      if (key !== KEY_EMPTY) {
        sum += tileTypeByKey[key].power;
      }
    });
    return sum;
  },
  click: (data, index) => {
    const tData = data[index];
    if (tData.state === STATE_REVEALED_EMPTY) {
      return [E_NOTHING];
    }
    if (tData.state === STATE_COVERED) {
      if (tData.key === KEY_EMPTY) {
        tData.state = STATE_REVEALED_EMPTY;
        return [E_CLICK_COVERED_REVEALED_EMPTY];
      }
      const tileType = tileTypeByKey[tData.key];
      if (tileType.power === 0) {
        tData.state = STATE_REVEALED_ITEM;
        return [E_CLICK_COVERED_REVEALED_SPECIAL];
      }
      if (stats.health >= tileType.power) {
        tData.state = STATE_REVEALED_GOLD;
        stats.health -= tileType.power;
        return [E_CLICK_COVERED_REVEALED_KILL_GOLD];
      }
      model.revealAll();
      stats.health = 0;
      return [E_CLICK_COVERED_REVEALED_KILL_DIED];
    }
    if (tData.state === STATE_REVEALED_GOLD) {
      const tileType = tileTypeByKey[tData.key];
      tData.key = KEY_EMPTY;
      tData.state = STATE_REVEALED_EMPTY;
      stats.gold += tileType.power;
      return [E_CLICK_PICKED_UP_GOLD, tileType.power];
    }
    if (tData.state === STATE_REVEALED_ITEM) {
      const tileType = tileTypeByKey[tData.key];
      if (tileType.power > 0) {
        if (stats.health >= tileType.power) {
          tData.state = STATE_REVEALED_GOLD;
          stats.health -= tileType.power;
          return [E_CLICK_ENEMY_KILL_GOLD];
        }
        model.revealAll();
        stats.health = 0;
        return [E_CLICK_ENEMY_KILL_DIED];
      }
      if (tData.key === KEY_START_SPHERE) {
        tData.state = STATE_REVEALED_EMPTY;
        tData.key = KEY_EMPTY;
        tileMap.iterateAround(index, 2, (x, y) => {
          const index = tileMap.xyToTileIndex(x, y);
          model.reveal(index);
        });
        return [E_CLICK_START_SPHERE];
      }
      if (tData.key === KEY_HEART) {
        tData.state = STATE_REVEALED_EMPTY;
        tData.key = KEY_EMPTY;
        stats.health = healthMax(stats, MAX_HEALTH_EVER);
        return [E_CLICK_PICKED_UP_HEART];
      }
      tData.key = KEY_EMPTY;
      tData.state = STATE_REVEALED_EMPTY;
      return [E_CLICK_PICKED_UP_SPECIAL];
    }
    // Should never get here.
    return [E_NOTHING];
  },
  setGuess: (index, value) => {
    const tData = data[index];
    if (tData.state === STATE_COVERED) {
      if (value === GUESS_NONE || value === undefined) {
        tData.guess = GUESS_NONE;
      } else {
        tData.guess = value;
      }
    }
  },
});
