const voice = document.querySelector('#voice');
const music = document.querySelector('#music');
const sound = document.querySelector('.sound');
const welcome = document.querySelector('#welcome');
const mini = document.querySelector('.mini');
const visual = document.querySelector('.visual');

let soundEnabled = false;
music.volume = 0.23;

function toggleSound() {
  soundEnabled = !soundEnabled;
  sound.setAttribute('aria-pressed', String(soundEnabled));
  document.querySelector('#sound-label').textContent = soundEnabled ? 'Выключить звук' : 'Включить звук';
  if (!soundEnabled) {
    voice.pause();
    music.pause();
    return;
  }
  music.play().catch(() => {});
  playVoice();
}

async function playVoice() {
  try {
    await voice.play();
  } catch {
    document.querySelector('.transcript details').open = true;
    document.querySelector('.transcript').scrollIntoView();
  }
}

function toggleVoice() {
  if (!soundEnabled) {
    toggleSound();
  } else if (voice.paused) {
    playVoice();
  } else {
    voice.pause();
  }
}

function syncAudio() {
  const playing = !voice.paused && !voice.ended;
  document.body.classList.toggle('playing', playing);
  mini.setAttribute('aria-label', playing ? 'Приостановить приветствие' : 'Воспроизвести приветствие');
  mini.querySelector('span').textContent = playing ? 'Ⅱ' : '▷';
  welcome.innerHTML = playing ? '<span aria-hidden="true">Ⅱ</span> Пауза' : '<span aria-hidden="true">▷</span> Слушать приветствие';
}

sound.addEventListener('click', toggleSound);
welcome.addEventListener('click', toggleVoice);
mini.addEventListener('click', toggleVoice);
for (const event of ['playing', 'pause', 'ended']) voice.addEventListener(event, syncAudio);

let previousRect;
let dockingAnimation;
const observer = new IntersectionObserver(([entry]) => {
  const dock = entry.boundingClientRect.top < 80 && entry.intersectionRatio < 0.4;
  if (dock === !mini.hidden) return;
  dockingAnimation?.cancel();
  mini.hidden = !dock;
  if (!dock || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  previousRect = entry.boundingClientRect;
  const target = mini.getBoundingClientRect();
  const offsetX = previousRect.x + previousRect.width * 0.5 - target.x - target.width * 0.5;
  const offsetY = Math.max(105, previousRect.y + previousRect.height * 0.5) - target.y - target.height * 0.5;
  dockingAnimation = mini.animate([
    { transform: `translate(${offsetX}px, ${offsetY}px) scale(2.2)`, opacity: 0.55 },
    { transform: 'none', opacity: 1 }
  ], { duration: 530, easing: 'cubic-bezier(.2,.8,.2,1)' });
}, { threshold: [0, 0.4, 1], rootMargin: '-65px 0px 0px' });
observer.observe(visual);

const form = document.querySelector('#guest-form');
const status = form.querySelector('.form-status');
const submit = form.querySelector('[type=submit]');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const endpoint = window.IMEX_RSVP_ENDPOINT;
  if (!endpoint) {
    status.textContent = 'Приём ответов пока не открыт.';
    return;
  }

  const values = new URLSearchParams(new FormData(form));
  if (!values.get('name').trim()) {
    status.textContent = 'Введите имя и фамилию.';
    form.elements.name.focus();
    return;
  }

  submit.disabled = true;
  status.textContent = 'Отправляем ответ…';
  try {
    const response = await fetch(endpoint, { method: 'POST', body: values, signal: AbortSignal.timeout(20000) });
    if (!response.ok || !(await response.json()).ok) throw new Error('Submission failed');
    status.textContent = 'Спасибо! Ваш ответ записан.';
    form.reset();
  } catch {
    status.textContent = 'Не удалось подтвердить отправку. Попробуйте ещё раз чуть позже.';
  } finally {
    submit.disabled = false;
  }
});
