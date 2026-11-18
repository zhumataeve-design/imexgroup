const hero = document.querySelector('.hero');
const projection = document.querySelector('.projection');
const voice = document.querySelector('#voice');

const music = document.querySelector('#music');
const welcome = document.querySelector('#welcome');
const sound = document.querySelector('.sound');
const mini = document.querySelector('.mini');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let launched = false;
let muted = false;

music.volume = .18;

function placeHost() {
  if (!launched) return;
  const stage = document.querySelector('.visual').getBoundingClientRect();
  const docked = stage.bottom < Math.min(180, innerHeight / 3);
  mini.hidden = !docked;
  const anchor = docked ? mini.getBoundingClientRect() : stage;
  const side = docked ? anchor.width : Math.min(anchor.width, anchor.height);
  projection.style.width = side + 'px';
  projection.style.left = (anchor.x + (anchor.width - side) / 2) + 'px';
  projection.style.top = (anchor.y + (anchor.height - side) / 2) + 'px';
  projection.classList.toggle('docked', docked);
}
function updateControls() {
  const playing = !voice.paused;
  const label = playing ? 'Приостановить' : voice.ended ? 'Повторить приветствие' : 'Продолжить приветствие';
  welcome.textContent = label;
  mini.setAttribute('aria-label', label);
  mini.querySelector('span').textContent = playing ? 'Ⅱ' : '▷';
  projection.classList.toggle('speaking', playing || (launched && !voice.ended && voice.currentTime > 0));

}
function transmit() {
  if (!launched) {
    launched = true;
    hero.classList.add('launched');
    document.querySelector('.ship-target').hidden = true;
    projection.hidden = false;
    placeHost();
  } else if (!voice.paused) { voice.pause(); return; }
  if (!muted) music.play().catch(()=>{});
  voice.play().catch(showText);
}
function showText() {
  const details = document.querySelector('.transcript details');
  details.open = true;
  details.scrollIntoView();
}
for (const button of [welcome, mini, document.querySelector('.ship-target')]) button.addEventListener('click', transmit);
for (const event of ['playing','pause','ended']) voice.addEventListener(event, updateControls);
sound.addEventListener('click', ()=>{
  if (!launched && !muted) { transmit(); return; }
  muted = !muted;
  voice.muted = muted;
  music.muted = muted;
  if (!muted && launched) music.play().catch(()=>{});
  updateSound();
});
function updateSound() {
  const on = launched && !muted;
  document.querySelector('#sound-label').textContent = on ? 'Выключить звук' : 'Включить звук';
  sound.setAttribute('aria-pressed', String(on));
}
voice.addEventListener('playing',updateSound);
window.addEventListener('scroll', placeHost, {passive:true});
window.addEventListener('resize',placeHost);
if ('IntersectionObserver' in window) {
  const reveal = new IntersectionObserver(entries=>{
    for(const entry of entries) if(entry.isIntersecting){
      entry.target.classList.add('arrived');
      reveal.unobserve(entry.target);
    }
  },{threshold:.08});
  document.querySelectorAll('.event-grid>div,.gallery figure,.rsvp').forEach(el=>reveal.observe(el));
}

const door = document.querySelector('.invitation-door');
const opener = document.querySelector('#open-card');
door.showModal();
document.documentElement.classList.add('sealed');
door.addEventListener('cancel', event => event.preventDefault());
opener.addEventListener('click', () => {
  opener.disabled = true;
  window.scrollTo({top:0, behavior:'instant'});
  // Start playback inside the tap so iOS can play the greeting.
  transmit();
  door.classList.add('opening');
  function finishOpening() {
    if (!door.open) return;
    door.close();
    document.documentElement.classList.remove('sealed');
    welcome.focus({preventScroll:true});
    placeHost();
  }
  setTimeout(finishOpening, motion.matches ? 0 : 920);
}, {once:true});

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
