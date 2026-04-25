"use strict";

const GUESS_NONE = "-";
// key, name, count, power, display

// Cute gaming assets come from:
// https://deepdivegamestudio.itch.io/
// Free for commercial use.
// https://greatdocbrown.itch.io/coins-gems-etc (CC0)

// TODO: sounds
// TODO: death
// TODO: picking up heart doesn't work
// TODO: uncovering bug, sometimes empty tiles need clicking on them

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
  ["C", "Chest", 5, 0, "🧰"],
  // TODO: ? dwarf? x 1 (0)
  [KEY_HEART, "Heart", 9, 0, "❤️", "heart"],
  [KEY_START_SPHERE, "Start Sphere", 1, 0, "🪩", "GlowingWisp"],
  // TODO: ? show bombs x 1 (0)
  // Others
  [KEY_DRAGON, "Dragon", 1, 13, "🐉", "AdultGreenDragon"],
  // TODO: walls x 6
];

// TODO: implement "?"

// Display states:
const STATE_COVERED = "covered"; // covered but no digits
const STATE_COVERED_WITH_GUESS = "covered_with_guess"; // covered with a guess from the user
const STATE_REVEALED_ITEM = "revealed_item"; // revealed, showing a monster or item, but not empty
const STATE_REVEALED_EMPTY = "revealed_empty"; // revealed, nothing (no digits)
const STATE_REVEALED_GOLD = "revealed_gold"; // revealed, leftover gold

const DEFAULT_STATS = {
  health: 5,
  gold: 0,
  level: 0,
};
const MAX_HEALTH_EVER = 19;

let stats = { ...DEFAULT_STATS };

const numCols = 13;
const numRows = 10;

document.addEventListener("DOMContentLoaded", () => {
  const gridContainer = document.getElementById("tile-grid");
  const totalTiles = numCols * numRows;
  const data = Array(totalTiles).fill({});
  const tileTypeByKey = {};

  // TODO: this is bad. Improve it.
  const findEmptySpace = () => {
    let count = 100;
    while (count--) {
      const index = Math.floor(Math.random() * totalTiles);
      if (data[index].key === KEY_EMPTY) {
        return index;
      }
    }
    throw new Error("Something went wrong");
  };

  const reset = () => {
    const gridContainer = document.getElementById("tile-grid");
    gridContainer.innerHTML = "";
    stats = { ...DEFAULT_STATS };

    for (let i = 0; i < totalTiles; i++) {
      data[i] = { key: KEY_EMPTY, state: STATE_COVERED, guess: GUESS_NONE };
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
  };

  const calcPowerForTile = (i) => {
    let sum = 0;
    iterateAround(i, 1, (x, y) => {
      const index = xyToTileIndex(x, y);
      const { key } = data[index];
      if (key !== KEY_EMPTY) {
        sum += tileTypeByKey[key].power;
      }
    });
    return sum;
  };

  const rightClick = (tile, index) => {
    const tData = data[index];
    if (tData.state === STATE_COVERED) {
      tData.state = STATE_COVERED_WITH_GUESS;
      tData.guess = 3;
      redrawTile(tile, index);
    } else if (tData.state === STATE_COVERED_WITH_GUESS) {
      tData.state = STATE_COVERED;
      tData.guess = GUESS_NONE;
      redrawTile(tile, index);
    }
  };

  const click = (tile, index) => {
    const tData = data[index];
    if (tData.state === STATE_COVERED || tData.state === STATE_COVERED_WITH_GUESS) {
      if (tData.key === KEY_EMPTY) {
        const calculatedPower = calcPowerForTile(index);
        tData.state = STATE_REVEALED_EMPTY;
        redrawTile(tile, index);
      } else {
        const tileType = tileTypeByKey[tData.key];
        if (tileType.power == 0) {
          // TODO: clicked on something special
          tData.state = STATE_REVEALED_ITEM;
        } else {
          tData.state = STATE_REVEALED_GOLD;
          stats.health -= tileType.power;
          const gridContainer = document.getElementById("tile-grid");
          iterateAround(index, 1, (x, y) => {
            const index = xyToTileIndex(x, y);
            const tile = gridContainer.children[index];
            redrawTile(tile, index);
          });
          redrawStats();
        }
        redrawTile(tile, index);
      }
    } else if (tData.state === STATE_REVEALED_GOLD) {
      const tileType = tileTypeByKey[tData.key];
      tData.key = KEY_EMPTY;
      tData.state = STATE_REVEALED_EMPTY;
      stats.gold += tileType.power;
      const gridContainer = document.getElementById("tile-grid");
      iterateAround(index, 1, (x, y) => {
        const index = xyToTileIndex(x, y);
        const tile = gridContainer.children[index];
        redrawTile(tile, index);
      });
      redrawStats();
    } else if (tData.state === STATE_REVEALED_ITEM) {
      const tileType = tileTypeByKey[tData.key];
      if (tileType.power === 0) {
        if (tData.key === KEY_START_SPHERE) {
          tData.state = STATE_REVEALED_EMPTY;
          tData.key = KEY_EMPTY;
          const gridContainer = document.getElementById("tile-grid");
          iterateAround(index, 2, (x, y) => {
            const index = xyToTileIndex(x, y);
            const dTile = data[index];
            if (dTile.state === STATE_COVERED || dTile.state === STATE_COVERED_WITH_GUESS) {
              dTile.guess = GUESS_NONE;
              if (dTile.key === KEY_EMPTY) {
                dTile.state = STATE_REVEALED_EMPTY;
              } else {
                dTile.state = STATE_REVEALED_ITEM;
              }
            }
            const tile = gridContainer.children[index];
            redrawTile(tile, index);
          });
          redrawStats();
        } else if (tData.key === KEY_HEART) {
          tData.state = STATE_REVEALED_EMPTY;
          tData.key = KEY_EMPTY;
          stats.health = healthMax();
          redrawTile(tile, index);
          redrawStats();
        } else {
          tData.key = KEY_EMPTY;
          tData.state = STATE_REVEALED_EMPTY;
          // TODO: do the thing!
          redrawTile(tile, index);
          redrawStats();
        }
      } else {
        if (tData.key === KEY_START_SPHERE) {
          // Shouldn't happen!
        } else {
          // TODO: is this needed?
          tData.state = STATE_REVEALED_GOLD;
          stats.health -= tileType.power;
          const gridContainer = document.getElementById("tile-grid");
          iterateAround(index, 1, (x, y) => {
            const index = xyToTileIndex(x, y);
            const tile = gridContainer.children[index];
            redrawTile(tile, index);
          });
          redrawStats();
        }
      }
    } else if (tData.state === STATE_REVEALED_EMPTY) {
      // Ignore click on empty tiles
    }
  };

  function format(s1, s2) {
    let s = s1.concat(s2);
    let result = "";
    for (let i = 0; i < s.length; i++) {
      if (i === 5 || (i > 5 && i % 5 === 0)) {
        result += " ";
      }
      result += s[i];
    }
    return result;
  }

  const repeat = (s, count) => {
    if (count <= 0) {
      return [];
    }
    return new Array(count).fill(s);
  };

  const redrawStats = () => {
    const statsDiv = document.getElementById("stats");
    statsDiv.innerHTML = "";
    // TODO: replace heart with image
    const healthIcon = format(repeat("❤️", stats.health), repeat("🩶", healthMax() - stats.health));
    const goldIcon = format(
      // TODO: clean this up
      repeat('<img class="animatedImage paused" data-anim="coin" width="16px" height="16px" />', stats.gold),
      repeat("⚫", Math.max(0, goldMax() - stats.gold)),
    );
    statsDiv.innerHTML = `Pepe ${healthIcon} ${stats.health}/${healthMax()} ${goldIcon} ${stats.gold}/${goldMax()} LVL ${stats.level}`;
    if (stats.gold >= goldMax()) {
      document.getElementById("level-up").hidden = false;
    } else {
      document.getElementById("level-up").hidden = true;
    }
  };

  const redrawTile = (tile, index) => {
    const tData = data[index];

    const state = tData.state;
    if (state === STATE_COVERED) {
      updateTileView(tile, state);
    } else if (state === STATE_REVEALED_EMPTY) {
      let power = calcPowerForTile(index);
      if (power === 0) {
        power = "";
      }
      updateTileView(tile, state, power);
    } else if (state === STATE_COVERED_WITH_GUESS) {
      if (tData.guess === GUESS_NONE) {
        updateTileView(tile, state, "");
      } else {
        updateTileView(tile, state, tData.guess);
      }
    } else if (state === STATE_REVEALED_ITEM) {
      let power = tileTypeByKey[tData.key].power;
      let anim = tileTypeByKey[tData.key].anim;
      if (power === 0) {
        power = "";
      }
      updateTileView(tile, state, tileTypeByKey[tData.key].display, power, anim);
    } else if (state === STATE_REVEALED_GOLD) {
      let power = tileTypeByKey[tData.key].power;
      let anim = tileTypeByKey[tData.key].anim;
      if (power === 0) {
        power = "";
      }
      updateTileView(tile, state, tileTypeByKey[tData.key].display, power, anim);
    }
  };

  const updateTileView = (tile, state, content, secondLine, anim) => {
    tile.innerHTML = "";
    tile.classList.remove("covered");
    tile.classList.remove("empty");

    if (state === STATE_COVERED) {
      tile.classList.add("covered");
    } else if (state === STATE_REVEALED_EMPTY) {
      tile.classList.add("empty");
      const span = document.createElement("span");
      span.innerText = content;
      tile.appendChild(span);
    } else if (state === STATE_COVERED_WITH_GUESS) {
      tile.classList.add("covered");
      // TODO
      const span = document.createElement("span");
      span.innerText = content;
      tile.appendChild(span);
    } else if (state === STATE_REVEALED_ITEM) {
      const newAnimation = makeImg();
      newAnimation.classList.add("animatedImage");
      if (anim) {
        newAnimation.dataset.anim = anim;
      }
      const animationDiv = document.createElement("div");
      animationDiv.appendChild(newAnimation);
      tile.appendChild(animationDiv);
      if (secondLine === "" || typeof secondLine === "undefined") {
        newAnimation.classList.add("itemOnly");
      }
      const span = document.createElement("span");
      span.innerText = secondLine;
      tile.appendChild(span);
    } else if (state === STATE_REVEALED_GOLD) {
      const newAnimation = makeImg();
      newAnimation.classList.add("animatedImage");
      newAnimation.classList.add("paused");
      newAnimation.classList.add("dead");
      if (anim) {
        newAnimation.dataset.anim = anim;
      }
      const animationDiv = document.createElement("div");
      animationDiv.appendChild(newAnimation);
      tile.appendChild(animationDiv);
      const span = document.createElement("span");
      span.innerText = secondLine;
      tile.appendChild(span);
      const coinImage = makeImg();
      coinImage.style.width = "16px";
      coinImage.style.height = "16px";
      coinImage.classList.add("animatedImage");
      coinImage.classList.add("coin");
      coinImage.dataset.anim = "coin";
      const coinDiv = document.createElement("div");
      coinDiv.appendChild(coinImage);
      tile.appendChild(coinDiv);
    }
  };

  const makeTile = (index) => {
    const tile = document.createElement("div");
    tile.classList.add("tile");
    tile.dataset.index = index;
    tile.innerText = "";
    tile.classList.add("covered");
    return tile;
  };

  const createGrid = () => {
    reset();
    for (let i = 0; i < totalTiles; i++) {
      const tile = makeTile(i);
      redrawTile(tile, i);

      tile.addEventListener("click", (event) => {
        const index = parseInt(event.currentTarget.dataset.index, 10);
        click(event.currentTarget, index);
      });

      tile.addEventListener("contextmenu", (event) => {
        const index = parseInt(event.currentTarget.dataset.index, 10);
        event.preventDefault();
        rightClick(event.currentTarget, index);
      });

      tile.addEventListener("mouseover", (obj) => {
        const index = parseInt(obj.target.dataset.index, 10);
        if (isNaN(index)) {
          return;
        }
        const { key } = data[index];
        // DEBUG console.table(data[index], tileTypeByKey[key]);
      });

      gridContainer.appendChild(tile);
    }
    redrawStats();
  };

  document.getElementById("level-up").addEventListener("click", () => {
    stats.gold -= goldMax();
    stats.level++;
    stats.health = healthMax();
    redrawStats();
  });

  document.getElementById("redo-button").addEventListener("click", () => {
    createGrid();
  });
  document.getElementById("showall-button").addEventListener("click", () => {
    for (let i = 0; i < totalTiles; i++) {
      const tData = data[i];
      if (tData.state === STATE_COVERED || tData.state === STATE_COVERED_WITH_GUESS) {
        tData.guess = GUESS_NONE;
        if (tData.key === KEY_EMPTY) {
          tData.state = STATE_REVEALED_EMPTY;
        } else {
          tData.state = STATE_REVEALED_ITEM;
        }
      }
      const tile = gridContainer.children[i];
      redrawTile(tile, i);
    }
  });
  createGrid();

  getSprites();
});

// Images and sprites

const getSprites = () => {
  // Sprite sheet
  Promise.all(spriteUrls.map(loadImage))
    .then((images) => {
      loadedImages = images;
      console.log("Loaded!");
      imagesFinishedLoading();
    })
    // TODO: proper error management
    .catch((err) => console.error(err));
};

const SPRITE_WIDTH = 16;
const SPRITE_HEIGHT = 16;
let spriteUrls = ["coin"];
for (let i = 0; i < tileTypes.length; i++) {
  const [key, name, count, power, display, anim] = tileTypes[i];
  if (anim) {
    spriteUrls.push(anim);
  }
}
let loadedImages = [];

const frames = {};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `img/${src}.png`;

    img.dataset.anim = src;

    img.onload = () => resolve(img);
    img.onerror = reject;
  });
}

const makeImg = (id) => {
  if (typeof id === "undefined") {
    id = "animage" + getId();
  }
  const img = document.createElement("img");
  img.id = id;
  img.width = SPRITE_WIDTH * 3;
  img.height = SPRITE_HEIGHT * 3;
  img.style.imageRendering = "pixelated";
  img.src =
    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='50' height='50'><rect width='100%' height='100%' fill='none'/></svg>";
  return img;
};

const imagesFinishedLoading = () => {
  loadedImages.forEach((image) => {
    const cols = Math.floor(image.width / SPRITE_WIDTH);
    const rows = Math.floor(image.height / SPRITE_HEIGHT);

    const container = document.getElementById("sprites");
    const canvas = document.createElement("canvas");
    canvas.width = SPRITE_WIDTH;
    canvas.height = SPRITE_HEIGHT;

    if (!frames[image.dataset.anim]) {
      frames[image.dataset.anim] = [];
    }

    const ctx = canvas.getContext("2d");
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stamp(ctx, image, x, y);

        // const img = makeImg(`img-${x}-${y}`);
        frames[image.dataset.anim].push(canvas.toDataURL());
        // img.src = canvas.toDataURL();
        // container.appendChild(img);
      }
      requestAnimationFrame(animate);
    }
  });
};

// Animations

let lastTime = 0;
let currentFrame = 0;
const fps = 10;
const frameDuration = 1000 / fps;

function animate(time) {
  if (time - lastTime >= frameDuration) {
    const elements = document.getElementsByClassName("animatedImage");
    for (let i = 0; i < elements.length; i++) {
      const elem = elements[i];
      const anim = elem.dataset.anim;
      if (!anim) {
        continue;
      }
      let f = currentFrame % frames[anim].length;
      if (elem.classList.contains("paused")) {
        f = 0;
      }
      elem.src = frames[anim][f];
    }
    currentFrame = currentFrame + 1;
    lastTime = time;
  }

  requestAnimationFrame(animate);
}
