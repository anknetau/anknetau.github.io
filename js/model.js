const NUM_COLS = 13;
const NUM_ROWS = 10;
const TILE_COUNT = NUM_COLS * NUM_ROWS;

const GUESS_NONE = "-";

const KEY_EMPTY = "-"; // key of "-" means empty
const KEY_DRAGON = "D";
const KEY_START_SPHERE = "SS";
const KEY_HEART = "HEART";
const tileTypes = [
  // First Column
  ["Rat", "Rat", 13, 1, "🐁", "OcularWatcher"],
  ["Bat", "Bat", 12, 2, "🦇", "SwoopingBat"],
  ["Sk", "Skeleton", 10, 3, "🩻", "FireElemental"],
  ["D1", "Dunno 1", 8, 4, "🦧", "HumongousEttin"],
  ["B1", "Blob", 8, 5, "🪼", "DeathSlime"],
  ["F", "Fishman", 5, 6, "🦈", "WarpSkull"],
  ["K", "Knight", 4, 7, "👮", "InfectedMouse"], // TODO: i don't like this image
  ["B2", "Mean Blob", 5, 8, "🪻", "OchreJelly"],
  ["f", "Fairy", 2, 9, "🧚", "MagicalFairy"], // TODO: when it dies it gives you a heart
  ["D2", "Dunno 2", 1, 10, "🐒", "SwordArchon"], // TODO: when it dies it shows all bombs (? maybe ?)
  // Second column
  ["RK", "Rat King", 1, 5, "🤴", "BloodshotEye"], // TODO: when it dies it shows all rats
  ["B3", "Mystery Blob", 8, 5, "👁️", "BabyWhiteDragon"], // TODO: Number varies (appears around blob king)
  ["BK", "Blob King", 1, 1, "👑", "AdultWhiteDragon"],
  ["GO", "Golem", 1, 11, "G", "IronGolem"], // TODO: fake chest, has 11 health, x1
  ["B", "Bomb", 9, 100, "💣", "FloatingEye"],
  ["C", "Chest", 5, 0, "🧰", "chest"], // TODO: finish chest!
  // TODO: ? dwarf? x 1 (0)
  [KEY_HEART, "Heart", 9, 0, "❤️", "heart"],
  [KEY_START_SPHERE, "Start Sphere", 1, 0, "🪩", "GlowingWisp"],
  // TODO: ? show bombs x 1 (0)
  // Others
  [KEY_DRAGON, "Dragon", 1, 13, "🐉", "AdultGreenDragon"],
  // TODO: walls x 6
];
const tileTypeByKey = {};
const data = Array(TILE_COUNT).fill({});

const MAX_HEALTH_EVER = 19;

const DEFAULT_STATS = {
  health: 5,
  gold: 0,
  level: 0,
};

// Display states:
const STATE_COVERED = "covered"; // covered, may have a guess
const STATE_REVEALED_ITEM = "revealed_item"; // revealed, showing a monster or item, but not empty
const STATE_REVEALED_EMPTY = "revealed_empty"; // revealed, nothing (no digits)
const STATE_REVEALED_GOLD = "revealed_gold"; // revealed, leftover gold

const makeTileData = () => {
  return { key: KEY_EMPTY, state: STATE_COVERED, guess: GUESS_NONE };
};

const E_NOTHING = "nothing";
const E_CLICK_COVERED_REVEALED_EMPTY = "E_CLICK_COVERED_REVEALED_EMPTY";
const E_CLICK_COVERED_REVEALED_SPECIAL = "E_CLICK_COVERED_REVEALED_SPECIAL";
const E_CLICK_COVERED_REVEALED_KILL_GOLD = "E_CLICK_COVERED_REVEALED_KILL_GOLD";
const E_CLICK_COVERED_REVEALED_KILL_DIED = "E_CLICK_COVERED_REVEALED_KILL_DIED";
const E_CLICK_PICKED_UP_GOLD = "E_CLICK_PICKED_UP_GOLD";
const E_CLICK_PICKED_UP_HEART = "E_CLICK_PICKED_UP_HEART";
const E_CLICK_START_SPHERE = "E_CLICK_START_SPHERE";
const E_CLICK_PICKED_UP_SPECIAL = "E_CLICK_PICKED_UP_SPECIAL";
const E_CLICK_ENEMY_KILL_GOLD = "E_CLICK_ENEMY_KILL_GOLD";
const E_CLICK_ENEMY_KILL_DIED = "E_CLICK_ENEMY_KILL_DIED";

const makeModel = () => {
  return {
    canLevelUp: () => {
      return stats.gold >= goldMax();
    },
    reset: () => {
      for (let i = 0; i < TILE_COUNT; i++) {
        data[i] = makeTileData();
      }
      for (let i = 0; i < tileTypes.length; i++) {
        const [key, name, count, power, display, anim] = tileTypes[i];
        tileTypeByKey[key] = { key, name, count, power, display, anim };
        for (let j = 0; j < count; j++) {
          const idx = findEmptySpace();
          data[idx].key = key;
          if (key === KEY_DRAGON || key === KEY_START_SPHERE) {
            data[idx].state = STATE_REVEALED_ITEM;
          }

          // TODO: this is for debug:
          // data[idx].state = STATE_REVEALED_ITEM;
        }
      }
    },

    reveal: (index) => {
      // TODO: there's a bug with revealing showing empty tiles with no number.
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
      for (let i = 0; i < TILE_COUNT; i++) {
        model.reveal(i);
      }
    },
    calcPowerForTile: (i) => {
      let sum = 0;
      iterateAround(i, 1, (x, y) => {
        const index = xyToTileIndex(x, y);
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
        // Ignore click on empty tiles
        return [E_NOTHING];
      }
      if (tData.state === STATE_COVERED) {
        if (tData.key === KEY_EMPTY) {
          tData.state = STATE_REVEALED_EMPTY;
          return [E_CLICK_COVERED_REVEALED_EMPTY];
        } else {
          const tileType = tileTypeByKey[tData.key];
          if (tileType.power == 0) {
            // TODO: user revealed something special but hasn't used it yet.
            tData.state = STATE_REVEALED_ITEM;
            return [E_CLICK_COVERED_REVEALED_SPECIAL];
          } else {
            if (stats.health >= tileType.power) {
              // Enough HP to kill.
              tData.state = STATE_REVEALED_GOLD;
              stats.health -= tileType.power;
              return [E_CLICK_COVERED_REVEALED_KILL_GOLD];
            } else {
              // Not enough HP to kill!
              model.revealAll();
              stats.health = 0;
              return [E_CLICK_COVERED_REVEALED_KILL_DIED];
            }
          }
        }
      } else if (tData.state === STATE_REVEALED_GOLD) {
        // Pick up the gold!
        const tileType = tileTypeByKey[tData.key];
        tData.key = KEY_EMPTY;
        tData.state = STATE_REVEALED_EMPTY;
        stats.gold += tileType.power;
        return [E_CLICK_PICKED_UP_GOLD, tileType.power];
      } else if (tData.state === STATE_REVEALED_ITEM) {
        const tileType = tileTypeByKey[tData.key];
        if (tileType.power > 0) {
          // Clicked on a revealed enemy
          if (stats.health >= tileType.power) {
            // Enough HP to kill.
            tData.state = STATE_REVEALED_GOLD;
            stats.health -= tileType.power;
            return [E_CLICK_ENEMY_KILL_GOLD];
          } else {
            // Not enough HP to kill!
            model.revealAll();
            stats.health = 0;
            return [E_CLICK_ENEMY_KILL_DIED];
          }
        } else {
          // Special case
          if (tData.key === KEY_START_SPHERE) {
            tData.state = STATE_REVEALED_EMPTY;
            tData.key = KEY_EMPTY;
            iterateAround(index, 2, (x, y) => {
              const index = xyToTileIndex(x, y);
              model.reveal(index);
            });
            return [E_CLICK_START_SPHERE];
          } else if (tData.key === KEY_HEART) {
            tData.state = STATE_REVEALED_EMPTY;
            tData.key = KEY_EMPTY;
            stats.health = healthMax();
            return [E_CLICK_PICKED_UP_HEART];
          } else {
            tData.key = KEY_EMPTY;
            tData.state = STATE_REVEALED_EMPTY;
            // TODO: do the thing!
            return [E_CLICK_PICKED_UP_SPECIAL];
          }
        }
      }
      if (stats.health < 0) {
        die();
      }
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
  };
};
