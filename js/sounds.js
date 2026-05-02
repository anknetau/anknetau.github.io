// Sound https://pixabay.com/service/license-summary/
// Some sounds generated with https://sfxr.me/

function loadSound(src) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.src = src;

    audio.addEventListener(
      "canplaythrough",
      () => {
        resolve(audio);
      },
      { once: true },
    );

    // TODO: handle loading errors
    audio.addEventListener("error", reject, { once: true });
  });
}

async function loadSounds() {
  const [sadTrombone, boom, coin, up1, fight] = await Promise.all([
    loadSound("snd/sad-trombone.mp3"),
    loadSound("snd/boom.mp3"),
    loadSound("snd/coin.mp3"),
    loadSound("snd/up1.mp3"),
    loadSound("snd/fight.mp3"),
  ]);

  return { sadTrombone, boom, coin, up1, fight };
}

function playMultipleSounds(sound, count) {
  for (let i = 0; i < count; i++) {
    let delay = 0;
    if (i > 0) {
      delay = i * 80;
    }

    setTimeout(() => {
      // clone so overlapping plays don't cut each other off
      const snd = sound.cloneNode();
      snd.play();
    }, delay);
  }
}
