/* ============================================================
   عارض تشريح العين ثلاثي الأبعاد — عرض متمدّد (Exploded view)
   النموذج: "Cross Section of Eye - Anatomy" بقلم Erik Ao
   رخصة CC-BY-4.0 — الاستخدام التجاري مسموح مع الإسناد
   ============================================================ */
import * as THREE from 'three';
import { OrbitControls }   from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader }      from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const host    = document.getElementById('eyeStage');
const canvas  = document.getElementById('eyeCanvas');
const loading = document.getElementById('eyeLoading');
const infoBox = document.getElementById('eyeInfo');
const leaders = document.getElementById('eyeLeaders');

/* ---------- مجموعات البنى: بادئة الاسم في الملف ← العربية ----------
   ord = الترتيب على المحور البصري من الأمام إلى الخلف
   shell = طبقة كروية تُشفّ في وضع «رؤية شفافة»                        */
const GROUPS = [
  { key:'cornea', match:['Cornea'], ar:'القرنية', en:'Cornea', ord:0, label:1,
    desc:'الطبقة الشفافة الأمامية التي تغطي القزحية والبؤبؤ، ومسؤولة عن نحو ثلثي قوة تركيز الضوء داخل العين. عليها تُجرى عمليات الليزر لتصحيح النظر، وسماكتها وخريطتها الطبوغرافية تحدّدان التقنية المناسبة.' },
  { key:'iris', match:['iris'], ar:'القزحية والبؤبؤ', en:'Iris & pupil', ord:0.7, label:1,
    desc:'الحلقة الملوّنة التي تتحكم بحجم البؤبؤ فتنظّم كمية الضوء الداخلة، تماماً كفتحة عدسة الكاميرا. الفتحة السوداء في مركزها هي البؤبؤ، ونوسّعه بالقطرات لفحص قاع العين.' },
  { key:'lens', match:['Lens'], ar:'العدسة', en:'Lens', ord:1.4, label:1,
    desc:'عدسة شفافة مرنة تركّز الضوء على الشبكية وتغيّر قوتها للرؤية القريبة. عتامتها مع العمر هي «الساد» أو الماء الأبيض، وتُستبدل جراحياً بعدسة صناعية.' },
  { key:'zonules', match:['Suspensory'], ar:'أربطة العدسة', en:'Zonule of Zinn', ord:2.0,
    desc:'ألياف رفيعة جداً تعلّق العدسة بالجسم الهدبي وتنقل إليها شدّ العضلة الهدبية أثناء التركيز.' },
  { key:'retina', match:['Retina'], ar:'الشبكية', en:'Retina', ord:2.6, label:1, shell:1,
    desc:'طبقة عصبية رقيقة تبطّن داخل العين وتحوّل الضوء إلى إشارات كهربائية. تتأثر بالسكري وقد تنفصل، ونصوّرها طبقةً طبقة بجهاز OCT.' },
  { key:'choroid', match:['Choroid','Muscle 1','Muscle 2'], ar:'المشيمية', en:'Choroid', ord:4.2, label:1, shell:1,
    desc:'طبقة غنية بالأوعية الدموية بين الصلبة والشبكية، تغذّي طبقات الشبكية الخارجية بالأكسجين وتمتص الضوء الزائد.' },
  { key:'sclera', match:['Sclera'], ar:'الصلبة', en:'Sclera', ord:5.8, label:1, shell:1,
    desc:'الغلاف الأبيض القوي الذي يحمي كرة العين ويحافظ على شكلها، وترتبط به العضلات الستّ التي تحرّك العين.' },
  { key:'nerve', match:['Cylinder'], ar:'العصب البصري', en:'Optic nerve', ord:5.8, label:1,
    desc:'يحمل أكثر من مليون ليف عصبي من الشبكية إلى الدماغ. تلفه التدريجي بارتفاع ضغط العين هو جوهر مرض الجلوكوما.' },
  { key:'artery', match:['Artery'], ar:'الشريان المركزي للشبكية', en:'Central retinal artery', ord:5.8, label:1,
    desc:'يدخل مع العصب البصري ليغذّي الطبقات الداخلية للشبكية. انسداده يسبّب فقد بصر مفاجئاً وغير مؤلم.' },
  { key:'vein', match:['Vein'], ar:'الوريد المركزي للشبكية', en:'Central retinal vein', ord:5.8,
    desc:'يصرّف دم الشبكية عائداً من العين. انسداده من أسباب النزف داخل الشبكية وتورّم البقعة الصفراء.' },
  { key:'muscles', match:['Cube'], ar:'العضلات المحرّكة', en:'Extraocular muscles', ord:5.8, label:1,
    desc:'ستّ عضلات ترتبط بالصلبة وتحرّك العين في كل الاتجاهات. اختلال توازنها هو سبب الحول.' },
];

const CHIP2KEY = {
  cornea:'cornea', iris:'iris', pupil:'iris', lens:'lens', retina:'retina',
  choroid:'choroid', sclera:'sclera', optic:'nerve', vitreous:'retina',
  macula:'retina', fovea:'retina', ciliary:'zonules', aqueous:'cornea',
  trabecular:'iris', limbus:'cornea',
};

const SPREAD = 1.0;
const MIDORD = 3.0;

let renderer, scene, camera, controls, root, holder, scaleK = 1;
const parts = [];
let mode = 'solid';
let explode = 0, explodeTo = 0, labelsOn = true, spin = false;
let fly = null, activeId = null, rotTo = 0;
let AXIS = new THREE.Vector3(0, 0, -1), axisView = new THREE.Vector3(0, 0, -1);
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();

const VIEW_ASSEMBLED = 0.72;     // زاوية تُظهر القزحية ووجه المقطع
const VIEW_EXPLODED  = Math.PI;  // وجه المقطع عند التمدّد
const VIEW_Y = VIEW_ASSEMBLED;
const HOME  = [0.25, 0.7, 9.6];
const TIGHT = [1.15, 1.01, 6.95];

init();

/* ==================== التهيئة ==================== */
function init(){
  try{
    renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  }catch(e){ return fail('متصفحك لا يدعم WebGL'); }

  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene  = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(34, 1, 0.05, 100);
  camera.position.set(...TIGHT);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 2.2;
  controls.maxDistance = 18;
  controls.enablePan = false;
  controls.addEventListener('start', () => { spin = false; syncSpinBtn(); });

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const k = new THREE.DirectionalLight(0xffffff, 2.3); k.position.set( 4.0, 2.6, 2.4); scene.add(k);
  const r = new THREE.DirectionalLight(0x9fc7ff, 1.9); r.position.set(-3.0, 1.4,-3.4); scene.add(r);
  const f = new THREE.DirectionalLight(0xffd9b8, 0.8); f.position.set(-1.0,-3.0, 2.0); scene.add(f);

  addEventListener('resize', resize);
  resize();
  loadModel();
}

function fail(msg){
  host.classList.add('failed');
  loading.classList.add('hide');
  const h = host.querySelector('.stage__fallback h3');
  if(h && msg) h.textContent = msg;
}

/* ==================== تحميل النموذج ==================== */
function loadModel(){
  new GLTFLoader().load('assets/models/eye-cross.glb', gltf => {
    const model = gltf.scene;

    /* تجميع الشبكات حسب بادئة الاسم */
    const bucket = {};
    model.traverse(o => {
      if(!o.isMesh) return;
      const g = GROUPS.find(g => g.match.some(m => o.name.startsWith(m)));
      if(!g) return;
      (bucket[g.key] ||= []).push(o);
    });

    /* التوسيط على كرة العين نفسها (لا على العضلات الممتدة خلفها) */
    const gbox = new THREE.Box3();
    (bucket.sclera || []).forEach(m => gbox.expandByObject(m));
    if(gbox.isEmpty()) gbox.setFromObject(model);
    const gsize = gbox.getSize(new THREE.Vector3());
    const gctr  = gbox.getCenter(new THREE.Vector3());
    scaleK = 2.0 / Math.max(gsize.x, gsize.y, gsize.z);

    model.position.sub(gctr);
    holder = new THREE.Group();
    holder.add(model);
    holder.scale.setScalar(scaleK);
    holder.updateMatrixWorld(true);

    /* المحور البصري: من مركز الكرة إلى مركز القرنية (فضاء عالمي) */
    const cornea = bucket.cornea && bucket.cornea[0];
    if(cornea){
      const c = new THREE.Box3().setFromObject(cornea).getCenter(new THREE.Vector3());
      const a = c.clone().normalize();                  // الكرة موسّطة على الأصل
      const q = new THREE.Quaternion().setFromUnitVectors(a, new THREE.Vector3(-1, 0, 0));
      holder.quaternion.premultiply(q);
      holder.updateMatrixWorld(true);
    }

    root = new THREE.Group();
    root.add(holder);
    root.rotation.y = VIEW_Y;
    rotTo = VIEW_Y;
    scene.add(root);
    root.updateMatrixWorld(true);

    // بعد الإدارة صار المحور البصري = -X داخل holder ⇒ نحسبه عالمياً
    AXIS = new THREE.Vector3(-1, 0, 0).transformDirection(holder.matrixWorld).normalize();

    /* تسجيل المجموعات */
    GROUPS.forEach(g => {
      const meshes = bucket[g.key];
      if(!meshes || !meshes.length) return;
      const mats = new Map();
      meshes.forEach(m => {
        if(!mats.has(m.material)) mats.set(m.material, m.material.clone());
        m.material = mats.get(m.material);
        m.material.side = THREE.DoubleSide;
        m.userData.baseOpacity = m.material.opacity;
        m.userData.baseTransparent = m.material.transparent;
      });
      const c = new THREE.Box3();
      meshes.forEach(m => c.expandByObject(m));
      const center = c.getCenter(new THREE.Vector3());   // عالمي
      root.worldToLocal(center);                          // ← فضاء root
      const inv = new THREE.Matrix4();
      const dirs = meshes.map(m => {
        inv.copy(m.parent.matrixWorld).invert();
        return AXIS.clone().transformDirection(inv).normalize();
      });
      parts.push({ ...g, meshes, mats:[...mats.values()], dirs,
                   bases: meshes.map(m => m.position.clone()), center, offset:0 });
    });

    buildLabels();
    bindUI();
    applyExplode(explode);
    loading.classList.add('hide');
    requestAnimationFrame(loop);
  },
  undefined,
  () => fail('تعذّر تحميل نموذج العين'));
}

/* ==================== التمدّد ==================== */
function applyExplode(t){
  parts.forEach(p => {
    const d = (p.ord - MIDORD) * SPREAD * t;
    p.offset = d;
    p.meshes.forEach((m, i) => m.position.copy(p.bases[i]).addScaledVector(p.dirs[i], d / scaleK));
  });
  const s = document.getElementById('explodeRange');
  if(s && Math.abs(s.valueAsNumber/100 - t) > 0.01) s.value = Math.round(t * 100);
}

/* ==================== الأسماء ==================== */
function buildLabels(){
  parts.forEach(p => {
    if(!p.label) return;
    const el = document.createElement('button');
    el.className = 'hot'; el.type = 'button';
    el.innerHTML = `<span class="hot__dot"></span><span class="hot__txt">${p.ar}</span>`;
    el.addEventListener('click', e => { e.stopPropagation(); select(p.key, false); });
    host.appendChild(el);
    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ln.setAttribute('class', 'leader');
    leaders.appendChild(ln);
    p.el = el; p.ln = ln;
  });
}

function hideLabel(p){
  p.el.classList.remove('show');
  p.el.style.opacity = 0;
  p.el.style.pointerEvents = 'none';
  p.ln.style.opacity = 0;
}

function updateLabels(){
  const w = host.clientWidth, h = host.clientHeight;
  if(!w || !h) return;
  leaders.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const cx = w/2, cy = h/2;

  /* منطقة آمنة: لا تغطّي أزرار التحكم ولا أزرار التكبير */
  const hostBox = host.getBoundingClientRect();
  let safeL = 20, safeR = w - 20;
  ['.stage__hud', '.stage__zoom'].forEach(sel => {
    const el = host.querySelector(sel);
    if(!el) return;
    const r = el.getBoundingClientRect();
    const l = r.left - hostBox.left, rt = r.right - hostBox.left;
    if(l > w/2) safeR = Math.min(safeR, l - 14);
    else        safeL = Math.max(safeL, rt + 14);
  });

  const rx = Math.min(w*0.30, (safeR - safeL)/2 - 30), ry = Math.min(h*0.34, h/2 - 52);
  const live = [];

  parts.forEach(p => {
    if(!p.el) return;
    if(!labelsOn || !p.meshes[0].visible){ hideLabel(p); return; }
    tmp.copy(p.center).applyMatrix4(root.matrixWorld).addScaledVector(AXIS, p.offset);
    const dist = tmp2.copy(tmp).sub(camera.position).length();
    tmp.project(camera);
    if(tmp.z > 1){ hideLabel(p); return; }
    const ax = (tmp.x*0.5 + 0.5) * w, ay = (-tmp.y*0.5 + 0.5) * h;
    const ang = Math.atan2(ay - cy, (ax - cx) || 0.001);
    live.push({ p, ax, ay, dist, lx: cx + Math.cos(ang)*rx, ly: cy + Math.sin(ang)*ry });
  });

  ['R','L'].forEach(side => {
    const col = live.filter(o => (side === 'R') === (o.lx >= cx)).sort((a,b) => a.ly - b.ly);
    const gap = 38;
    for(let i = 1; i < col.length; i++)
      if(col[i].ly - col[i-1].ly < gap) col[i].ly = col[i-1].ly + gap;
    const over = col.length ? col[col.length-1].ly - (h - 44) : 0;
    if(over > 0) col.forEach(o => { o.ly -= over; });
    col.forEach(o => { o.ly = Math.min(Math.max(o.ly, 44), h - 44); });
  });

  live.forEach(o => {
    const { p, ax, ay, dist } = o;
    const halfW = (p.el.offsetWidth || 120) / 2 + 6;
    const lx = Math.min(Math.max(o.lx, safeL + halfW), safeR - halfW);
    p.el.classList.toggle('flip', lx < cx);
    p.el.style.left = lx + 'px';
    p.el.style.top  = o.ly + 'px';
    p.el.style.zIndex = String(1000 - Math.round(dist*100));
    p.el.classList.add('show');
    p.el.classList.toggle('active', activeId === p.key);
    p.el.style.opacity = 1;
    p.el.style.pointerEvents = 'auto';
    p.ln.setAttribute('x1', ax); p.ln.setAttribute('y1', ay);
    p.ln.setAttribute('x2', lx); p.ln.setAttribute('y2', o.ly);
    p.ln.style.opacity = 0.55;
    p.ln.classList.toggle('on', activeId === p.key);
  });
}

/* ==================== الاختيار ==================== */
function select(key, fromCanvas){
  const p = parts.find(v => v.key === key);
  if(!p) return;
  activeId = key;
  infoBox.querySelector('b').textContent  = p.en;
  infoBox.querySelector('h4').textContent = p.ar;
  infoBox.querySelector('p').textContent  = p.desc;
  infoBox.classList.add('show');
  highlight();
  if(!fromCanvas) host.scrollIntoView({ behavior:'smooth', block:'center' });
}

function clearSelection(){ activeId = null; infoBox.classList.remove('show'); highlight(); }

function highlight(){
  parts.forEach(p => {
    const on = activeId === p.key;
    p.mats.forEach(m => {
      m.emissive = new THREE.Color(on ? 0x2f9bff : 0x000000);
      m.emissiveIntensity = on ? 0.28 : 0;
    });
    applyOpacity(p);
  });
}

function applyOpacity(p){
  const fade = (mode === 'xray' && p.shell) || (activeId && activeId !== p.key && mode === 'xray');
  p.meshes.forEach(m => {
    const mat = m.material;
    if(fade){ mat.transparent = true; mat.opacity = 0.16; mat.depthWrite = false; }
    else{ mat.transparent = m.userData.baseTransparent; mat.opacity = m.userData.baseOpacity; mat.depthWrite = true; }
  });
}

/* ==================== الأوضاع ==================== */
function setExplode(v){
  explodeTo = Math.min(Math.max(v, 0), 1);
  const b = document.getElementById('btnExplode');
  b.setAttribute('aria-pressed', String(explodeTo > 0.25));
  b.querySelector('span').textContent = explodeTo > 0.25 ? 'تجميع العين' : 'عرض متمدّد';
  rotTo = explodeTo > 0.25 ? VIEW_EXPLODED : VIEW_ASSEMBLED;
  flyTo(...(explodeTo > 0.25 ? HOME : TIGHT));
}

function syncSpinBtn(){
  const b = document.getElementById('btnCut');
  if(b) b.setAttribute('aria-pressed', String(spin));
}

function bindUI(){
  document.getElementById('btnExplode').addEventListener('click',
    () => setExplode(explodeTo > 0.25 ? 0 : 1));

  const rng = document.getElementById('explodeRange');
  rng.addEventListener('input', () => {
    explode = explodeTo = rng.valueAsNumber / 100;
    applyExplode(explode);
    const b = document.getElementById('btnExplode');
    b.setAttribute('aria-pressed', String(explode > 0.25));
    b.querySelector('span').textContent = explode > 0.25 ? 'تجميع العين' : 'عرض متمدّد';
  });

  const bx = document.getElementById('btnXray');
  bx.addEventListener('click', () => {
    mode = mode === 'xray' ? 'solid' : 'xray';
    bx.setAttribute('aria-pressed', String(mode === 'xray'));
    highlight();
  });

  const bs = document.getElementById('btnCut');
  bs.querySelector('span').textContent = 'دوران تلقائي';
  bs.addEventListener('click', () => { spin = !spin; syncSpinBtn(); });

  const bl = document.getElementById('btnLabels');
  bl.addEventListener('click', () => {
    labelsOn = !labelsOn;
    bl.setAttribute('aria-pressed', String(labelsOn));
  });

  document.getElementById('btnReset').addEventListener('click', () => {
    clearSelection(); mode = 'solid';
    document.getElementById('btnXray').setAttribute('aria-pressed', 'false');
    highlight(); setExplode(0); spin = false; syncSpinBtn();
  });

  document.getElementById('zoomIn') .addEventListener('click', () => zoom(0.8));
  document.getElementById('zoomOut').addEventListener('click', () => zoom(1.25));
  infoBox.querySelector('button').addEventListener('click', clearSelection);

  document.querySelectorAll('[data-part]').forEach(b => {
    const key = CHIP2KEY[b.dataset.part];
    const p = key && parts.find(v => v.key === key);
    if(!p){ b.remove(); return; }
    b.textContent = p.ar;
    b.addEventListener('click', () => select(key, false));
  });
  /* إزالة التكرار في شريط الأجزاء */
  const seen = new Set();
  document.querySelectorAll('[data-part]').forEach(b => {
    if(seen.has(b.textContent)) b.remove(); else seen.add(b.textContent);
  });

  let down = null;
  canvas.addEventListener('pointerdown', e => { down = { x:e.clientX, y:e.clientY }; });
  canvas.addEventListener('pointerup', e => {
    if(!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left)/r.width)*2 - 1, -((e.clientY - r.top)/r.height)*2 + 1);
    ray.setFromCamera(ptr, camera);
    const all = [];
    parts.forEach(p => p.meshes.forEach(m => { if(m.visible) all.push(m); }));
    const hit = ray.intersectObjects(all, false)[0];
    if(hit){
      const p = parts.find(v => v.meshes.includes(hit.object));
      if(p) return select(p.key, true);
    }
    clearSelection();
  });
}

function zoom(k){
  const d = camera.position.length() * k;
  camera.position.setLength(Math.min(Math.max(d, controls.minDistance), controls.maxDistance));
}
function flyTo(x, y, z){ fly = { from: camera.position.clone(), to: new THREE.Vector3(x, y, z), t: 0 }; }

/* ==================== الحلقة ==================== */
function resize(){
  const w = host.clientWidth, h = host.clientHeight;
  if(!w || !h) return;
  renderer.setSize(w, h, false);
  const a = w / h;
  camera.aspect = a;
  camera.fov = Math.min(34 / Math.min(1, a), 58);
  camera.updateProjectionMatrix();
}

function loop(){
  requestAnimationFrame(loop);
  if(Math.abs(explode - explodeTo) > 0.001){
    explode += (explodeTo - explode) * 0.08;
    applyExplode(explode);
  }
  if(fly){
    fly.t = Math.min(fly.t + 0.028, 1);
    camera.position.lerpVectors(fly.from, fly.to, 1 - Math.pow(1 - fly.t, 3));
    if(fly.t === 1) fly = null;
  }
  if(spin && !fly) root.rotation.y += 0.0025;
  else if(!spin && Math.abs(root.rotation.y - rotTo) > 0.002)
    root.rotation.y += (rotTo - root.rotation.y) * 0.07;

  controls.update();
  root.updateMatrixWorld();
  updateLabels();
  renderer.render(scene, camera);
}
