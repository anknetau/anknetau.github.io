"use strict";

let getId = () => {};
{
  let id = 0;
  getId = () => {
    id = id + 1;
    return id;
  };
}

const stamp = (ctx, img, x, y) => {
  ctx.drawImage(
    img,
    x * SPRITE_WIDTH,
    y * SPRITE_HEIGHT,
    SPRITE_WIDTH,
    SPRITE_HEIGHT,
    0,
    0,
    SPRITE_WIDTH,
    SPRITE_HEIGHT,
  );
};

const tileIndexToXY = (index) => {
  const x = index % NUM_COLS;
  const y = Math.floor(index / NUM_COLS);
  return [x, y];
};

const xyToTileIndex = (x, y) => {
  return NUM_COLS * y + x;
};

const iterateAround = (index, size, f) => {
  const [x, y] = tileIndexToXY(index);
  for (let dx = -size; dx <= size; dx++) {
    for (let dy = -size; dy <= size; dy++) {
      if (size === 2 && Math.abs(dx) + Math.abs(dy) > size) {
        continue;
      }
      if (x + dx >= 0 && x + dx < NUM_COLS && y + dy >= 0 && y + dy < NUM_ROWS) {
        f(x + dx, y + dy);
      }
    }
  }
};

const healthMax = () => {
  return Math.min(MAX_HEALTH_EVER, Math.round(4.5 + stats.level / 2));
};

const goldMax = () => {
  const table = [4, 5, 7, 9, 9, 10, 12, 12, 12, 15, 18, 21, 21, 25];
  const i = stats.level;
  if (i >= table.length) {
    return 25;
  }
  return table[i];
};

// TODO: this is bad. Improve it.
const findEmptySpace = () => {
  let count = 100;
  while (count--) {
    const index = Math.floor(Math.random() * TILE_COUNT);
    if (data[index].key === KEY_EMPTY) {
      return index;
    }
  }
  throw new Error("Something went wrong");
};
