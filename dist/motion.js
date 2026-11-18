// A shared light field stays behind the invitation as the guest scrolls.
(() => {
  const canvas = document.querySelector('#atmosphere');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const quiet = matchMedia('(prefers-reduced-motion: reduce)');
  const stars = Array.from({length: 62}, () => [Math.random(), Math.random(), Math.random()]);
  let frame, last = -100;
  function size() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    restart();
  }
  function paint(now) {
    if (!quiet.matches && !document.hidden) frame = requestAnimationFrame(paint);
    if (now - last < 48) return;
    last = now;
    const w = canvas.width, h = canvas.height, t = quiet.matches ? 0 : now / 1000;
    ctx.clearRect(0,0,w,h);
    ctx.globalCompositeOperation='lighter';
    for(let i=0;i<4;i++) {
      const x=w*(i*.29+.10*Math.sin(t*.12+i)), y=h*(.34+.31*Math.sin(t*.16+i*1.48));
      const r=Math.max(w,h)*.48;
      const glow=ctx.createRadialGradient(x,y,0,x,y,r);
      glow.addColorStop(0,i%2?'rgba(79,52,160,.16)':'rgba(12,132,160,.19)');
      glow.addColorStop(1,'transparent');
      ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    }
    for(const [x,y,s] of stars){
      ctx.fillStyle='rgba(185,236,255,'+(.24+s*.44)+')';
      ctx.beginPath();ctx.arc((w*x+t*(3+s*6))%w,(h*y+h-(t*(2+s*6)+scrollY*.1)%h)%h,.6+s,0,Math.PI*2);ctx.fill();
    }
  }
  function restart(){cancelAnimationFrame(frame);last=-100;if(!document.hidden)paint(performance.now());}
  addEventListener('resize',size);quiet.addEventListener('change',restart);document.addEventListener('visibilitychange',restart);size();
})();
