// Use the cutout directly so native compositing preserves the silhouette on iOS.
(() => {
  const portrait = document.querySelector('.portrait');
  const audio = document.querySelector('#voice');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let levels = new Uint8Array();
  let frame = 0;
  let previous = -1;

  fetch('greeting-levels.bin').then(response => {
    if (!response.ok) throw new Error('Unavailable amplitude data');
    return response.arrayBuffer();
  }).then(bytes => { levels = new Uint8Array(bytes); }).catch(() => {});

  function draw() {
    const index = Math.floor(audio.currentTime * 25);
    if (index !== previous) {
      previous = index;
      portrait.style.setProperty('--signal', String((levels[index] || 0) / 255));
    }
    frame = requestAnimationFrame(draw);
  }
  function sync() {
    cancelAnimationFrame(frame);
    previous = -1;
    if (audio.paused || audio.ended || document.hidden || reduced.matches) {
      portrait.style.setProperty('--signal', '0');
      return;
    }
    draw();
  }
  for (const event of ['playing', 'pause', 'ended']) audio.addEventListener(event, sync);
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
})();
