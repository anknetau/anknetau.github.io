let getId = () => {};
{
  let id = 0;
  getId = () => {
    id = id + 1;
    return id;
  };
}

export const SPRITE_WIDTH = 16;
export const SPRITE_HEIGHT = 16;

export const stamp = (ctx, img, x, y) => {
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

let _locked = false;
export const lock = () => { _locked = true; document.body.dataset.locked = ""; };
export const unlock = () => { _locked = false; delete document.body.dataset.locked; };
export const isLocked = () => _locked;

export const healthMax = (stats, maxHealthEver) => Math.min(maxHealthEver, Math.round(4.5 + stats.level / 2));

export const goldMax = (stats) => {
  const table = [4, 5, 7, 9, 9, 10, 12, 12, 12, 15, 18, 21, 21, 25];
  const i = stats.level;
  if (i >= table.length) {
    return 25;
  }
  return table[i];
};

export { getId };
