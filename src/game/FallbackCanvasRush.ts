import type { TossBridge } from '../lib/tossBridge';

const W = 390;
const H = 844;
const ROUND = 60;
const SAVE = 'salary-defense-save-v1';

type ThingKind = 'shard' | 'hole' | 'pulse' | 'coin' | 'boost' | 'fx' | 'text';

type Thing = {
  kind: ThingKind;
  x: number;
  y: number;
  r: number;
  speed?: number;
  value?: number;
  vx?: number;
  vy?: number;
  life?: number;
  color?: string;
  label?: string;
  rotation?: number;
  near?: boolean;
  dead?: boolean;
};

function readBest() {
  try {
    const raw = localStorage.getItem(SAVE);
    if (raw == null) {
      return 0;
    }

    const parsed = JSON.parse(raw) as { best?: unknown };
    return typeof parsed.best === 'number' ? parsed.best : Number(raw) || 0;
  } catch {
    return 0;
  }
}

function writeBest(best: number) {
  try {
    const raw = localStorage.getItem(SAVE);
    const parsed = raw != null && raw.startsWith('{') ? JSON.parse(raw) as Record<string, unknown> : {};
    localStorage.setItem(SAVE, JSON.stringify({ ...parsed, best }));
  } catch {
    // Local file previews can block storage; gameplay should continue.
  }
}

export function createFallbackCometRush(parent: HTMLElement, bridge: TossBridge) {
  parent.innerHTML = '';

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.touchAction = 'none';
  parent.append(canvas);

  const ctx = canvas.getContext('2d');
  if (ctx == null) {
    throw new Error('Canvas 2D is not available.');
  }

  const stars = Array.from({ length: 150 }, (_, i) => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: 0.7 + Math.random() * 2.8,
    v: 0.02 + Math.random() * 0.08,
    a: 0.18 + Math.random() * 0.72,
    c: i % 11 === 0 ? '#ffc857' : i % 7 === 0 ? '#00c2ff' : '#ffffff',
  }));
  const nebulae = Array.from({ length: 7 }, (_, i) => ({
    x: Math.random() * W,
    y: Math.random() * H,
    w: 110 + Math.random() * 220,
    h: 60 + Math.random() * 150,
    v: 0.004 + Math.random() * 0.014,
    c: i % 2 ? 'rgba(255,200,87,.08)' : 'rgba(0,194,255,.09)',
  }));

  let raf = 0;
  let last = performance.now();
  let mode: 'menu' | 'tutorial' | 'play' | 'pause' | 'over' = 'menu';
  let muted = false;
  let best = readBest();
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let hp = 3;
  let time = ROUND;
  let spawn = 0;
  let fever = 0;
  let overdrive = 0;
  let near = 0;
  let things: Thing[] = [];
  const player = { x: W / 2, tx: W / 2, y: 710 };

  const vibrate = (pattern: VibratePattern) => {
    bridge.haptic(Array.isArray(pattern) ? 'softMedium' : 'tickWeak');
    navigator.vibrate?.(pattern);
  };

  function start() {
    mode = 'play';
    things = [];
    score = 0;
    combo = 0;
    maxCombo = 0;
    hp = 3;
    time = ROUND;
    spawn = 0;
    fever = 0;
    overdrive = 0;
    near = 0;
    player.x = W / 2;
    player.tx = W / 2;
    burst(W / 2, 640, '#00c2ff', 24);
    vibrate([12, 24, 18]);
  }

  function finish() {
    mode = 'over';
    best = Math.max(best, score);
    writeBest(best);
    burst(player.x, player.y, '#ffc857', 32);
    vibrate([10, 18, 10, 18, 28]);
  }

  function add(kind: Exclude<ThingKind, 'fx' | 'text'>) {
    things.push({
      kind,
      x: 34 + Math.random() * (W - 68),
      y: -54,
      r: kind === 'hole' ? 31 : kind === 'pulse' ? 27 : kind === 'boost' ? 25 : 22,
      rotation: Math.random() * 7,
      speed: (kind === 'hole' ? 214 : kind === 'pulse' ? 152 : kind === 'boost' ? 142 : 178) * (1 + (ROUND - time) / 25),
      value: kind === 'coin' ? 230 : kind === 'pulse' ? 95 : kind === 'boost' ? 70 : 58,
    });
  }

  function burst(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i += 1) {
      things.push({
        kind: 'fx',
        x,
        y,
        r: 1.8 + Math.random() * 4.8,
        vx: (Math.random() - 0.5) * 180,
        vy: (Math.random() - 0.75) * 150,
        life: 0.38 + Math.random() * 0.36,
        color,
      });
    }
  }

  function pop(label: string, x: number, y: number, color = '#f8fbff') {
    things.push({ kind: 'text', label, x, y, r: 0, life: 0.85, color });
  }

  function collect(t: Thing) {
    combo += 1;
    maxCombo = Math.max(maxCombo, combo);
    score += Math.round((t.value ?? 0) * (1 + Math.min(combo, 44) * 0.05) * (fever > 0 ? 2.15 : 1));

    if (t.kind === 'pulse') {
      fever = 6.4;
      overdrive = 0;
      pop('월급각성', t.x, t.y, '#ffc857');
      burst(t.x, t.y, '#ffc857', 28);
      vibrate([8, 16, 8, 16, 24]);
      return;
    }

    if (t.kind === 'boost') {
      time = Math.min(ROUND, time + 1.8);
      overdrive = Math.min(100, overdrive + 10);
      pop('+1.8초', t.x, t.y, '#66ffc2');
      burst(t.x, t.y, '#66ffc2', 18);
    } else {
      burst(t.x, t.y, t.kind === 'coin' ? '#ffc857' : '#00c2ff', 14);
      pop(`+${t.value}`, t.x, t.y);
    }

    if (combo % 10 === 0) {
      time = Math.min(ROUND, time + 1.1);
      pop('콤보 +1.1초', player.x, player.y - 78, '#ffc857');
    }
  }

  function hit() {
    if (fever > 0) {
      score += 160;
      pop('파산 방어', player.x, player.y - 86, '#ffc857');
      vibrate(18);
      return;
    }
    hp -= 1;
    combo = 0;
    vibrate([28, 22, 28]);
    if (hp <= 0) finish();
  }

  function drawBackground(dt: number) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#040916');
    grad.addColorStop(0.52, '#123f5a');
    grad.addColorStop(1, '#03070f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    for (const n of nebulae) {
      n.y += n.v * dt * (mode === 'play' ? 2.4 : 0.6);
      if (n.y > H + 120) {
        n.y = -120;
        n.x = Math.random() * W;
      }
      ctx.fillStyle = n.c;
      ctx.beginPath();
      ctx.ellipse(n.x, n.y, n.w / 2, n.h / 2, 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const s of stars) {
      s.y += s.v * dt * (mode === 'play' ? 3 : 0.7);
      if (s.y > H + 5) {
        s.y = -5;
        s.x = Math.random() * W;
      }
      ctx.globalAlpha = s.a;
      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (mode === 'play') {
      ctx.strokeStyle = fever > 0 ? 'rgba(255,200,87,.22)' : 'rgba(157,239,255,.13)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 18; i += 1) {
        const x = ((i * 43 + performance.now() * 0.12) % (W + 120)) - 60;
        const y = (i * 71 + performance.now() * 0.46) % (H + 160);
        ctx.beginPath();
        ctx.moveTo(x, y - 80);
        ctx.lineTo(x - 14, y + 40);
        ctx.stroke();
      }
    }
  }

  function drawShip(scale = 1) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.scale(scale, scale);
    ctx.rotate(Math.max(-0.28, Math.min(0.28, (player.tx - player.x) * 0.005)));
    ctx.shadowBlur = fever > 0 ? 38 : 24;
    ctx.shadowColor = fever > 0 ? '#ffc857' : '#00c2ff';
    ctx.fillStyle = fever > 0 ? 'rgba(255,200,87,.24)' : 'rgba(0,194,255,.17)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 72, 44, 0, 0, Math.PI * 2);
    ctx.fill();

    const leftWing = ctx.createLinearGradient(-68, -10, -12, 42);
    leftWing.addColorStop(0, '#74f1ff');
    leftWing.addColorStop(0.58, '#0b8eb1');
    leftWing.addColorStop(1, '#073048');
    ctx.fillStyle = leftWing;
    ctx.beginPath();
    ctx.moveTo(-18, -8);
    ctx.bezierCurveTo(-56, -26, -78, -4, -70, 30);
    ctx.bezierCurveTo(-48, 28, -35, 48, -10, 44);
    ctx.closePath();
    ctx.fill();

    const rightWing = ctx.createLinearGradient(68, -10, 12, 42);
    rightWing.addColorStop(0, '#ffe083');
    rightWing.addColorStop(0.58, '#13a8c9');
    rightWing.addColorStop(1, '#073048');
    ctx.fillStyle = rightWing;
    ctx.beginPath();
    ctx.moveTo(18, -8);
    ctx.bezierCurveTo(56, -26, 78, -4, 70, 30);
    ctx.bezierCurveTo(48, 28, 35, 48, 10, 44);
    ctx.closePath();
    ctx.fill();

    const flame = ctx.createLinearGradient(0, 34, 0, 88);
    flame.addColorStop(0, '#fff3b0');
    flame.addColorStop(0.38, '#ffc857');
    flame.addColorStop(1, 'rgba(255,79,100,.12)');
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(0, 38);
    ctx.bezierCurveTo(-20, 54, -15, 78, 0, 96);
    ctx.bezierCurveTo(15, 78, 20, 54, 0, 38);
    ctx.fill();

    const body = ctx.createLinearGradient(0, -48, 0, 48);
    body.addColorStop(0, '#ffffff');
    body.addColorStop(0.48, '#f7f0d8');
    body.addColorStop(1, '#45cfff');
    ctx.fillStyle = body;
    round(-32, -55, 64, 108, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.78)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.shadowBlur = 0;
    const glass = ctx.createLinearGradient(-18, -42, 18, -10);
    glass.addColorStop(0, '#ffffff');
    glass.addColorStop(1, '#8df2ff');
    ctx.fillStyle = glass;
    round(-21, -42, 42, 34, 15);
    ctx.fill();
    ctx.strokeStyle = 'rgba(7,19,31,.35)';
    ctx.stroke();

    ctx.fillStyle = '#07131f';
    round(-18, 0, 36, 28, 14);
    ctx.fill();
    ctx.strokeStyle = '#ffc857';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#ffc857';
    ctx.font = '900 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('₩', 0, 14);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  function drawThing(t: Thing) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.rotation ?? 0);
    ctx.shadowBlur = 18;

    if (t.kind === 'hole') {
      ctx.shadowColor = '#8c72ff';
      for (let i = 0; i < 4; i += 1) {
        ctx.save();
        ctx.rotate(i * Math.PI * 0.5 + 0.28);
        const card = ctx.createLinearGradient(-12, -48, 30, -24);
        card.addColorStop(0, '#ff7a8b');
        card.addColorStop(1, '#4b1023');
        ctx.fillStyle = card;
        round(-19, -50, 38, 24, 5);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        round(-14, -43, 14, 3, 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#010408';
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(140,114,255,.75)';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,79,100,.62)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 20, -0.8, 4.8);
      ctx.stroke();
      ctx.fillStyle = '#f8fbff';
      ctx.font = '900 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CARD', 0, 4);
    } else if (t.kind === 'pulse') {
      ctx.shadowColor = '#ffc857';
      const seal = ctx.createRadialGradient(0, 0, 6, 0, 0, 36);
      seal.addColorStop(0, '#fff8c8');
      seal.addColorStop(0.48, '#ffc857');
      seal.addColorStop(1, '#9d5416');
      ctx.fillStyle = seal;
      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, 23, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#281804';
      ctx.font = '900 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAY', 0, -3);
      ctx.fillText('DAY', 0, 10);
    } else if (t.kind === 'boost') {
      ctx.shadowColor = '#66ffc2';
      const coupon = ctx.createLinearGradient(-30, -28, 30, 28);
      coupon.addColorStop(0, '#f1fff9');
      coupon.addColorStop(0.52, '#66ffc2');
      coupon.addColorStop(1, '#057c6d');
      ctx.rotate(0.12);
      ctx.fillStyle = coupon;
      round(-31, -23, 62, 46, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.82)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#04382d';
      ctx.font = '900 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+TIME', 0, 4);
    } else if (t.kind === 'coin') {
      ctx.shadowColor = '#ffc857';
      const coin = ctx.createRadialGradient(-10, -13, 5, 0, 0, 30);
      coin.addColorStop(0, '#fff8b8');
      coin.addColorStop(0.48, '#ffc857');
      coin.addColorStop(1, '#8b4016');
      ctx.fillStyle = coin;
      ctx.beginPath();
      ctx.arc(0, 0, 23, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff0a3';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#5d2c07';
      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('₩', 0, 1);
      ctx.textBaseline = 'alphabetic';
    } else {
      ctx.shadowColor = '#66ffc2';
      const bill = ctx.createLinearGradient(-34, -21, 34, 21);
      bill.addColorStop(0, '#e8fff6');
      bill.addColorStop(0.45, '#66ffc2');
      bill.addColorStop(1, '#12a876');
      ctx.rotate(-0.16);
      ctx.fillStyle = bill;
      round(-34, -20, 68, 40, 9);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.stroke();
      ctx.strokeStyle = 'rgba(7,19,31,.24)';
      round(-24, -12, 48, 24, 8);
      ctx.stroke();
      ctx.fillStyle = '#07301f';
      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('₩', 0, 1);
      ctx.textBaseline = 'alphabetic';
    }

    ctx.restore();
  }

  function hud() {
    ctx.fillStyle = 'rgba(2,7,13,.42)';
    ctx.fillRect(0, 0, W, 142);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(6,19,31,.78)';
    round(14, 12, 152, 58, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,194,255,.26)';
    ctx.stroke();
    ctx.fillStyle = '#66ffc2';
    ctx.font = '900 11px sans-serif';
    ctx.fillText('현재 잔고', 24, 29);
    ctx.fillStyle = '#f8fbff';
    ctx.font = '900 25px sans-serif';
    ctx.fillText(score.toLocaleString('ko-KR'), 24, 56);
    ctx.fillStyle = '#a9dced';
    ctx.font = '900 13px sans-serif';
    ctx.fillText(`콤보 ${combo} · ${'◆'.repeat(hp)}${'◇'.repeat(3 - hp)}`, 22, 83);

    ctx.fillStyle = 'rgba(6,19,31,.78)';
    round(W - 107, 12, 96, 58, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,87,.32)';
    ctx.stroke();
    ctx.fillStyle = '#ffc857';
    ctx.font = '900 11px sans-serif';
    ctx.fillText('잔고 증발', W - 99, 29);
    ctx.textAlign = 'right';
    ctx.fillStyle = time < 8 ? '#ff5f9f' : '#ffc857';
    ctx.font = '900 24px sans-serif';
    ctx.fillText(time.toFixed(1), W - 22, 56);
    ctx.textAlign = 'center';
    ctx.fillStyle = fever > 0 || overdrive > 70 ? '#ffc857' : '#78cfe7';
    ctx.font = '900 12px sans-serif';
    ctx.fillText(fever > 0 ? `월급각성 ${fever.toFixed(1)}s` : `월급각성 ${Math.floor(overdrive)}%`, W / 2, 112);
    ctx.fillStyle = 'rgba(22,54,71,.72)';
    round(89, 128, 212, 7, 4);
    ctx.fill();
    ctx.fillStyle = fever > 0 ? '#ffc857' : overdrive > 70 ? '#66ffc2' : '#00c2ff';
    round(89, 128, 212 * (fever > 0 ? 1 : overdrive / 100), 7, 4);
    ctx.fill();

    ctx.fillStyle = 'rgba(6,19,31,.78)';
    round(9, 84, 44, 44, 13);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,194,255,.28)';
    ctx.stroke();
    ctx.fillStyle = '#d9f7ff';
    ctx.font = '900 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(muted ? '무음' : '음', 31, 111);

    ctx.fillStyle = 'rgba(6,19,31,.78)';
    round(W - 53, 84, 44, 44, 13);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,194,255,.28)';
    ctx.stroke();
    ctx.fillStyle = '#d9f7ff';
    ctx.fillText('Ⅱ', W - 31, 111);

    if (hp <= 1 && mode === 'play') {
      ctx.fillStyle = `rgba(255,79,100,${0.06 + Math.sin(performance.now() * 0.012) * 0.025})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function round(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function menu() {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(6,19,31,.62)';
    round(24, 70, 342, 690, 30);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,194,255,.24)';
    ctx.stroke();
    ctx.fillStyle = '#86e8ff';
    ctx.font = '900 11px sans-serif';
    ctx.fillText('APPS IN TOSS · SURVIVE PAYDAY', W / 2, 24);
    const oldPlayer = { ...player };
    player.x = W / 2;
    player.tx = W / 2;
    player.y = 148;
    drawShip(0.72);
    player.x = oldPlayer.x;
    player.tx = oldPlayer.tx;
    player.y = oldPlayer.y;
    ctx.fillStyle = 'rgba(255,79,100,.72)';
    round(W / 2 - 134, 42, 268, 32, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,87,.34)';
    ctx.stroke();
    ctx.fillStyle = '#fff4d8';
    ctx.font = '900 14px sans-serif';
    ctx.fillText('월급이 지금 공격받고 있습니다', W / 2, 64);
    ctx.shadowBlur = 24;
    ctx.shadowColor = '#00c2ff';
    ctx.fillStyle = '#f8fbff';
    ctx.font = '900 48px sans-serif';
    ctx.fillText('월급', W / 2, 276);
    ctx.fillText('방어전', W / 2, 328);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#b8d9e7';
    ctx.font = '14px sans-serif';
    ctx.fillText('현금은 끌어당기고, 카드값은 스치세요', W / 2, 358);
    ctx.fillText('아슬아슬할수록 각성 게이지가 폭주합니다', W / 2, 380);
    ctx.fillStyle = '#ffc857';
    ctx.font = '900 16px sans-serif';
    ctx.fillText(`최고잔고 ${best.toLocaleString('ko-KR')}`, W / 2, 410);
    ctx.font = '900 12px sans-serif';
    ctx.fillText('아슬회피 연쇄 = 폭발 보상  |  콤보 10 = 시간 회복', W / 2, 535);
    button('월급 지키기', 604, '#00c2ff', '#041522', 278, 64);
    ctx.fillStyle = '#406a78';
    ctx.font = '900 10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('v7', W - 24, 816);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7eb5c9';
    ctx.font = '12px sans-serif';
    ctx.fillText('드래그 이동 · 가까울수록 더 큰 보상 · 60초 생존', W / 2, 780);
  }

  function tutorial() {
    ctx.fillStyle = 'rgba(2,7,13,.76)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(7,25,39,.96)';
    round(24, 88, 342, 676, 28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,194,255,.34)';
    ctx.stroke();

    const oldPlayer = { ...player };
    player.x = W / 2;
    player.tx = W / 2;
    player.y = 106;
    drawShip(0.38);
    player.x = oldPlayer.x;
    player.tx = oldPlayer.tx;
    player.y = oldPlayer.y;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffc857';
    ctx.font = '900 12px sans-serif';
    ctx.fillText('첫판은 10초면 이해됩니다', W / 2, 160);
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#00c2ff';
    ctx.fillStyle = '#f8fbff';
    ctx.font = '900 31px sans-serif';
    ctx.fillText('손가락 하나로', W / 2, 204);
    ctx.fillText('월급을 살리세요', W / 2, 240);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#bde6f4';
    ctx.font = '13px sans-serif';
    ctx.fillText('모으기, 스치기, 각성. 이 세 가지만 기억하세요.', W / 2, 268);
    lesson(323, '1', '현금은 끌어당기기', '현금봉투·코인·시간쿠폰은 자동 흡입');
    lesson(421, '2', '카드값은 스치기', '아슬아슬할수록 각성 게이지 폭주');
    lesson(519, '3', '각성 중엔 욕심내기', '파산 방어 + 잔고 보상 2.1배');
    ctx.fillStyle = 'rgba(255,79,100,.18)';
    round(43, 564, 304, 44, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,79,100,.32)';
    ctx.stroke();
    ctx.fillStyle = '#ffe0e5';
    ctx.font = '900 12px sans-serif';
    ctx.fillText('가까이 스칠수록 점수가 터집니다', W / 2, 591);
    button('바로 시작', 660, '#00c2ff', '#041522', 270, 62);
    button('메뉴', 732, '#ffc857', '#17130f', 190, 46);
  }

  function lesson(y: number, index: string, title: string, body: string) {
    ctx.fillStyle = 'rgba(9,35,54,.72)';
    round(43, y - 39, 304, 78, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,194,255,.26)';
    ctx.stroke();
    ctx.fillStyle = '#00c2ff';
    ctx.beginPath();
    ctx.arc(66, y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#041522';
    ctx.font = '900 17px sans-serif';
    ctx.fillText(index, 66, y + 6);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fbff';
    ctx.font = '900 15px sans-serif';
    ctx.fillText(title, 94, y - 13);
    ctx.fillStyle = '#b8d9e7';
    ctx.font = '11px sans-serif';
    ctx.fillText(body, 94, y + 15);
    ctx.textAlign = 'center';
  }

  function pause() {
    ctx.fillStyle = 'rgba(2,7,13,.54)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(7,25,39,.97)';
    round(32, 259, 326, 342, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,194,255,.34)';
    ctx.stroke();
    ctx.fillStyle = '#f8fbff';
    ctx.font = '900 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('일시정지', W / 2, 307);
    ctx.fillStyle = '#bde6f4';
    ctx.font = '900 13px sans-serif';
    ctx.fillText(`현재 잔고 ${score.toLocaleString('ko-KR')} · 남은 시간 ${time.toFixed(1)}초`, W / 2, 352);
    button('계속하기', 428, '#00c2ff', '#041522', 250, 58);
    button(muted ? '소리 켜기' : '소리 끄기', 500, '#ffc857', '#17130f', 220, 48);
    button('처음으로', 570, '#ff4f64', '#fff4f4', 220, 48);
  }

  function over() {
    ctx.fillStyle = 'rgba(2,7,13,.78)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(10,32,49,.95)';
    round(28, 160, 334, 478, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,194,255,.34)';
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = score >= best ? '#ffc857' : '#f8fbff';
    ctx.font = '900 28px sans-serif';
    ctx.fillText(score >= best ? '잔고 신기록' : '월급 방어 성공', W / 2, 226);
    ctx.fillStyle = '#f8fbff';
    ctx.font = '900 58px sans-serif';
    ctx.fillText(score.toLocaleString('ko-KR'), W / 2, 314);
    ctx.fillStyle = '#cdeffc';
    ctx.font = '14px sans-serif';
    ctx.fillText(`최대 콤보 ${maxCombo} · 아슬회피 ${near}`, W / 2, 368);
    ctx.fillStyle = '#ffc857';
    ctx.font = '900 34px sans-serif';
    ctx.fillText(score > 42000 ? 'RANK SSS' : score > 30000 ? 'RANK SS' : score > 21000 ? 'RANK S' : score > 14000 ? 'RANK A' : 'RANK B', W / 2, 432);
    button('다시 방어', 530, '#00c2ff', '#041522');
    button('메뉴', 604, '#ffc857', '#17130f', 216, 46);
  }

  function button(label: string, y: number, bg: string, fg: string, width = 258, height = 60) {
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    round(W / 2 - width / 2, y - height / 2 + 8, width, height, 16);
    ctx.fill();
    ctx.fillStyle = bg;
    round(W / 2 - width / 2, y - height / 2, width, height, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.font = `900 ${height > 50 ? 20 : 15}px sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, W / 2, y);
    ctx.textBaseline = 'alphabetic';
  }

  function step(now: number) {
    const dt = Math.min(42, now - last);
    last = now;
    drawBackground(dt);

    if (mode === 'play') {
      time = Math.max(0, time - dt / 1000);
      fever = Math.max(0, fever - dt / 1000);
      player.x += (player.tx - player.x) * (1 - Math.pow(0.002, dt / 1000));
      player.y = 710 + Math.sin(now * 0.007) * 5;
      spawn += dt;
      const interval = Math.max(235, 650 - (1 + (ROUND - time) / 25) * 120 - (fever > 0 ? 80 : 0));

      if (spawn > interval) {
        spawn = 0;
        const roll = Math.random();
        add(roll < 0.13 ? 'hole' : roll < 0.2 ? 'pulse' : roll < 0.27 ? 'boost' : roll > 0.91 ? 'coin' : 'shard');
      }

      for (const t of things) {
        if (t.kind === 'fx') {
          t.x += (t.vx ?? 0) * dt / 1000;
          t.y += (t.vy ?? 0) * dt / 1000;
          t.life = (t.life ?? 0) - dt / 1000;
          continue;
        }
        if (t.kind === 'text') {
          t.y -= 46 * dt / 1000;
          t.life = (t.life ?? 0) - dt / 1000;
          continue;
        }
        t.y += (t.speed ?? 0) * dt / 1000;
        t.x += Math.sin((t.y + t.x) * 0.02) * (t.kind === 'hole' ? 24 : 9) * dt / 1000;
        t.rotation = (t.rotation ?? 0) + dt / (t.kind === 'boost' ? 120 : 360);
        const gap = Math.hypot(player.x - t.x, player.y - t.y);
        const magnet = fever > 0 ? 126 : 82;
        if (t.kind !== 'hole' && gap < magnet) {
          t.x += (player.x - t.x) * 0.085;
          t.y += (player.y - t.y) * 0.085;
        }
        if (t.kind === 'hole' && gap < t.r + 24) {
          t.dead = true;
          hit();
        } else if (t.kind === 'hole' && !t.near && gap < t.r + 68 && gap > t.r + 30) {
          t.near = true;
          near += 1;
          overdrive = Math.min(100, overdrive + 13 + Math.min(18, combo));
          score += 100 + combo * 8;
          pop('스침 +충전', t.x, t.y, '#cfc4ff');
          burst(t.x, t.y, '#8c72ff', 10);
        } else if (t.kind !== 'hole' && gap < t.r + 28) {
          t.dead = true;
          collect(t);
        }
        if (t.y > H + 80) t.dead = true;
      }

      if (overdrive >= 100 && fever <= 0) {
        fever = 6.4;
        overdrive = 0;
        pop('월급각성', player.x, player.y - 90, '#ffc857');
        burst(player.x, player.y - 40, '#ffc857', 28);
      }

      things = things.filter((t) => !t.dead && (t.life == null || t.life > -0.08));
      for (const t of things) {
        if (t.kind === 'fx') {
          ctx.globalAlpha = Math.max(0, t.life ?? 0);
          ctx.fillStyle = t.color ?? '#fff';
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        } else if (t.kind === 'text') {
          ctx.globalAlpha = Math.max(0, t.life ?? 0);
          ctx.fillStyle = t.color ?? '#fff';
          ctx.textAlign = 'center';
          ctx.font = '900 16px sans-serif';
          ctx.fillText(t.label ?? '', t.x, t.y);
          ctx.globalAlpha = 1;
        } else {
          drawThing(t);
        }
      }
      drawShip();
      hud();
      if (time <= 0) finish();
    } else if (mode === 'menu') {
      menu();
    } else if (mode === 'tutorial') {
      tutorial();
    } else if (mode === 'pause') {
      drawShip();
      hud();
      pause();
    } else {
      drawShip();
      hud();
      over();
    }

    raf = requestAnimationFrame(step);
  }

  function pointer(e: PointerEvent | TouchEvent) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const p = 'touches' in e ? e.touches[0] : e;
    const x = (p.clientX - rect.left) * W / rect.width;
    const y = (p.clientY - rect.top) * H / rect.height;

    if (mode === 'menu' && y > 572 && y < 637) mode = 'tutorial';
    else if (mode === 'tutorial' && y > 629 && y < 691) start();
    else if (mode === 'tutorial' && y > 709 && y < 755) mode = 'menu';
    else if (mode === 'over' && y > 500 && y < 560) start();
    else if (mode === 'over' && y > 580 && y < 628) mode = 'menu';
    else if (mode === 'pause' && y > 399 && y < 457) mode = 'play';
    else if (mode === 'pause' && y > 476 && y < 524) muted = !muted;
    else if (mode === 'pause' && y > 546 && y < 594) mode = 'menu';
    else if (mode === 'play' && y > 82 && y < 130 && x < 60) muted = !muted;
    else if (mode === 'play' && y > 82 && y < 130 && x > W - 60) mode = 'pause';
    else if (mode === 'play' && y > 148) player.tx = Math.max(38, Math.min(W - 38, x));
  }

  canvas.addEventListener('pointerdown', pointer);
  canvas.addEventListener('pointermove', (event) => {
    if (mode === 'play') pointer(event);
  });
  canvas.addEventListener('touchstart', pointer, { passive: false });
  canvas.addEventListener('touchmove', pointer, { passive: false });
  raf = requestAnimationFrame(step);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      canvas.remove();
    },
  };
}
