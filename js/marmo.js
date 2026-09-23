// Marmo nero venato d'oro, come il pavimento del salone.
// Shader WebGL leggero: si ferma fuori schermo, a scheda nascosta e con prefers-reduced-motion.

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uT;
uniform vec2 uLuce;   // puntatore, 0..1
uniform float uForza; // intensità della luce del puntatore

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++){ v += a * noise(p); p = r * p * 2.02; a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  float t = uT * 0.04;

  vec2 q = vec2(fbm(p * 1.6 + vec2(0.0, t)), fbm(p * 1.6 + vec2(5.2, -t)));
  float w = fbm(p * 1.3 + 2.4 * q + vec2(t * 0.6, 1.7));

  // vena principale: linee sottili lungo le isolinee del rumore deformato
  float v1 = abs(sin((p.x * 0.9 + p.y * 0.5 + w * 2.3) * 3.1));
  float vena = pow(1.0 - v1, 60.0) + pow(1.0 - v1, 9.0) * 0.12;
  // vene secondarie, più fitte e spente
  float v2 = abs(sin((p.x * -0.4 + p.y * 1.1 + w * 5.0 + q.x) * 6.3));
  float venina = pow(1.0 - v2, 40.0) * 0.35;

  vec3 fondo = mix(vec3(0.045, 0.036, 0.030), vec3(0.085, 0.068, 0.055), smoothstep(0.2, 0.9, w));
  fondo += 0.025 * (fbm(p * 7.0) - 0.5); // grana della pietra

  vec3 oro = vec3(0.83, 0.70, 0.52);
  vec3 oroChiaro = vec3(0.96, 0.87, 0.68);

  vec2 d = (uv - uLuce) * vec2(uRes.x / uRes.y, 1.0);
  float luce = uForza * exp(-dot(d, d) * 7.0);

  float scintilla = 0.55 + 0.45 * sin(uT * 0.7 + w * 12.0);
  vec3 col = fondo;
  col += oro * vena * (0.55 + 0.35 * scintilla + 1.6 * luce);
  col += oroChiaro * vena * luce * 0.9;
  col += oro * venina * (0.5 + luce);
  col += vec3(0.20, 0.15, 0.09) * luce * 0.25; // riflesso caldo sulla lucidatura

  // vignetta
  col *= 0.75 + 0.25 * smoothstep(1.25, 0.2, length(p));
  gl_FragColor = vec4(col, 1.0);
}`;

export function avviaMarmo(canvas) {
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return;

  const crea = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, crea(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, crea(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uT = gl.getUniformLocation(prog, 'uT');
  const uLuce = gl.getUniformLocation(prog, 'uLuce');
  const uForza = gl.getUniformLocation(prog, 'uForza');

  const fermo = matchMedia('(prefers-reduced-motion: reduce)');
  const scala = Math.min(devicePixelRatio || 1, 1.5) * 0.6;
  const luce = { x: 0.72, y: 0.62, tx: 0.72, ty: 0.62, f: 0.35, tf: 0.35 };

  function misura() {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * scala));
    canvas.height = Math.max(1, Math.round(r.height * scala));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  }

  let visibile = true, raf = 0, t0 = performance.now(), tempo = 8;
  function disegna(ora) {
    raf = 0;
    const dt = Math.min((ora - t0) / 1000, 0.05); t0 = ora;
    if (!fermo.matches) tempo += dt;
    luce.x += (luce.tx - luce.x) * 0.08;
    luce.y += (luce.ty - luce.y) * 0.08;
    luce.f += (luce.tf - luce.f) * 0.05;
    gl.uniform1f(uT, tempo);
    gl.uniform2f(uLuce, luce.x, luce.y);
    gl.uniform1f(uForza, luce.f);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (visibile && !document.hidden && !fermo.matches) raf = requestAnimationFrame(disegna);
  }
  const riparti = () => { if (!raf) { t0 = performance.now(); raf = requestAnimationFrame(disegna); } };

  const sposta = (x, y) => {
    const r = canvas.getBoundingClientRect();
    luce.tx = (x - r.left) / r.width;
    luce.ty = 1 - (y - r.top) / r.height;
    luce.tf = 1;
    if (fermo.matches) riparti();
  };
  addEventListener('pointermove', e => sposta(e.clientX, e.clientY), { passive: true });
  addEventListener('pointerdown', e => sposta(e.clientX, e.clientY), { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { luce.tf = 0.35; });

  new IntersectionObserver(([v]) => { visibile = v.isIntersecting; if (visibile) riparti(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) riparti(); });
  fermo.addEventListener?.('change', riparti);
  new ResizeObserver(() => { misura(); riparti(); }).observe(canvas);

  misura();
  riparti();
  requestAnimationFrame(() => canvas.classList.add('pronto'));
}
