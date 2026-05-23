// key, name, count, power, display

// Cute gaming assets come from:
// https://deepdivegamestudio.itch.io/ (Free even for commercial use)
// https://greatdocbrown.itch.io/coins-gems-etc (CC0)

// select.mp3, ping.mp3: recorded by ank

// TODO: finish implementing annotations
// TODO: implement "?"

import {
  DEFAULT_STATS,
  makeModel,
  setModelInstance,
  resetStats,
  data,
  tileTypeByKey,
  GUESS_NONE,
  STATE_COVERED,
  STATE_REVEALED_ITEM,
  STATE_REVEALED_EMPTY,
  STATE_REVEALED_GOLD,
  E_CLICK_COVERED_REVEALED_EMPTY,
  E_CLICK_COVERED_REVEALED_SPECIAL,
  E_CLICK_COVERED_REVEALED_KILL_GOLD,
  E_CLICK_COVERED_REVEALED_KILL_DIED,
  E_CLICK_PICKED_UP_GOLD,
  E_CLICK_PICKED_UP_HEART,
  E_CLICK_START_SPHERE,
  E_CLICK_PICKED_UP_SPECIAL,
  E_CLICK_ENEMY_KILL_GOLD,
  E_CLICK_ENEMY_KILL_DIED,
  stats,
  MAX_HEALTH_EVER,
  tileMap,
} from "./model.js";

import { healthMax, goldMax, SPRITE_WIDTH, SPRITE_HEIGHT, stamp, getId, lock, unlock, isLocked } from "./utils.js";

import { playMultipleSounds, playSound } from "./sounds.js";
import { loadAllAssets } from "./loader.js";

const model = makeModel();
setModelInstance(model);

const die = async () => {
  lock();
  const ripDiv = document.getElementById("rip");
  ripDiv.style.visibility = "visible";

  document.body.classList.add("shake");
  document.getElementById("parent-div").classList.add("flash");

  await playSound(sounds.boom);
  await playSound(sounds.sadTrombone);
  unlock();

  // TODO: reveal all
  setTimeout(() => {
    document.body.classList.remove("shake");
    document.getElementById("parent-div").classList.remove("flash");
  }, 2000);
};

const reset = () => {
  model.reset();

  const ripDiv = document.getElementById("rip");
  ripDiv.style.visibility = "hidden";

  resetStats();
};

let installed = false; // TODO: move logic to happen only once.
const lastMousePosition = { clientX: 0, clientY: 0 };
let lastRightClickedIndex = 0;
const rightClick = (tile, index) => {
  lastRightClickedIndex = index;
  const popup = document.getElementById("popup-guess");

  if (!installed) {
    installed = true;
    document.addEventListener("mousemove", (e) => {
      if (popup.style.visibility === "hidden") {
        return;
      }
      lastMousePosition.clientX = e.clientX;
      lastMousePosition.clientY = e.clientY;
    });
    popup.addEventListener("click", (e) => {
      const index = lastRightClickedIndex;
      const cell = e.target.closest("#popup-guess > div");
      if (!cell) return;

      const value = cell.textContent;
      model.setGuess(index, value);
      const gridContainer = document.getElementById("tile-grid");
      const tile = gridContainer.children[index];
      redrawTile(tile, index);
      popup.style.visibility = "hidden";
    });
  }

  popup.style.left = `${lastMousePosition.clientX}px`;
  popup.style.top = `${lastMousePosition.clientY}px`;
  if (popup.style.visibility !== "visible") {
    popup.style.visibility = "visible";
  } else {
    popup.style.visibility = "hidden";
  }
};

const click = (tile, index) => {
  const [e, param] = model.click(data, index);
  const gridContainer = document.getElementById("tile-grid");
  if (e === E_CLICK_COVERED_REVEALED_EMPTY) {
    redrawTile(tile, index);
  } else if (e === E_CLICK_COVERED_REVEALED_SPECIAL) {
    // TODO: animate the special result
    redrawTile(tile, index);
  } else if (e === E_CLICK_COVERED_REVEALED_KILL_GOLD) {
    tileMap.iterateAround(index, 1, (x, y) => {
      const idx = tileMap.xyToTileIndex(x, y);
      const tile = gridContainer.children[idx];
      redrawTile(tile, idx);
    });
    redrawStats();
  } else if (e === E_CLICK_COVERED_REVEALED_KILL_DIED) {
    for (let i = 0; i < tileMap.count; i++) {
      const tile = gridContainer.children[i];
      redrawTile(tile, i);
    }
    redrawStats();
    die();
  } else if (e === E_CLICK_PICKED_UP_GOLD) {
    const coinCount = param;
    playMultipleSounds(sounds.coin, coinCount);
    tileMap.iterateAround(index, 1, (x, y) => {
      const idx = tileMap.xyToTileIndex(x, y);
      const tile = gridContainer.children[idx];
      redrawTile(tile, idx);
    });
    redrawStats();
  } else if (e === E_CLICK_PICKED_UP_HEART) {
    redrawTile(tile, index);
    redrawStats();
    // TODO: add a cool sound
  } else if (e === E_CLICK_START_SPHERE) {
    sounds.reveal.play();
    tileMap.iterateAround(index, 2, (x, y) => {
      const i = tileMap.xyToTileIndex(x, y);
      const tile = gridContainer.children[i];
      redrawTile(tile, i);
    });

    redrawStats();
  } else if (e === E_CLICK_PICKED_UP_SPECIAL) {
    // TODO: user revealed something special but hasn't used it yet.
    redrawTile(tile, index);
    redrawStats();
  } else if (e === E_CLICK_ENEMY_KILL_GOLD) {
    sounds.fight.play();
    tileMap.iterateAround(index, 1, (x, y) => {
      const idx = tileMap.xyToTileIndex(x, y);
      const tile = gridContainer.children[idx];
      redrawTile(tile, idx);
    });
    redrawStats();
  } else if (e === E_CLICK_ENEMY_KILL_DIED) {
    for (let i = 0; i < tileMap.count; i++) {
      const tile = gridContainer.children[i];
      redrawTile(tile, i);
    }
    redrawStats();
    die();
  }
};

const makeStatIcon = (anim, extraClass) => {
  const img = document.createElement("img");
  img.className = `animatedImage paused${extraClass ? " " + extraClass : ""}`;
  img.dataset.anim = anim;
  img.width = 16;
  img.height = 16;
  img.src = frames[anim]?.[0] ?? "";
  return img;
};

const appendIcons = (parent, anim, count, extraClass) => {
  for (let i = 0; i < count; i++) {
    if (i > 0 && i % 5 === 0) {
      parent.appendChild(document.createTextNode(" "));
    }
    parent.appendChild(makeStatIcon(anim, extraClass));
  }
};

const redrawStats = () => {
  const healthForDisplay = Math.max(stats.health, 0);
  const statsDiv = document.getElementById("stats");
  const fragment = document.createDocumentFragment();

  const maxHealth = healthMax(stats, MAX_HEALTH_EVER);
  appendIcons(fragment, "heart", healthForDisplay);
  appendIcons(fragment, "heart", maxHealth - healthForDisplay, "dead");
  fragment.appendChild(document.createTextNode(` ${healthForDisplay}/${maxHealth}`));

  fragment.appendChild(document.createTextNode(" "));

  const goldTotal = goldMax(stats);
  appendIcons(fragment, "coin", stats.gold);
  appendIcons(fragment, "coin", goldTotal - stats.gold, "dead");
  fragment.appendChild(document.createTextNode(` ${stats.gold}/${goldTotal}`));

  fragment.appendChild(document.createTextNode(` LVL ${stats.level + 1}`));
  fragment.appendChild(document.createTextNode(` TOT ${model.totals().total}`));

  statsDiv.replaceChildren(fragment);
  document.getElementById("level-up").hidden = !model.canLevelUp();
};

const redrawTile = (tile, index) => {
  const tData = data[index];

  const { state } = tData;
  if (state === STATE_COVERED) {
    updateTileView(tile, state);
    if (tData.guess === GUESS_NONE) {
      updateTileView(tile, state, "");
    } else {
      updateTileView(tile, state, tData.guess);
    }
  } else if (state === STATE_REVEALED_EMPTY) {
    let power = model.calcPowerForTile(index);
    if (power === 0) {
      power = "";
    }
    updateTileView(tile, state, power);
  } else if (state === STATE_REVEALED_ITEM) {
    let { power } = tileTypeByKey[tData.key];
    const { anim } = tileTypeByKey[tData.key];
    if (power === 0) {
      power = "";
    }
    updateTileView(tile, state, tileTypeByKey[tData.key].display, power, anim);
  } else if (state === STATE_REVEALED_GOLD) {
    let { power } = tileTypeByKey[tData.key];
    const { anim } = tileTypeByKey[tData.key];
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
    if (content !== undefined && content !== "" && content !== GUESS_NONE) {
      const span = document.createElement("span");
      span.innerText = content;
      tile.appendChild(span);
    }
  } else if (state === STATE_REVEALED_EMPTY) {
    tile.classList.add("empty");
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
    coinImage.style.width = `${SPRITE_WIDTH}px`;
    coinImage.style.height = `${SPRITE_HEIGHT}px`;
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
  const gridContainer = document.getElementById("tile-grid");
  gridContainer.innerHTML = "";
  for (let i = 0; i < tileMap.count; i++) {
    const tile = makeTile(i);
    redrawTile(tile, i);

    tile.addEventListener("click", (event) => {
      const index = parseInt(event.currentTarget.dataset.index, 10);
      click(event.currentTarget, index);
    });

    tile.addEventListener("contextmenu", (event) => {
      const index = parseInt(event.currentTarget.dataset.index, 10);
      event.preventDefault();
      lastMousePosition.clientX = event.clientX;
      lastMousePosition.clientY = event.clientY;
      rightClick(event.currentTarget, index);
    });

    tile.addEventListener("mouseover", (obj) => {
      const index = parseInt(obj.target.dataset.index, 10);
      if (isNaN(index)) {
        return;
      }
      const { key } = data[index];
      // DEBUG
      // console.table(data[index], tileTypeByKey[key]);
    });

    gridContainer.appendChild(tile);
  }
  redrawStats();
};

let sounds = {};
let images = {};
const frames = {};

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Loading assets...");
  const assets = await loadAllAssets();
  sounds = assets.sounds;
  images = assets.images;
  console.log("Loaded assets", assets);
  imagesFinishedLoading(images);
  document.getElementById("loading").style.visibility = "hidden";

  document.getElementById("level-up").addEventListener("click", () => {
    stats.gold -= goldMax(stats);
    stats.level++;
    stats.health = healthMax(stats, MAX_HEALTH_EVER);
    redrawStats();
    sounds.ping.play();
  });

  document.getElementById("redo-button").addEventListener("click", () => {
    if (isLocked()) return;
    createGrid();
  });
  document.getElementById("showall-button").addEventListener("click", () => {
    model.revealAll();
    const gridContainer = document.getElementById("tile-grid");
    for (let i = 0; i < tileMap.count; i++) {
      const tile = gridContainer.children[i];
      redrawTile(tile, i);
    }
  });
  createGrid();
});

const makeImg = (id) => {
  if (typeof id === "undefined") {
    id = `animage${getId()}`;
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

const imagesFinishedLoading = (images) => {
  images.forEach((image) => {
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
      const { anim } = elem.dataset;
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
