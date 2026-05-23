import { tileTypes } from "./model.js";

export function loadAsset(url, elementCtor, readyEvent) {
  return new Promise((resolve, reject) => {
    const el = new elementCtor();
    el.src = url;
    el.addEventListener(readyEvent, () => resolve(el), { once: true });
    el.addEventListener("error", reject, { once: true });
  });
}

export function loadSound(src) {
  return loadAsset(src, Audio, "canplaythrough");
}

export async function loadImage(src) {
  const img = await loadAsset(`img/${src}.png`, Image, "load");
  img.dataset.anim = src;
  return img;
}

export async function loadAllAssets() {
  const soundNames = ["sad-trombone", "boom", "coin", "up1", "fight", "select", "reveal", "ping"];

  const soundPromises = soundNames.map((name) => loadSound(`snd/${name}.mp3`));

  const spriteNames = ["coin"];
  for (const [, , , , , anim] of tileTypes) {
    if (anim) {
      spriteNames.push(anim);
    }
  }
  const imagePromises = spriteNames.map(loadImage);

  const [sadTrombone, boom, coin, up1, fight, select, reveal, ping, ...images] = await Promise.all([
    ...soundPromises,
    ...imagePromises,
  ]);

  return {
    sounds: { sadTrombone, boom, coin, up1, fight, select, reveal, ping },
    images,
  };
}
