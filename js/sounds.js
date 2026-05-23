export const playSound = (sound) => {
  return new Promise((resolve) => {
    const snd = sound.cloneNode();
    snd.onended = resolve;
    snd.play();
  });
};

export function playMultipleSounds(sound, count) {
  for (let i = 0; i < count; i++) {
    let delay = 0;
    if (i > 0) {
      delay = i * 80;
    }

    setTimeout(() => {
      const snd = sound.cloneNode();
      snd.play();
    }, delay);
  }
}
