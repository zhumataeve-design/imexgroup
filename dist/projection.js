// Portrait coordinates use the hostess artwork with a top-left origin.
(() => {
  const holder = document.querySelector('.portrait');
  const portrait = holder.querySelector('img');
  const audio = document.querySelector('#voice');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', {alpha:true, premultipliedAlpha:false, antialias:false});
  // Build a transparent projection plate for both the animated and 2-D paths.
  const plate = document.createElement('canvas');
  async function preparePlate() {
    await portrait.decode();
    plate.width = portrait.naturalWidth;
    plate.height = portrait.naturalHeight;
    const ctx = plate.getContext('2d', {willReadFrequently:true});
    ctx.drawImage(portrait,0,0);
    const frame = ctx.getImageData(0,0,plate.width,plate.height);
    const rgba = frame.data;
    for(let i=0;i<rgba.length;i+=4){
      const light=Math.max(rgba[i],rgba[i+1],rgba[i+2]);
      rgba[i+3]=Math.round(255*Math.min(1,Math.max(0,(light-10)/43)));
    }
    ctx.putImageData(frame,0,0);
    holder.append(plate);
    portrait.style.visibility='hidden';
  }
  const ready = preparePlate();
  if (!gl) return;
  const vertex = 'attribute vec2 point; varying vec2 uv; void main(){uv=vec2(point.x,-point.y)*0.5+0.5;gl_Position=vec4(point,0.,1.);}';
  const fragment = `precision mediump float;
  varying vec2 uv;
  uniform sampler2D portrait;
  uniform float time, level, gaze, blink;
  float oval(vec2 p,vec2 center,vec2 radius){
    vec2 d=(p-center)/radius;
    return exp(-dot(d,d)*1.8);
  }
  void main(){
    vec2 p=uv;
    float head=oval(p,vec2(.49,.17),vec2(.21,.18));
    float depth=oval(p,vec2(.495,.20),vec2(.12,.10));
    p.x-=(.011*sin(time*.72)+gaze*.014)*(head+depth);
    p.y-=.006*sin(time*.95)*head;
    float eyes=oval(p,vec2(.428,.174),vec2(.039,.014))+oval(p,vec2(.537,.163),vec2(.041,.014));
    p.y-=.011*eyes*blink;
    float lips=oval(p,vec2(.500,.242),vec2(.065,.029));
    float seam=.242-.095*(p.x-.50);
    float opening=.007*level*lips;
    float distanceToLip=p.y-seam;
    p.y-=opening*smoothstep(-.002,.006,distanceToLip);
    vec4 sampleColor=texture2D(portrait,p); vec3 c=sampleColor.rgb;
    float gap=smoothstep(-.002,.002,distanceToLip)*(1.-smoothstep(opening-.002,opening+.002,distanceToLip))*level*lips;
    c=mix(c,vec3(.035,.026,.10),gap*.85);
    float scan=exp(-abs(fract(time*.106)-uv.y)*63.);
    c*=1.+.19*level*head+.27*scan;
    gl_FragColor=vec4(c,sampleColor.a);
  }`;
  const program=gl.createProgram();
  for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
    const shader=gl.createShader(type);
    gl.shaderSource(shader,source);
    gl.compileShader(shader);
    gl.attachShader(program,shader);
  }
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) return;
  gl.useProgram(program);
  const buffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const point=gl.getAttribLocation(program,'point');
  gl.enableVertexAttribArray(point);
  gl.vertexAttribPointer(point,2,gl.FLOAT,false,0,0);
  const uniforms=Object.fromEntries(['time','level','gaze','blink'].map(k=>[k,gl.getUniformLocation(program,k)]));
  let levels=[],target=0,angle=0,energy=0,last=-100;
  fetch('greeting-levels.bin').then(r=>r.arrayBuffer()).then(b=>levels=new Uint8Array(b)).catch(()=>{});
  document.querySelector('.hero').addEventListener('pointermove',e=>{target=2*e.clientX/innerWidth-1;});
  document.querySelector('.hero').addEventListener('pointerleave',()=>target=0);
  function render(ms){
    requestAnimationFrame(render);
    if(document.hidden || ms-last<32) return;
    last=ms;
    const parent=holder;
    if(canvas.parentElement!==parent) parent.append(canvas);
    const side=Math.min(960,Math.ceil(parent.clientWidth*Math.min(devicePixelRatio,1.6)));
    if(!side) return;
    if(canvas.width!==side){canvas.width=canvas.height=side;gl.viewport(0,0,side,side);}
    const t=reduced.matches?0:ms/1000;
    const index=Math.floor(audio.currentTime*25);
    energy+=.58*((audio.paused?0:(levels[index]||0)/255)-energy);
    angle+=.06*((reduced.matches?0:target)-angle);
    const blink=Math.max(0,1-Math.abs((t%4.7)-3.7)/.12);
    gl.uniform1f(uniforms.time,t);
    gl.uniform1f(uniforms.blink,blink);
    gl.uniform1f(uniforms.level,energy);
    gl.uniform1f(uniforms.gaze,angle);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  ready.then(()=>{
    gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,plate);
    plate.hidden=true;
    requestAnimationFrame(render);
  }).catch(()=>{});
})();
