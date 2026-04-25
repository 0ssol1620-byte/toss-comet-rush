import * as Phaser from 'phaser';
import type { TossBridge } from '../lib/tossBridge';

const GAME_WIDTH = 390;
const GAME_HEIGHT = 844;
const ROUND_SECONDS = 60;
const PLAYER_Y = 710;
const SAFE_TOP = 104;
const SAVE_KEY = 'salary-defense-save-v1';
const BUILD_VERSION = 'v10';
const SCORE_TIER_SIZE = 50000;
const MAX_ALERT_TIER = 9;
const MAX_ALERT_SPEED_MULTIPLIER = 2.25;

type Phase = 'menu' | 'tutorial' | 'onboarding' | 'playing' | 'upgrade' | 'paused' | 'gameover';
type ActorKind = 'shard' | 'hazard' | 'rent' | 'tax' | 'sub' | 'pulse' | 'coin' | 'boost';
type UpgradeId = 'magnet' | 'rebate' | 'overtime' | 'shield' | 'payday' | 'slow';
type MetaUpgradeKey = 'vault' | 'magnet' | 'luck';
type HazardKind = Extract<ActorKind, 'hazard' | 'rent' | 'tax' | 'sub'>;
type EvolutionId = 'autoRefund' | 'debtFreeze' | 'thirteenthPay';
type RuntimeUpgrades = Record<UpgradeId, number>;
type MenuLayout = {
  compact: boolean;
  glassY: number;
  glassHeight: number;
  eyebrowY: number;
  dangerY: number;
  heroY: number;
  heroScale: number;
  titleY: number;
  titleSize: number;
  subtitleY: number;
  bestY: number;
  missionY: number;
  ruleY: number;
  startY: number;
  secondaryY: number;
  footerY: number;
};

type Actor = {
  kind: ActorKind;
  image: Phaser.GameObjects.Sprite;
  radius: number;
  speed: number;
  value: number;
  wobble: number;
  nearMissed?: boolean;
};

type SaveState = {
  best: number;
  bestAlertTier: number;
  bestByStage: number[];
  credits: number;
  plays: number;
  selectedStage: number;
  unlockedStage: number;
  selectedSkin: number;
  tutorialDone: boolean;
  totalScore: number;
  dailyDate: string;
  daily: {
    shards: number;
    nearMiss: number;
    fever: number;
    maxCombo: number;
  };
  meta: Record<MetaUpgradeKey, number>;
};

type StageDefinition = {
  id: number;
  name: string;
  subtitle: string;
  targetScore: number;
  speedBonus: number;
  spawnBonus: number;
  hazardBonus: number;
  rewardBonus: number;
  hazardWeights: Record<HazardKind, number>;
};

type EvolutionDefinition = {
  id: EvolutionId;
  name: string;
  requires: [UpgradeId, UpgradeId];
  description: string;
};

const STAGES: StageDefinition[] = [
  {
    id: 1,
    name: '월급날 골목',
    subtitle: '수집과 가까이 회피를 익히는 첫 구간',
    targetScore: 50000,
    speedBonus: 0,
    spawnBonus: 0,
    hazardBonus: 0,
    rewardBonus: 0,
    hazardWeights: { hazard: 1, rent: 0.5, tax: 0.35, sub: 0.2 },
  },
  {
    id: 2,
    name: '카드값 터널',
    subtitle: '카드값이 빨라지고 5만원 경보가 더 자주 압박합니다',
    targetScore: 100000,
    speedBonus: 0.08,
    spawnBonus: 0.06,
    hazardBonus: 0.035,
    rewardBonus: 0.06,
    hazardWeights: { hazard: 1.45, rent: 0.55, tax: 0.55, sub: 0.25 },
  },
  {
    id: 3,
    name: '월세 고가도로',
    subtitle: '월세 운석의 흔들림이 커지고 보상 배율도 상승합니다',
    targetScore: 150000,
    speedBonus: 0.14,
    spawnBonus: 0.1,
    hazardBonus: 0.06,
    rewardBonus: 0.12,
    hazardWeights: { hazard: 0.9, rent: 1.55, tax: 0.65, sub: 0.35 },
  },
  {
    id: 4,
    name: '구독 지옥',
    subtitle: '작고 빠른 구독료가 몰려오며 콤보 유지가 핵심입니다',
    targetScore: 220000,
    speedBonus: 0.22,
    spawnBonus: 0.16,
    hazardBonus: 0.09,
    rewardBonus: 0.2,
    hazardWeights: { hazard: 0.8, rent: 0.8, tax: 0.75, sub: 1.65 },
  },
  {
    id: 5,
    name: '블랙카드 심연',
    subtitle: '모든 고정비가 폭주하는 최종 고득점 챌린지',
    targetScore: 300000,
    speedBonus: 0.32,
    spawnBonus: 0.24,
    hazardBonus: 0.13,
    rewardBonus: 0.32,
    hazardWeights: { hazard: 1.2, rent: 1.15, tax: 1.1, sub: 1.05 },
  },
];

const EVOLUTIONS: EvolutionDefinition[] = [
  {
    id: 'autoRefund',
    name: '자동환급장',
    requires: ['magnet', 'rebate'],
    description: '자석 범위와 보상 배율이 동시에 상승합니다',
  },
  {
    id: 'debtFreeze',
    name: '채무동결',
    requires: ['shield', 'slow'],
    description: '보험 발동 시 주변 고정비가 잠시 느려집니다',
  },
  {
    id: 'thirteenthPay',
    name: '13월의 월급',
    requires: ['payday', 'overtime'],
    description: '월급각성 지속시간과 시간 쿠폰 효율이 증가합니다',
  },
];

const DEFAULT_SAVE: SaveState = {
  best: 0,
  bestAlertTier: 0,
  bestByStage: STAGES.map(() => 0),
  credits: 0,
  plays: 0,
  selectedStage: 0,
  unlockedStage: 0,
  selectedSkin: 0,
  tutorialDone: false,
  totalScore: 0,
  dailyDate: '',
  daily: {
    shards: 0,
    nearMiss: 0,
    fever: 0,
    maxCombo: 0,
  },
  meta: {
    vault: 0,
    magnet: 0,
    luck: 0,
  },
};

const DEFAULT_RUNTIME_UPGRADES: RuntimeUpgrades = {
  magnet: 0,
  rebate: 0,
  overtime: 0,
  shield: 0,
  payday: 0,
  slow: 0,
};

const UPGRADE_CARDS: Array<{
  id: UpgradeId;
  title: string;
  subtitle: string;
  color: number;
}> = [
  { id: 'magnet', title: '월급자석', subtitle: '현금 흡입 범위가 크게 넓어집니다', color: 0x00c2ff },
  { id: 'rebate', title: '캐시백 폭발', subtitle: '가까이 회피와 현금 보상이 더 커집니다', color: 0x66ffc2 },
  { id: 'overtime', title: '야근수당', subtitle: '즉시 시간 +2.4초, 콤보 유지력 증가', color: 0xffc857 },
  { id: 'shield', title: '파산보험', subtitle: '다음 치명타를 1회 막아냅니다', color: 0x8c72ff },
  { id: 'payday', title: '상여금 각성', subtitle: '월급각성 지속시간과 배율이 증가합니다', color: 0xff5f9f },
  { id: 'slow', title: '가계부 제압', subtitle: '월세·세금·구독료 낙하 속도를 낮춥니다', color: 0x9defff },
];

const SKINS = [
  { name: '신입 금고', tint: 0xf8fbff, glow: 0x00c2ff, unlock: 0 },
  { name: '상여금 금고', tint: 0xfff0b6, glow: 0xffc857, unlock: 12000 },
  { name: '절약왕 금고', tint: 0xb8ffe6, glow: 0x66ffc2, unlock: 24000 },
  { name: '블랙카드 금고', tint: 0xd7d2ff, glow: 0x8c72ff, unlock: 42000 },
];

const PALETTE = {
  aqua: 0x00c2ff,
  aquaDark: 0x0a5878,
  cream: 0xf7f0d8,
  gold: 0xffc857,
  green: 0x66ffc2,
  ink: 0x07131f,
  pink: 0xff5f9f,
  red: 0xff4f64,
  sky: 0x9defff,
  violet: 0x8c72ff,
  white: 0xf8fbff,
};

export function createTossCometRush(parent: HTMLElement, bridge: TossBridge) {
  parent.dataset.cometReady = 'booting';

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    backgroundColor: '#07131f',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      pixelArt: false,
      powerPreference: 'high-performance',
    },
    scene: [new CometRushScene(bridge, parent)],
  });
}

class CometRushScene extends Phaser.Scene {
  private readonly bridge: TossBridge;
  private readonly parent: HTMLElement;
  private actors: Actor[] = [];
  private stars: Phaser.GameObjects.Ellipse[] = [];
  private speedLines: Phaser.GameObjects.Rectangle[] = [];
  private nebulae: Phaser.GameObjects.Image[] = [];
  private phase: Phase = 'menu';
  private save: SaveState = DEFAULT_SAVE;
  private player!: Phaser.GameObjects.Container;
  private playerGlow!: Phaser.GameObjects.Ellipse;
  private playerShip!: Phaser.GameObjects.Sprite;
  private playerFlame!: Phaser.GameObjects.Sprite;
  private magnetRing!: Phaser.GameObjects.Ellipse;
  private scoreCard!: Phaser.GameObjects.Rectangle;
  private timerCard!: Phaser.GameObjects.Rectangle;
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private missionText!: Phaser.GameObjects.Text;
  private overdriveBack!: Phaser.GameObjects.Rectangle;
  private overdriveFill!: Phaser.GameObjects.Rectangle;
  private statusText!: Phaser.GameObjects.Text;
  private dangerOverlay!: Phaser.GameObjects.Rectangle;
  private hudObjects: Phaser.GameObjects.GameObject[] = [];
  private titleLayer?: Phaser.GameObjects.Container;
  private tutorialLayer?: Phaser.GameObjects.Container;
  private onboardingContent?: Phaser.GameObjects.Container;
  private onboardingDemoShip?: Phaser.GameObjects.Container;
  private growthLayer?: Phaser.GameObjects.Container;
  private upgradeLayer?: Phaser.GameObjects.Container;
  private pauseLayer?: Phaser.GameObjects.Container;
  private gameOverLayer?: Phaser.GameObjects.Container;
  private muteHudLabel?: Phaser.GameObjects.Text;
  private audio?: AudioContext;
  private muted = false;
  private onboardingStep = 0;
  private onboardingReplay = false;
  private onboardingAdvancing = false;
  private onboardingDragStartX = 0;
  private upgrades: RuntimeUpgrades = { ...DEFAULT_RUNTIME_UPGRADES };
  private activeEvolutions = new Set<EvolutionId>();
  private upgradeThresholds = [45, 30, 15];
  private stormThresholds = [42, 24, 9];
  private resultCredits = 0;
  private resultStageIndex = 0;
  private resultStageCleared = false;
  private resultUnlockedStage = false;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private shards = 0;
  private nearMiss = 0;
  private feverCount = 0;
  private overdrive = 0;
  private nearChain = 0;
  private hp = 3;
  private timeLeft = ROUND_SECONDS;
  private targetX = GAME_WIDTH / 2;
  private spawnElapsed = 0;
  private difficulty = 1;
  private lastAnnouncedTier = 0;
  private bestAlertTierThisRun = 0;
  private feverMs = 0;
  private lastCollectMs = 0;
  private comboGraceMs = 1650;
  private arenaShake = 0;

  constructor(bridge: TossBridge, parent: HTMLElement) {
    super({ key: 'CometRushScene' });
    this.bridge = bridge;
    this.parent = parent;
  }

  create() {
    this.save = this.loadSave();
    this.buildTextures();
    this.buildAnimations();
    this.buildWorld();
    this.buildHud();
    this.showMenu();
    this.parent.dataset.cometReady = 'ready';
    this.applyDebugScreen();
    this.bridge.identify().then(() => this.bridge.log('identify', { status: 'ready' }, 'info'));
  }

  update(_time: number, delta: number) {
    this.updateStars(delta);

    if (this.phase !== 'playing') {
      return;
    }

    this.timeLeft = Math.max(0, this.timeLeft - delta / 1000);
    this.difficulty = this.effectiveDifficulty();
    this.spawnElapsed += delta;
    this.feverMs = Math.max(0, this.feverMs - delta);
    this.arenaShake = Math.max(0, this.arenaShake - delta);
    this.maybeTriggerExpenseStorm();

    if (this.maybeTriggerUpgradeChoice()) {
      this.updateHud();
      return;
    }

    this.updatePlayer(delta);
    this.spawnLoop(delta);
    this.updateActors(delta);
    this.maybeAnnounceAlertTier();
    this.updateCombo(delta);
    this.updateHud();

    if (this.timeLeft <= 0) {
      this.finishRound('timeout');
    }
  }

  private buildWorld() {
    this.cameras.main.setBackgroundColor('#07131f');

    const sky = this.add.graphics();
    sky.fillGradientStyle(0x040916, 0x07131f, 0x123f5a, 0x03070f, 1, 1, 1, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    sky.fillStyle(0x00c2ff, 0.09);
    sky.fillEllipse(62, 138, 360, 250);
    sky.fillStyle(0xffc857, 0.07);
    sky.fillEllipse(346, 662, 310, 390);
    sky.fillStyle(0x8c72ff, 0.06);
    sky.fillEllipse(306, 228, 210, 310);
    sky.lineStyle(1, 0xffffff, 0.04);

    for (let i = 0; i < 13; i += 1) {
      sky.beginPath();
      sky.moveTo(0, 104 + i * 58);
      sky.lineTo(GAME_WIDTH, 76 + i * 52);
      sky.strokePath();
    }

    for (let i = 0; i < 5; i += 1) {
      const nebula = this.add.image(
        Phaser.Math.Between(30, GAME_WIDTH - 30),
        Phaser.Math.Between(80, GAME_HEIGHT - 120),
        i % 2 === 0 ? 'nebula-a' : 'nebula-b',
      );
      nebula.setScale(Phaser.Math.FloatBetween(0.72, 1.28));
      nebula.setAlpha(Phaser.Math.FloatBetween(0.28, 0.52));
      nebula.setBlendMode(Phaser.BlendModes.ADD);
      nebula.setData('speed', Phaser.Math.FloatBetween(0.003, 0.01));
      this.nebulae.push(nebula);
    }

    for (let i = 0; i < 128; i += 1) {
      const star = this.add.ellipse(
        Phaser.Math.Between(6, GAME_WIDTH - 6),
        Phaser.Math.Between(0, GAME_HEIGHT),
        Phaser.Math.FloatBetween(0.8, 3.8),
        Phaser.Math.FloatBetween(0.8, 3.8),
        i % 11 === 0 ? PALETTE.gold : i % 7 === 0 ? PALETTE.aqua : PALETTE.white,
        Phaser.Math.FloatBetween(0.18, 0.84),
      );
      star.setData('speed', Phaser.Math.FloatBetween(0.015, 0.072));
      this.stars.push(star);
    }

    for (let i = 0; i < 18; i += 1) {
      const line = this.add.rectangle(
        Phaser.Math.Between(20, GAME_WIDTH - 20),
        Phaser.Math.Between(-GAME_HEIGHT, GAME_HEIGHT),
        Phaser.Math.FloatBetween(1.2, 2.6),
        Phaser.Math.Between(44, 120),
        PALETTE.sky,
        0.08,
      );
      line.setRotation(Phaser.Math.DegToRad(-8));
      line.setBlendMode(Phaser.BlendModes.ADD);
      line.setData('speed', Phaser.Math.FloatBetween(0.18, 0.42));
      this.speedLines.push(line);
    }

    this.playerGlow = this.add.ellipse(0, 0, 92, 42, PALETTE.aqua, 0.16);
    this.magnetRing = this.add.ellipse(0, 0, 106, 106, PALETTE.aqua, 0.03);
    this.magnetRing.setStrokeStyle(2, PALETTE.aqua, 0.28);
    this.playerShip = this.add.sprite(0, 0, 'ship').play('vault-idle');
    this.playerFlame = this.add.sprite(0, 42, 'flame').play('flame-loop').setAlpha(0.86);
    this.playerFlame.setBlendMode(Phaser.BlendModes.ADD);
    this.applyGlow(this.playerShip, PALETTE.aqua, 0.2);

    this.player = this.add.container(GAME_WIDTH / 2, PLAYER_Y, [
      this.playerGlow,
      this.magnetRing,
      this.playerFlame,
      this.playerShip,
    ]);
    this.player.setDepth(12);

    this.tweens.add({
      targets: this.playerFlame,
      scaleY: 1.28,
      scaleX: 0.82,
      alpha: 0.5,
      yoyo: true,
      repeat: -1,
      duration: 120,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: this.magnetRing,
      scale: 1.16,
      alpha: 0.58,
      yoyo: true,
      repeat: -1,
      duration: 980,
      ease: 'Sine.easeInOut',
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.unlockAudio();
      if (this.phase === 'onboarding') {
        this.handleOnboardingPointer('down', pointer);
        return;
      }
      if (this.phase === 'playing' && pointer.y > SAFE_TOP + 44) {
        this.bridge.haptic('tap');
        this.targetX = Phaser.Math.Clamp(pointer.x, 38, GAME_WIDTH - 38);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.phase === 'onboarding') {
        this.handleOnboardingPointer('move', pointer);
        return;
      }
      if (this.phase === 'playing' && pointer.isDown && pointer.y > SAFE_TOP + 44) {
        this.targetX = Phaser.Math.Clamp(pointer.x, 38, GAME_WIDTH - 38);
      }
    });
  }

  private buildHud() {
    const topScrim = this.add.rectangle(GAME_WIDTH / 2, 70, GAME_WIDTH, 140, 0x02070d, 0.42);
    topScrim.setDepth(18);
    this.hudObjects.push(topScrim);

    this.dangerOverlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, PALETTE.red, 0);
    this.dangerOverlay.setBlendMode(Phaser.BlendModes.ADD);
    this.dangerOverlay.setDepth(18);
    this.hudObjects.push(this.dangerOverlay);

    this.scoreCard = this.add.rectangle(86, 41, 152, 58, 0x06131f, 0.78);
    this.scoreCard.setStrokeStyle(1, PALETTE.aqua, 0.26);
    this.scoreCard.setDepth(19);
    this.hudObjects.push(this.scoreCard);
    this.timerCard = this.add.rectangle(GAME_WIDTH - 58, 41, 98, 58, 0x06131f, 0.78);
    this.timerCard.setStrokeStyle(1, PALETTE.gold, 0.32);
    this.timerCard.setDepth(19);
    this.hudObjects.push(this.timerCard);

    const scoreLabel = this.add.text(22, 13, '현재 잔고', {
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '11px',
      fontStyle: '900',
      color: '#66ffc2',
    });
    scoreLabel.setDepth(20);
    this.hudObjects.push(scoreLabel);

    this.scoreText = this.add.text(22, 26, '0', {
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '25px',
      fontStyle: '900',
      color: '#f8fbff',
      shadow: { color: '#001622', blur: 12, fill: true },
    });
    this.scoreText.setDepth(20);
    this.hudObjects.push(this.scoreText);

    const timerLabel = this.add.text(GAME_WIDTH - 98, 13, '잔고 증발', {
      align: 'right',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '11px',
      fontStyle: '900',
      color: '#ffc857',
    });
    timerLabel.setDepth(20);
    this.hudObjects.push(timerLabel);

    this.timerText = this.add.text(GAME_WIDTH - 22, 27, '60.0', {
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '24px',
      fontStyle: '900',
      color: '#ffc857',
      shadow: { color: '#001622', blur: 10, fill: true },
    });
    this.timerText.setOrigin(1, 0);
    this.timerText.setDepth(20);
    this.hudObjects.push(this.timerText);

    this.comboText = this.add.text(22, 58, '콤보 0', {
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '13px',
      fontStyle: '800',
      color: '#a9dced',
    });
    this.comboText.setDepth(20);
    this.hudObjects.push(this.comboText);

    this.missionText = this.add.text(GAME_WIDTH / 2, 80, '', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '12px',
      fontStyle: '900',
      color: '#d9f7ff',
      backgroundColor: 'rgba(6, 19, 31, 0.62)',
      padding: { left: 10, right: 10, top: 4, bottom: 4 },
    });
    this.missionText.setOrigin(0.5, 0);
    this.missionText.setDepth(20);
    this.hudObjects.push(this.missionText);

    this.statusText = this.add.text(GAME_WIDTH / 2, 110, '가까이 피하면 각성 · 모으면 잔고 상승', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '12px',
      fontStyle: '900',
      color: '#78cfe7',
    });
    this.statusText.setOrigin(0.5, 0);
    this.statusText.setDepth(20);
    this.hudObjects.push(this.statusText);

    this.overdriveBack = this.add.rectangle(GAME_WIDTH / 2, 134, 212, 7, 0x163647, 0.82);
    this.overdriveBack.setDepth(20);
    this.hudObjects.push(this.overdriveBack);
    this.overdriveFill = this.add.rectangle(GAME_WIDTH / 2 - 106, 134, 0, 7, PALETTE.gold, 0.96);
    this.overdriveFill.setOrigin(0, 0.5);
    this.overdriveFill.setDepth(21);
    this.hudObjects.push(this.overdriveFill);

    const soundButton = this.createHudButton(31, 106, 44, 44, '음', () => {
      this.toggleMute();
    });
    this.muteHudLabel = soundButton.label;
    this.hudObjects.push(soundButton.group);

    const pauseButton = this.createHudButton(GAME_WIDTH - 31, 106, 44, 44, 'Ⅱ', () => {
      this.showPause();
    });
    this.hudObjects.push(pauseButton.group);

    this.setGameplayVisible(false);
  }

  private showMenu() {
    this.phase = 'menu';
    this.clearActors();
    this.titleLayer?.destroy();
    this.titleLayer = undefined;
    this.tutorialLayer?.destroy();
    this.tutorialLayer = undefined;
    this.onboardingContent = undefined;
    this.onboardingDemoShip = undefined;
    this.growthLayer?.destroy();
    this.growthLayer = undefined;
    this.upgradeLayer?.destroy();
    this.upgradeLayer = undefined;
    this.pauseLayer?.destroy();
    this.pauseLayer = undefined;
    this.gameOverLayer?.destroy();
    this.gameOverLayer = undefined;
    this.setGameplayVisible(false);

    const layout = this.menuLayout();
    const stage = this.currentStage();
    const panel = this.add.container(0, 0);
    const glass = this.add.rectangle(GAME_WIDTH / 2, layout.glassY, 342, layout.glassHeight, 0x06131f, 0.64);
    glass.setStrokeStyle(1, PALETTE.aqua, 0.28);
    const orb = this.add.image(GAME_WIDTH / 2, layout.heroY, 'hero-orb').setScale(layout.heroScale).setAlpha(0.72);
    orb.setBlendMode(Phaser.BlendModes.ADD);
    const heroShip = this.add.sprite(GAME_WIDTH / 2, layout.heroY, 'ship').setScale(layout.heroScale + 0.1).play('vault-idle');
    heroShip.setTint(this.currentSkin().tint);
    this.applyGlow(heroShip, PALETTE.aqua, 0.28);
    const dangerTag = this.add.rectangle(GAME_WIDTH / 2, layout.dangerY, 268, 32, PALETTE.red, 0.72);
    dangerTag.setStrokeStyle(1, PALETTE.gold, 0.34);
    const dangerCopy = this.add.text(GAME_WIDTH / 2, layout.dangerY, '월급이 지금 공격받고 있습니다', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '14px',
      fontStyle: '900',
      color: '#fff4d8',
    });
    dangerCopy.setOrigin(0.5);
    const eyebrow = this.add.text(GAME_WIDTH / 2, layout.eyebrowY, 'APPS IN TOSS · SURVIVE PAYDAY', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '11px',
      fontStyle: '900',
      color: '#86e8ff',
    });
    eyebrow.setOrigin(0.5);
    const title = this.add.text(GAME_WIDTH / 2, layout.titleY, '월급\n방어전', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: `${layout.titleSize}px`,
      fontStyle: '900',
      lineSpacing: -10,
      color: '#f8fbff',
      shadow: { color: '#00c2ff', blur: 22, fill: true },
    });
    title.setOrigin(0.5);

    const subtitle = this.add.text(GAME_WIDTH / 2, layout.subtitleY, '현금은 먹고, 고지서는 피하세요\n가까이 스쳐 피하면 각성 게이지가 더 빨리 찹니다', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '13px',
      lineSpacing: 4,
      color: '#b8d9e7',
      wordWrap: { width: 308, useAdvancedWrap: true },
    });
    subtitle.setOrigin(0.5);

    const bestPanel = this.add.rectangle(GAME_WIDTH / 2, layout.bestY, 258, 42, 0x0b2536, 0.84);
    bestPanel.setStrokeStyle(1, PALETTE.gold, 0.25);
    const best = this.add.text(GAME_WIDTH / 2, layout.bestY, `최고잔고 ${this.save.best.toLocaleString('ko-KR')}`, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '16px',
      fontStyle: '900',
      color: '#ffc857',
    });
    best.setOrigin(0.5);
    this.fitText(best, 228, 12);

    const missionPanel = this.add.rectangle(GAME_WIDTH / 2, layout.missionY, 304, 74, 0x041522, 0.66);
    missionPanel.setStrokeStyle(1, PALETTE.aqua, 0.16);
    const mission = this.add.text(GAME_WIDTH / 2, layout.missionY, this.stageMenuLabel(), {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '12px',
      color: '#e3f8ff',
      lineSpacing: 5,
      wordWrap: { width: 286, useAdvancedWrap: true },
    });
    mission.setOrigin(0.5);
    this.fitText(mission, 282, 10);

    const ruleStrip = this.add.text(GAME_WIDTH / 2, layout.ruleY, `5만원마다 경보 상승  |  목표 ${stage.targetScore.toLocaleString('ko-KR')}`, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '11px',
      fontStyle: '900',
      color: '#ffc857',
      backgroundColor: 'rgba(255, 200, 87, 0.10)',
      padding: { left: 12, right: 12, top: 5, bottom: 5 },
    });
    ruleStrip.setOrigin(0.5);
    this.fitText(ruleStrip, 284, 9);

    const start = this.createButton(GAME_WIDTH / 2, layout.startY, 278, 64, this.save.tutorialDone ? '월급 지키기' : '처음 연습하기', PALETTE.aqua, () => {
      if (this.save.tutorialDone) {
        this.startRound();
        return;
      }

      this.showOnboarding(false);
    });
    const stageButton = this.createButton(76, layout.secondaryY, 96, 46, `STAGE ${stage.id}`, PALETTE.violet, () => {
      this.cycleStage();
    });
    const growth = this.createButton(195, layout.secondaryY, 96, 46, '성장', PALETTE.green, () => {
      this.showGrowthPanel();
    });
    const board = this.createButton(314, layout.secondaryY, 96, 46, '랭킹', PALETTE.gold, () => {
      this.bridge.haptic('tap');
      void this.bridge.openLeaderboard();
    });
    const replayTutorial = this.save.tutorialDone
      ? this.createButton(GAME_WIDTH / 2, layout.footerY - 36, 168, 42, '연습 다시보기', PALETTE.aqua, () => {
          this.showOnboarding(true);
        })
      : undefined;

    const footer = this.add.text(GAME_WIDTH / 2, layout.footerY, '드래그 이동 · 가까이 피하면 각성 보너스 · 60초 생존', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: layout.compact ? '11px' : '12px',
      color: '#7eb5c9',
    });
    footer.setOrigin(0.5);
    this.fitText(footer, 300, 9);

    const buildStamp = this.add.text(GAME_WIDTH - 26, 816, BUILD_VERSION, {
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '10px',
      fontStyle: '900',
      color: '#406a78',
    });
    buildStamp.setOrigin(1, 0.5);
    buildStamp.setVisible(false);

    panel.add([
      glass,
      orb,
      heroShip,
      eyebrow,
      dangerTag,
      dangerCopy,
      title,
      subtitle,
      bestPanel,
      best,
      missionPanel,
      mission,
      ruleStrip,
      start,
      stageButton,
      growth,
      board,
      ...(replayTutorial != null ? [replayTutorial] : []),
      footer,
      buildStamp,
    ]);
    panel.setDepth(30);
    panel.setAlpha(0);
    this.titleLayer = panel;

    this.tweens.add({
      targets: panel,
      alpha: 1,
      y: -10,
      duration: 520,
      ease: 'Cubic.easeOut',
    });

    this.bridge.log('screen_menu', { best: this.save.best, stage: stage.id }, 'screen');
  }

  private menuLayout(): MenuLayout {
    const compact = window.innerHeight <= 740 || window.innerWidth <= 340;

    return compact
      ? {
          compact,
          glassY: 418,
          glassHeight: 686,
          eyebrowY: 18,
          dangerY: 46,
          heroY: 118,
          heroScale: 0.48,
          titleY: 226,
          titleSize: 42,
          subtitleY: 304,
          bestY: 362,
          missionY: 428,
          ruleY: 486,
          startY: 548,
          secondaryY: 618,
          footerY: 716,
        }
      : {
          compact,
          glassY: 414,
          glassHeight: 674,
          eyebrowY: 24,
          dangerY: 58,
          heroY: 148,
          heroScale: 0.62,
          titleY: 276,
          titleSize: 48,
          subtitleY: 358,
          bestY: 410,
          missionY: 480,
          ruleY: 535,
          startY: 604,
          secondaryY: 684,
          footerY: 770,
        };
  }

  private showGrowthPanel() {
    if (this.phase !== 'menu') {
      return;
    }

    this.growthLayer?.destroy();
    this.growthLayer = undefined;

    const nextSkin = this.nextLockedSkin();
    const nextSkinCopy =
      nextSkin == null
        ? '모든 금고 스킨을 열었습니다'
        : `다음 스킨: ${nextSkin.name} · 최고잔고 ${nextSkin.unlock.toLocaleString('ko-KR')}`;
    const nextSkinProgress = nextSkin == null ? 1 : Phaser.Math.Clamp(this.save.best / nextSkin.unlock, 0, 1);
    const cost = this.metaUpgradeCost();
    const canUpgrade = this.save.credits >= cost;

    const layer = this.add.container(0, 0);
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x02070d, 0.68);
    const card = this.add.rectangle(GAME_WIDTH / 2, 428, 334, 566, 0x071927, 0.97);
    card.setStrokeStyle(1, PALETTE.aqua, 0.36);
    const glow = this.add.image(GAME_WIDTH / 2, 170, 'hero-orb').setScale(0.58).setAlpha(0.5);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    const ship = this.add.sprite(GAME_WIDTH / 2, 170, 'ship').setScale(0.46).play('vault-idle');
    ship.setTint(this.currentSkin().tint);
    this.applyGlow(ship, this.currentSkin().glow, 0.24);

    const title = this.add.text(GAME_WIDTH / 2, 250, '월급 금고 성장', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '28px',
      fontStyle: '900',
      color: '#f8fbff',
      shadow: { color: '#00c2ff', blur: 16, fill: true },
    });
    title.setOrigin(0.5);

    const credits = this.add.text(GAME_WIDTH / 2, 296, `월급코인 ${this.save.credits.toLocaleString('ko-KR')}`, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '18px',
      fontStyle: '900',
      color: canUpgrade ? '#66ffc2' : '#ffc857',
    });
    credits.setOrigin(0.5);
    this.fitText(credits, 270, 13);

    const meta = this.add.text(GAME_WIDTH / 2, 334, this.metaLevelLabel(), {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '14px',
      fontStyle: '900',
      color: '#9defff',
    });
    meta.setOrigin(0.5);
    this.fitText(meta, 278, 11);

    const next = this.add.text(GAME_WIDTH / 2, 378, nextSkinCopy, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '13px',
      fontStyle: '900',
      color: '#ffc857',
      wordWrap: { width: 276, useAdvancedWrap: true },
    });
    next.setOrigin(0.5);
    this.fitText(next, 276, 10);

    const progressBack = this.add.rectangle(GAME_WIDTH / 2, 410, 250, 8, 0x163647, 0.84);
    const progressFill = this.add.rectangle(GAME_WIDTH / 2 - 125, 410, 250 * nextSkinProgress, 8, PALETTE.gold, 0.96);
    progressFill.setOrigin(0, 0.5);

    const upgrade = this.createButton(GAME_WIDTH / 2, 474, 250, 54, `강화 ${cost}`, canUpgrade ? PALETTE.green : PALETTE.gold, () => {
      this.buyMetaUpgrade();
    });
    const skin = this.createButton(GAME_WIDTH / 2, 542, 250, 48, '스킨 변경', PALETTE.violet, () => {
      this.cycleSkin();
    });
    const close = this.createButton(GAME_WIDTH / 2, 612, 210, 46, '닫기', PALETTE.aqua, () => {
      this.growthLayer?.destroy();
      this.growthLayer = undefined;
    });

    const hint = this.add.text(GAME_WIDTH / 2, 668, '성장은 한 판 보상과 최고잔고 목표를 이어줍니다', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '12px',
      color: '#7eb5c9',
      wordWrap: { width: 280, useAdvancedWrap: true },
    });
    hint.setOrigin(0.5);

    layer.add([overlay, card, glow, ship, title, credits, meta, next, progressBack, progressFill, upgrade, skin, close, hint]);
    layer.setDepth(48);
    layer.setAlpha(0);
    this.growthLayer = layer;

    this.tweens.add({
      targets: layer,
      alpha: 1,
      duration: 180,
      ease: 'Cubic.easeOut',
    });

    this.bridge.log('screen_growth', { credits: this.save.credits }, 'screen');
  }

  private showOnboarding(replay: boolean) {
    this.phase = 'onboarding';
    this.onboardingStep = 0;
    this.onboardingReplay = replay;
    this.onboardingAdvancing = false;
    this.onboardingDragStartX = 0;
    this.clearActors();
    this.titleLayer?.destroy();
    this.titleLayer = undefined;
    this.growthLayer?.destroy();
    this.growthLayer = undefined;
    this.gameOverLayer?.destroy();
    this.gameOverLayer = undefined;
    this.upgradeLayer?.destroy();
    this.upgradeLayer = undefined;
    this.pauseLayer?.destroy();
    this.pauseLayer = undefined;
    this.tutorialLayer?.destroy();
    this.tutorialLayer = undefined;
    this.onboardingContent = undefined;
    this.onboardingDemoShip = undefined;
    this.onboardingContent?.destroy();
    this.onboardingContent = undefined;
    this.onboardingDemoShip = undefined;
    this.setGameplayVisible(false);

    const layer = this.add.container(0, 0);
    layer.setDepth(52);
    layer.setAlpha(0);
    this.tutorialLayer = layer;
    this.renderOnboardingStep();

    this.tweens.add({
      targets: layer,
      alpha: 1,
      duration: 220,
      ease: 'Cubic.easeOut',
    });

    this.bridge.log('screen_onboarding', { replay }, 'screen');
  }

  private renderOnboardingStep() {
    if (this.tutorialLayer == null) {
      return;
    }

    this.onboardingContent?.destroy();
    this.onboardingAdvancing = false;
    this.onboardingDemoShip = undefined;
    const layer = this.add.container(0, 0);
    this.onboardingContent = layer;
    this.tutorialLayer.add(layer);

    const step = this.onboardingStep;
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x02070d, 0.82);
    const card = this.add.rectangle(GAME_WIDTH / 2, 118, 336, 142, 0x071927, 0.98);
    card.setStrokeStyle(1, step >= 4 ? PALETTE.green : PALETTE.aqua, 0.42);
    const progress = this.add.text(46, 58, step >= 5 ? '완료' : `${step + 1}/5`, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '13px',
      fontStyle: '900',
      color: '#07131f',
      backgroundColor: step >= 4 ? '#66ffc2' : '#ffc857',
      padding: { left: 10, right: 10, top: 5, bottom: 5 },
    });
    progress.setOrigin(0, 0.5);

    const titleCopy = [
      '금고를 직접 움직여보세요',
      '현금봉투를 눌러 수집하세요',
      '빨간 고지서는 피하세요',
      '가까이 피하면 각성합니다',
      '업그레이드 카드를 골라보세요',
      '준비 완료',
    ][step] ?? '준비 완료';
    const bodyCopy = [
      '아래 금고를 좌우로 드래그하면 이동합니다.',
      '좋은 보상은 반짝입니다. 먹으면 잔고와 콤보가 오릅니다.',
      '오른쪽 안전 구역을 눌러 충돌을 피하세요.',
      '너무 멀리 피하지 말고 안전선 근처를 눌러보세요.',
      '런 중 선택은 이번 판의 빌드를 바꿉니다.',
      '이제 60초 동안 월급을 지켜보세요.',
    ][step] ?? '';

    const title = this.add.text(GAME_WIDTH / 2, 88, titleCopy, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '22px',
      fontStyle: '900',
      color: '#f8fbff',
      shadow: { color: '#00c2ff', blur: 14, fill: true },
    });
    title.setOrigin(0.5);
    this.fitText(title, 288, 16);

    const body = this.add.text(GAME_WIDTH / 2, 130, bodyCopy, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '13px',
      color: '#bde6f4',
      wordWrap: { width: 292, useAdvancedWrap: true },
    });
    body.setOrigin(0.5);
    this.fitText(body, 292, 10);

    const skip = this.createButton(GAME_WIDTH / 2, 784, 166, 44, step >= 5 ? '시작하기' : '건너뛰기', step >= 5 ? PALETTE.aqua : PALETTE.gold, () => {
      this.completeOnboarding();
    });

    layer.add([overlay, card, progress, title, body, skip]);

    if (step === 0) {
      this.renderOnboardingDrag(layer);
    } else if (step === 1) {
      this.renderOnboardingCollect(layer);
    } else if (step === 2) {
      this.renderOnboardingDodge(layer);
    } else if (step === 3) {
      this.renderOnboardingNearMiss(layer);
    } else if (step === 4) {
      this.renderOnboardingUpgrade(layer);
    } else {
      this.renderOnboardingReady(layer);
    }
  }

  private renderOnboardingDrag(layer: Phaser.GameObjects.Container) {
    const lane = this.add.rectangle(GAME_WIDTH / 2, 560, 316, 260, 0x06131f, 0.7);
    lane.setStrokeStyle(1, PALETTE.aqua, 0.36);
    const left = this.add.text(84, 438, '←', { fontFamily: 'Pretendard, sans-serif', fontSize: '36px', fontStyle: '900', color: '#66ffc2' }).setOrigin(0.5);
    const right = this.add.text(306, 438, '→', { fontFamily: 'Pretendard, sans-serif', fontSize: '36px', fontStyle: '900', color: '#66ffc2' }).setOrigin(0.5);
    const guide = this.add.text(GAME_WIDTH / 2, 474, '좌우로 크게 움직이면 다음 단계로 넘어갑니다', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '12px',
      fontStyle: '900',
      color: '#ffc857',
    }).setOrigin(0.5);
    const demo = this.add.container(GAME_WIDTH / 2, 640);
    const glow = this.add.image(0, 0, 'hero-orb').setScale(0.38).setAlpha(0.46);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    const ship = this.add.sprite(0, 0, 'ship').setScale(0.38).play('vault-idle');
    ship.setTint(this.currentSkin().tint);
    demo.add([glow, ship]);
    this.onboardingDemoShip = demo;
    const hand = this.createHandCue(GAME_WIDTH / 2, 708, 112, 0);
    const zone = this.add.zone(GAME_WIDTH / 2, 568, 338, 326).setInteractive();
    layer.add([lane, left, right, guide, demo, hand, zone]);
  }

  private renderOnboardingCollect(layer: Phaser.GameObjects.Container) {
    const cash = this.add.sprite(GAME_WIDTH / 2, 442, 'shard').setScale(1.5).play('cash-float');
    const ring = this.add.ellipse(GAME_WIDTH / 2, 442, 96, 96, PALETTE.green, 0);
    ring.setStrokeStyle(3, PALETTE.green, 0.72);
    const hint = this.add.text(GAME_WIDTH / 2, 556, '현금봉투를 눌러보세요', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '17px',
      fontStyle: '900',
      color: '#66ffc2',
    }).setOrigin(0.5);
    const hand = this.createHandCue(GAME_WIDTH / 2 + 58, 492, 0, 36);
    cash.setInteractive(new Phaser.Geom.Circle(0, 0, 46), Phaser.Geom.Circle.Contains);
    cash.on('pointerdown', () => {
      this.bridge.haptic('success');
      this.burst(cash.x, cash.y, PALETTE.green, 16);
      this.popText(cash.x, cash.y - 44, '+현금', '#66ffc2');
      this.advanceOnboarding(260);
    });
    layer.add([ring, cash, hint, hand]);
  }

  private renderOnboardingDodge(layer: Phaser.GameObjects.Container) {
    const lane = this.add.rectangle(GAME_WIDTH / 2, 554, 320, 310, 0x06131f, 0.68);
    lane.setStrokeStyle(1, PALETTE.red, 0.28);
    const danger = this.add.sprite(116, 410, 'hazard').setScale(1.15).play('debt-spin');
    const demo = this.add.sprite(194, 660, 'ship').setScale(0.42).play('vault-idle');
    const safe = this.add.rectangle(292, 610, 118, 178, PALETTE.green, 0.16);
    safe.setStrokeStyle(2, PALETTE.green, 0.62);
    const safeText = this.add.text(292, 610, '안전 구역\n누르기', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '15px',
      fontStyle: '900',
      color: '#66ffc2',
    }).setOrigin(0.5);
    const hand = this.createHandCue(292, 692, 0, -44);
    safe.setInteractive();
    safe.on('pointerdown', () => {
      this.bridge.haptic('tap');
      this.tweens.add({ targets: demo, x: 292, duration: 220, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: danger, y: 720, duration: 520, ease: 'Cubic.easeIn' });
      this.popText(292, 556, '회피 성공', '#66ffc2');
      this.advanceOnboarding(580);
    });
    layer.add([lane, danger, demo, safe, safeText, hand]);
  }

  private renderOnboardingNearMiss(layer: Phaser.GameObjects.Container) {
    const lane = this.add.rectangle(GAME_WIDTH / 2, 554, 320, 310, 0x06131f, 0.68);
    lane.setStrokeStyle(1, PALETTE.gold, 0.3);
    const danger = this.add.sprite(178, 420, 'rent').setScale(1.08).play('rent-spin');
    const demo = this.add.sprite(284, 654, 'ship').setScale(0.42).play('vault-idle');
    const near = this.add.rectangle(260, 610, 64, 190, PALETTE.gold, 0.16);
    near.setStrokeStyle(2, PALETTE.gold, 0.72);
    const text = this.add.text(260, 610, '근접\n회피', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '14px',
      fontStyle: '900',
      color: '#ffc857',
    }).setOrigin(0.5);
    const hand = this.createHandCue(260, 700, 0, -48);
    near.setInteractive();
    near.on('pointerdown', () => {
      this.bridge.haptic('softMedium');
      this.tweens.add({ targets: demo, x: 260, duration: 180, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: danger, y: 728, duration: 460, ease: 'Cubic.easeIn' });
      this.shockwave(260, 594, PALETTE.gold, 2);
      this.popText(260, 540, '가까이 회피 +각성', '#ffc857');
      this.advanceOnboarding(560);
    });
    layer.add([lane, danger, demo, near, text, hand]);
  }

  private renderOnboardingUpgrade(layer: Phaser.GameObjects.Container) {
    const cards = [
      { y: 358, title: '월급자석', body: '현금을 더 멀리서 끌어옵니다', color: PALETTE.aqua },
      { y: 494, title: '캐시백 폭발', body: '가까이 회피 보상이 커집니다', color: PALETTE.green },
      { y: 630, title: '파산보험', body: '한 번 더 살아남습니다', color: PALETTE.violet },
    ].map((card, index) => {
      const group = this.add.container(GAME_WIDTH / 2, card.y);
      const bg = this.add.rectangle(0, 0, 300, 98, 0x082234, 0.98);
      bg.setStrokeStyle(2, card.color, 0.52);
      const title = this.add.text(-116, -22, card.title, {
        fontFamily: 'Pretendard, sans-serif',
        fontSize: '19px',
        fontStyle: '900',
        color: '#f8fbff',
      }).setOrigin(0, 0.5);
      const body = this.add.text(-116, 18, card.body, {
        fontFamily: 'Pretendard, sans-serif',
        fontSize: '12px',
        color: '#b8d9e7',
      }).setOrigin(0, 0.5);
      const badge = this.add.text(116, 30, index === 1 ? 'EVO 준비' : 'Lv.1', {
        align: 'right',
        fontFamily: 'Pretendard, sans-serif',
        fontSize: '12px',
        fontStyle: '900',
        color: index === 1 ? '#66ffc2' : '#ffc857',
      }).setOrigin(1, 0.5);
      group.add([bg, title, body, badge]);
      group.setSize(300, 98);
      group.setInteractive(new Phaser.Geom.Rectangle(-150, -49, 300, 98), Phaser.Geom.Rectangle.Contains);
      group.on('pointerdown', () => {
        this.bridge.haptic('success');
        this.popText(GAME_WIDTH / 2, card.y - 58, index === 1 ? 'EVO 자동환급장' : `${card.title} 선택`, index === 1 ? '#66ffc2' : '#ffc857');
        this.advanceOnboarding(520);
      });
      return group;
    });
    const hand = this.createHandCue(306, 512, -48, 0);
    layer.add([...cards, hand]);
  }

  private renderOnboardingReady(layer: Phaser.GameObjects.Container) {
    const halo = this.add.image(GAME_WIDTH / 2, 364, 'hero-orb').setScale(0.84).setAlpha(0.72);
    halo.setBlendMode(Phaser.BlendModes.ADD);
    const ship = this.add.sprite(GAME_WIDTH / 2, 360, 'ship').setScale(0.7).play('vault-idle');
    ship.setTint(this.currentSkin().tint);
    const copy = this.add.text(GAME_WIDTH / 2, 518, '실전에서는 5만원마다 경보 단계가 오릅니다\n스테이지 목표를 넘기면 다음 구간이 열립니다', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '15px',
      fontStyle: '900',
      color: '#d9f7ff',
      lineSpacing: 8,
      wordWrap: { width: 300, useAdvancedWrap: true },
    }).setOrigin(0.5);
    const start = this.createButton(GAME_WIDTH / 2, 650, 254, 62, '실전 시작', PALETTE.aqua, () => {
      this.completeOnboarding();
    });
    layer.add([halo, ship, copy, start]);
  }

  private createHandCue(x: number, y: number, dx: number, dy: number) {
    const group = this.add.container(x, y);
    const palm = this.add.circle(0, 0, 18, PALETTE.white, 0.94);
    const tip = this.add.rectangle(0, -22, 13, 32, PALETTE.white, 0.94);
    tip.setStrokeStyle(1, PALETTE.aqua, 0.55);
    const label = this.add.text(0, 3, '손', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '11px',
      fontStyle: '900',
      color: '#07131f',
    }).setOrigin(0.5);
    group.add([tip, palm, label]);
    this.tweens.add({
      targets: group,
      x: x + dx,
      y: y + dy,
      alpha: 0.72,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    return group;
  }

  private handleOnboardingPointer(kind: 'down' | 'move', pointer: Phaser.Input.Pointer) {
    if (this.onboardingStep !== 0 || pointer.y < 398 || pointer.y > 738) {
      return;
    }

    if (kind === 'down') {
      this.onboardingDragStartX = pointer.x;
      this.bridge.haptic('tap');
    }

    if (pointer.isDown || kind === 'down') {
      const x = Phaser.Math.Clamp(pointer.x, 72, GAME_WIDTH - 72);
      this.onboardingDemoShip?.setX(x);

      if (Math.abs(x - this.onboardingDragStartX) > 88) {
        this.bridge.haptic('success');
        this.popText(x, 584, '이동 완료', '#66ffc2');
        this.advanceOnboarding(220);
      }
    }
  }

  private advanceOnboarding(delayMs = 180) {
    if (this.phase !== 'onboarding' || this.onboardingAdvancing) {
      return;
    }

    this.onboardingAdvancing = true;
    this.onboardingStep += 1;
    this.time.delayedCall(delayMs, () => {
      if (this.phase === 'onboarding') {
        this.renderOnboardingStep();
      }
    });
  }

  private completeOnboarding() {
    this.save.tutorialDone = true;
    this.persistSave();
    this.bridge.log('onboarding_complete', { replay: this.onboardingReplay }, 'event');
    this.startRound();
  }

  private showTutorial() {
    this.phase = 'tutorial';
    this.clearActors();
    this.titleLayer?.destroy();
    this.titleLayer = undefined;
    this.growthLayer?.destroy();
    this.growthLayer = undefined;
    this.gameOverLayer?.destroy();
    this.gameOverLayer = undefined;
    this.upgradeLayer?.destroy();
    this.upgradeLayer = undefined;
    this.pauseLayer?.destroy();
    this.pauseLayer = undefined;
    this.tutorialLayer?.destroy();
    this.tutorialLayer = undefined;
    this.onboardingContent = undefined;
    this.onboardingDemoShip = undefined;
    this.setGameplayVisible(false);

    const layer = this.add.container(0, 0);
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x02070d, 0.76);
    const card = this.add.rectangle(GAME_WIDTH / 2, 426, 342, 676, 0x071927, 0.96);
    card.setStrokeStyle(1, PALETTE.aqua, 0.34);
    const halo = this.add.image(GAME_WIDTH / 2, 106, 'hero-orb').setScale(0.42).setAlpha(0.62);
    halo.setBlendMode(Phaser.BlendModes.ADD);
    const ship = this.add.sprite(GAME_WIDTH / 2, 106, 'ship').setScale(0.38).play('vault-idle');
    this.applyGlow(ship, PALETTE.aqua, 0.24);

    const badge = this.add.text(GAME_WIDTH / 2, 157, '첫판은 10초면 이해됩니다', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '12px',
      fontStyle: '900',
      color: '#07131f',
      backgroundColor: '#ffc857',
      padding: { left: 12, right: 12, top: 5, bottom: 5 },
    });
    badge.setOrigin(0.5);

    const title = this.add.text(GAME_WIDTH / 2, 212, '손가락 하나로\n월급을 살리세요', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '31px',
      fontStyle: '900',
      lineSpacing: -4,
      color: '#f8fbff',
      shadow: { color: '#00c2ff', blur: 16, fill: true },
    });
    title.setOrigin(0.5);

    const subtitle = this.add.text(GAME_WIDTH / 2, 267, '모으기, 피하기, 가까이 회피. 이 세 가지만 기억하면 됩니다.', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '13px',
      color: '#bde6f4',
      wordWrap: { width: 286, useAdvancedWrap: true },
    });
    subtitle.setOrigin(0.5);

    const stepOne = this.createStepCard(323, '1', '현금은 끌어당기기', '현금봉투·코인·시간쿠폰은 가까이 오면 자동 흡입됩니다.', PALETTE.green);
    const stepTwo = this.createStepCard(421, '2', '고지서는 피하기', '충돌은 위험하지만, 가까이 피하면 각성 게이지가 더 빨리 찹니다.', PALETTE.pink);
    const stepThree = this.createStepCard(519, '3', '각성 중엔 욕심내기', '월급각성 중에는 파산을 방어하고 잔고 보상이 2.1배로 커집니다.', PALETTE.gold);

    const riskPanel = this.add.rectangle(GAME_WIDTH / 2, 586, 304, 44, PALETTE.red, 0.18);
    riskPanel.setStrokeStyle(1, PALETTE.red, 0.32);
    const riskText = this.add.text(GAME_WIDTH / 2, 586, '핵심 재미: 고지서를 가까이 피하면 각성 보너스가 찹니다', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '12px',
      fontStyle: '900',
      color: '#ffe0e5',
      wordWrap: { width: 270, useAdvancedWrap: true },
    });
    riskText.setOrigin(0.5);

    const start = this.createButton(GAME_WIDTH / 2, 660, 270, 62, '바로 시작', PALETTE.aqua, () => {
      this.save.tutorialDone = true;
      this.persistSave();
      this.bridge.log('tutorial_start', {}, 'event');
      this.startRound();
    });
    const menu = this.createButton(GAME_WIDTH / 2, 732, 190, 46, '메뉴', PALETTE.gold, () => {
      this.showMenu();
    });

    layer.add([overlay, card, halo, ship, badge, title, subtitle, stepOne, stepTwo, stepThree, riskPanel, riskText, start, menu]);
    layer.setDepth(38);
    layer.setAlpha(0);
    this.tutorialLayer = layer;

    this.tweens.add({
      targets: layer,
      alpha: 1,
      duration: 260,
      ease: 'Cubic.easeOut',
    });

    this.bridge.log('screen_tutorial', {}, 'screen');
  }

  private startRound() {
    this.titleLayer?.destroy();
    this.titleLayer = undefined;
    this.growthLayer?.destroy();
    this.growthLayer = undefined;
    this.tutorialLayer?.destroy();
    this.tutorialLayer = undefined;
    this.onboardingContent = undefined;
    this.onboardingDemoShip = undefined;
    this.upgradeLayer?.destroy();
    this.upgradeLayer = undefined;
    this.pauseLayer?.destroy();
    this.pauseLayer = undefined;
    this.gameOverLayer?.destroy();
    this.gameOverLayer = undefined;
    this.phase = 'playing';
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.shards = 0;
    this.nearMiss = 0;
    this.feverCount = 0;
    this.upgrades = { ...DEFAULT_RUNTIME_UPGRADES };
    this.activeEvolutions.clear();
    this.upgradeThresholds = [45, 30, 15];
    this.stormThresholds = [42, 24, 9];
    this.resultCredits = 0;
    this.resultStageIndex = this.save.selectedStage;
    this.resultStageCleared = false;
    this.resultUnlockedStage = false;
    this.hp = this.maxHp();
    this.timeLeft = ROUND_SECONDS;
    this.targetX = GAME_WIDTH / 2;
    this.spawnElapsed = 0;
    this.difficulty = 1;
    this.lastAnnouncedTier = 0;
    this.bestAlertTierThisRun = 0;
    this.feverMs = 0;
    this.overdrive = 0;
    this.nearChain = 0;
    this.lastCollectMs = 0;
    this.comboGraceMs = 1650;
    this.player.setPosition(GAME_WIDTH / 2, PLAYER_Y);
    this.player.setScale(1);
    this.player.setAlpha(1);
    this.applyPlayerSkin();
    this.setGameplayVisible(true);
    this.clearActors();
    this.bridge.haptic('success');
    this.bridge.log('round_start', { best: this.save.best, plays: this.save.plays + 1, stage: this.currentStage().id });
    this.updateHud();
  }

  private showPause() {
    if (this.phase !== 'playing') {
      return;
    }

    this.phase = 'paused';
    this.renderPauseLayer();
    this.bridge.log('pause_open', { score: this.score, timeLeft: Math.round(this.timeLeft * 10) / 10 }, 'event');
  }

  private renderPauseLayer() {
    this.pauseLayer?.destroy();
    this.pauseLayer = undefined;

    const layer = this.add.container(0, 0);
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x02070d, 0.54);
    const card = this.add.rectangle(GAME_WIDTH / 2, 430, 326, 342, 0x071927, 0.97);
    card.setStrokeStyle(1, PALETTE.aqua, 0.34);
    const title = this.add.text(GAME_WIDTH / 2, 300, '일시정지', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '32px',
      fontStyle: '900',
      color: '#f8fbff',
      shadow: { color: '#00c2ff', blur: 16, fill: true },
    });
    title.setOrigin(0.5);
    const stats = this.add.text(GAME_WIDTH / 2, 348, `현재 잔고 ${this.score.toLocaleString('ko-KR')} · 남은 시간 ${this.timeLeft.toFixed(1)}초`, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '13px',
      fontStyle: '900',
      color: '#bde6f4',
      wordWrap: { width: 280, useAdvancedWrap: true },
    });
    stats.setOrigin(0.5);
    this.fitText(stats, 280, 10);

    const resume = this.createButton(GAME_WIDTH / 2, 428, 250, 58, '계속하기', PALETTE.aqua, () => {
      this.resumeRound();
    });
    const sound = this.createButton(GAME_WIDTH / 2, 500, 220, 48, this.muted ? '소리 켜기' : '소리 끄기', PALETTE.gold, () => {
      this.toggleMute();
    });
    const menu = this.createButton(GAME_WIDTH / 2, 570, 220, 48, '처음으로', PALETTE.red, () => {
      this.showMenu();
    });

    layer.add([overlay, card, title, stats, resume, sound, menu]);
    layer.setDepth(45);
    this.pauseLayer = layer;
  }

  private resumeRound() {
    if (this.phase !== 'paused') {
      return;
    }

    this.pauseLayer?.destroy();
    this.pauseLayer = undefined;
    this.phase = 'playing';
    this.bridge.log('pause_resume', { score: this.score }, 'event');
  }

  private toggleMute() {
    this.muted = !this.muted;
    this.muteHudLabel?.setText(this.muted ? '무음' : '음');
    this.bridge.log('audio_toggle', { muted: this.muted }, 'event');

    if (this.phase === 'paused') {
      this.renderPauseLayer();
    }
  }

  private maybeTriggerUpgradeChoice() {
    const next = this.upgradeThresholds[0];
    if (next == null || this.timeLeft > next) {
      return false;
    }

    this.upgradeThresholds.shift();
    this.showUpgradeChoice(next);
    return true;
  }

  private showUpgradeChoice(threshold: number) {
    if (this.phase !== 'playing') {
      return;
    }

    this.phase = 'upgrade';
    this.upgradeLayer?.destroy();
    this.upgradeLayer = undefined;

    const options = this.pickUpgradeOptions(3);
    const layer = this.add.container(0, 0);
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x02070d, 0.62);
    const headline = this.add.text(GAME_WIDTH / 2, 164, '월급 생존 선택', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '30px',
      fontStyle: '900',
      color: '#f8fbff',
      shadow: { color: '#00c2ff', blur: 18, fill: true },
    });
    headline.setOrigin(0.5);

    const sub = this.add.text(GAME_WIDTH / 2, 205, `${threshold}초 구간 돌파 · 이번 판 빌드를 고르세요`, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '13px',
      fontStyle: '900',
      color: '#bde6f4',
    });
    sub.setOrigin(0.5);

    const cards = options.map((option, index) => this.createUpgradeCard(226 + index * 138, option));
    layer.add([overlay, headline, sub, ...cards]);
    layer.setDepth(44);
    layer.setAlpha(0);
    this.upgradeLayer = layer;

    this.tweens.add({
      targets: layer,
      alpha: 1,
      duration: 180,
      ease: 'Cubic.easeOut',
    });

    this.bridge.haptic('softMedium');
    this.bridge.log('upgrade_open', { threshold, options: options.map((option) => option.id).join(',') }, 'event');
  }

  private createUpgradeCard(y: number, option: (typeof UPGRADE_CARDS)[number]) {
    const evolutionPreview = this.evolutionPreview(option.id);
    const group = this.add.container(GAME_WIDTH / 2, y + 54);
    const bg = this.add.rectangle(0, 0, 322, 118, 0x082234, 0.96);
    bg.setStrokeStyle(2, evolutionPreview != null ? PALETTE.green : option.color, evolutionPreview != null ? 0.72 : 0.45);
    const glow = this.add.rectangle(0, 0, 322, 118, evolutionPreview != null ? PALETTE.green : option.color, evolutionPreview != null ? 0.11 : 0.05);
    const icon = this.add.circle(-128, -22, 22, option.color, 0.96);
    const iconText = this.add.text(-128, -22, String(this.upgrades[option.id] + 1), {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '18px',
      fontStyle: '900',
      color: option.color === PALETTE.gold ? '#1a1720' : '#041522',
    });
    iconText.setOrigin(0.5);
    const title = this.add.text(-88, -32, option.title, {
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '20px',
      fontStyle: '900',
      color: '#f8fbff',
    });
    title.setOrigin(0, 0.5);
    this.fitText(title, 198, 14);
    const subtitle = this.add.text(-88, 4, option.subtitle, {
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '12px',
      lineSpacing: 3,
      color: '#b8d9e7',
      wordWrap: { width: 224, useAdvancedWrap: true },
    });
    subtitle.setOrigin(0, 0.5);
    this.fitText(subtitle, 224, 10);
    const current = this.add.text(118, 38, evolutionPreview == null ? `Lv.${this.upgrades[option.id]}` : `EVO ${evolutionPreview.name}`, {
      align: 'right',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '12px',
      fontStyle: '900',
      color: evolutionPreview == null ? '#ffc857' : '#66ffc2',
    });
    current.setOrigin(1, 0.5);
    this.fitText(current, 112, 9);
    group.add([glow, bg, icon, iconText, title, subtitle, current]);
    group.setSize(322, 118);
    group.setInteractive(new Phaser.Geom.Rectangle(-161, -59, 322, 118), Phaser.Geom.Rectangle.Contains);
    group.on('pointerdown', () => {
      this.chooseUpgrade(option.id);
    });

    return group;
  }

  private chooseUpgrade(id: UpgradeId) {
    this.upgrades[id] += 1;

    if (id === 'overtime') {
      this.timeLeft = Math.min(ROUND_SECONDS, this.timeLeft + 2.4);
      this.comboGraceMs += 360;
    }

    if (id === 'shield') {
      this.shockwave(this.player.x, this.player.y - 10, PALETTE.violet, 2);
    }

    if (id === 'payday') {
      this.overdrive = Math.min(100, this.overdrive + 18);
    }

    this.maybeUnlockEvolutions();

    this.upgradeLayer?.destroy();
    this.upgradeLayer = undefined;
    this.phase = 'playing';
    this.bridge.haptic('success');
    this.playTone([659, 784, 988], 0.04);
    this.popText(this.player.x, this.player.y - 102, `${this.upgradeTitle(id)} Lv.${this.upgrades[id]}`, '#ffc857');
    this.bridge.log('upgrade_pick', { id, level: this.upgrades[id], score: this.score }, 'event');
    this.updateHud();
  }

  private maybeTriggerExpenseStorm() {
    const next = this.stormThresholds[0];
    if (next == null || this.timeLeft > next) {
      return;
    }

    this.stormThresholds.shift();
    const label = next <= 10 ? '마감 10초 · 구독료 폭주' : next <= 25 ? '세금 고지서 폭풍' : '월세 운석 주의';
    const kinds: ActorKind[] = next <= 10 ? ['sub', 'tax', 'hazard'] : next <= 25 ? ['tax', 'rent', 'hazard'] : ['rent', 'hazard', 'sub'];
    this.popText(GAME_WIDTH / 2, 190, label, '#ffccd5');
    this.cameras.main.shake(130, 0.006);
    this.bridge.haptic('wiggle');
    this.bridge.log('expense_storm', { threshold: next, label }, 'event');

    for (let i = 0; i < 5; i += 1) {
      this.time.delayedCall(i * 115, () => {
        const x = 46 + i * 74 + Phaser.Math.Between(-12, 12);
        this.spawnActor(kinds[i % kinds.length], Phaser.Math.Clamp(x, 36, GAME_WIDTH - 36));
      });
    }
  }

  private finishRound(reason: 'timeout' | 'crash') {
    if (this.phase !== 'playing') {
      return;
    }

    this.phase = 'gameover';
    this.clearActors();
    this.setGameplayVisible(false);
    this.cameras.main.flash(220, 255, 255, 255, false);
    this.bridge.haptic(reason === 'crash' ? 'error' : 'confetti');

    const oldBest = this.save.best;
    const isRecord = this.score > oldBest;
    const stageIndex = this.save.selectedStage;
    const stage = STAGES[stageIndex] ?? STAGES[0];
    this.resultStageIndex = stageIndex;
    this.resultStageCleared = this.score >= stage.targetScore;
    this.resultUnlockedStage = false;
    this.resultCredits = this.calculateCreditsEarned();
    this.save.best = Math.max(this.save.best, this.score);
    this.save.bestAlertTier = Math.max(this.save.bestAlertTier, this.bestAlertTierThisRun);
    this.save.bestByStage = this.normalizedBestByStage();
    this.save.bestByStage[stageIndex] = Math.max(this.save.bestByStage[stageIndex] ?? 0, this.score);
    if (this.resultStageCleared && stageIndex < STAGES.length - 1 && this.save.unlockedStage <= stageIndex) {
      this.save.unlockedStage = stageIndex + 1;
      this.save.selectedStage = stageIndex + 1;
      this.resultUnlockedStage = true;
    }
    this.save.credits += this.resultCredits;
    this.save.plays += 1;
    this.save.totalScore += this.score;
    this.save.daily.shards += this.shards;
    this.save.daily.nearMiss += this.nearMiss;
    this.save.daily.fever += this.feverCount;
    this.save.daily.maxCombo = Math.max(this.save.daily.maxCombo, this.maxCombo);
    this.persistSave();

    void this.bridge.submitScore(this.score).then((status) => {
      this.bridge.log('leaderboard_submit', { score: this.score, status });
    });

    if (isRecord && this.save.plays >= 3) {
      void this.bridge.requestReview();
    }

    this.showGameOver(isRecord, reason);
    this.bridge.log('round_end', {
      combo: this.maxCombo,
      fever: this.feverCount,
      credits: this.resultCredits,
      reason,
      score: this.score,
      shards: this.shards,
      alertTier: this.bestAlertTierThisRun,
      stage: stage.id,
      stageCleared: this.resultStageCleared,
    });
  }

  private showGameOver(isRecord: boolean, reason: string) {
    const resultStage = STAGES[this.resultStageIndex] ?? STAGES[0];
    const layer = this.add.container(0, 0);
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x02070d, 0.78);
    const card = this.add.rectangle(GAME_WIDTH / 2, 430, 334, 604, 0x0a2031, 0.96);
    card.setStrokeStyle(1, isRecord ? PALETTE.gold : PALETTE.aqua, 0.42);
    const halo = this.add.image(GAME_WIDTH / 2, 188, 'hero-orb').setScale(0.86).setAlpha(0.68);
    halo.setBlendMode(Phaser.BlendModes.ADD);

    const label = isRecord ? '잔고 신기록' : reason === 'crash' ? '월급 증발' : '월급 방어 성공';
    const title = this.add.text(GAME_WIDTH / 2, 222, label, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '26px',
      fontStyle: '900',
      color: isRecord ? '#ffc857' : '#f8fbff',
    });
    title.setOrigin(0.5);

    const score = this.add.text(GAME_WIDTH / 2, 292, this.score.toLocaleString('ko-KR'), {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '58px',
      fontStyle: '900',
      color: '#f8fbff',
      shadow: { color: '#00c2ff', blur: 18, fill: true },
    });
    score.setOrigin(0.5);
    this.fitText(score, 300, 34);

    const detail = this.add.text(
      GAME_WIDTH / 2,
      363,
      `STAGE ${resultStage.id} ${resultStage.name} · 경보 ${this.bestAlertTierThisRun}단계 · 콤보 ${this.maxCombo}`,
      {
        align: 'center',
        fontFamily: 'Pretendard, sans-serif',
        fontSize: '14px',
        color: '#cdeffc',
      },
    );
    detail.setOrigin(0.5);
    this.fitText(detail, 294, 10);

    const rank = this.add.text(GAME_WIDTH / 2, 416, this.rankLabel(), {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '32px',
      fontStyle: '900',
      color: isRecord ? '#ffc857' : '#9defff',
      shadow: { color: isRecord ? '#6a3600' : '#003852', blur: 12, fill: true },
    });
    rank.setOrigin(0.5);

    const percentile = this.add.text(GAME_WIDTH / 2, 462, `${this.stageResultLabel(resultStage)} · ${this.nextGoalLabel()}`, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '14px',
      fontStyle: '900',
      color: '#9defff',
    });
    percentile.setOrigin(0.5);
    this.fitText(percentile, 288, 10);

    const credit = this.add.text(GAME_WIDTH / 2, 498, `월급코인 +${this.resultCredits} · 보유 ${this.save.credits.toLocaleString('ko-KR')}`, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '15px',
      fontStyle: '900',
      color: '#66ffc2',
    });
    credit.setOrigin(0.5);
    this.fitText(credit, 292, 11);

    const mission = this.add.text(GAME_WIDTH / 2, 535, this.dailyMissionLabel(), {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '12px',
      color: '#ffc857',
      lineSpacing: 4,
    });
    mission.setOrigin(0.5);
    this.fitText(mission, 292, 9);

    const retry = this.createButton(GAME_WIDTH / 2, 612, 248, 58, this.resultUnlockedStage ? '다음 스테이지' : '다시 방어', PALETTE.aqua, () => {
      layer.destroy();
      this.gameOverLayer = undefined;
      this.startRound();
    });

    const board = this.createButton(GAME_WIDTH / 2, 681, 228, 46, '리더보드 확인', PALETTE.gold, () => {
      this.bridge.haptic('tap');
      void this.bridge.openLeaderboard();
    });

    const menu = this.createButton(GAME_WIDTH / 2, 744, 216, 46, '메뉴', PALETTE.violet, () => {
      layer.destroy();
      this.gameOverLayer = undefined;
      this.showMenu();
    });

    layer.add([overlay, card, halo, title, score, detail, rank, percentile, credit, mission, retry, board, menu]);
    layer.setDepth(40);
    layer.setAlpha(0);
    this.gameOverLayer = layer;

    this.tweens.add({
      targets: layer,
      alpha: 1,
      duration: 280,
      ease: 'Cubic.easeOut',
    });
  }

  private applyDebugScreen() {
    const params = new URLSearchParams(window.location.search);
    const screen = params.get('screen');

    if (screen == null) {
      return;
    }

    if (params.get('stress') === '1') {
      this.save = {
        ...this.save,
        best: Math.max(this.save.best, 987654321),
        bestAlertTier: Math.max(this.save.bestAlertTier, 6),
        bestByStage: STAGES.map((stage) => stage.targetScore + 12000),
        credits: Math.max(this.save.credits, 7654321),
        selectedStage: Math.min(2, STAGES.length - 1),
        unlockedStage: STAGES.length - 1,
        selectedSkin: Math.min(SKINS.length - 1, Math.max(0, this.save.selectedSkin)),
        meta: { vault: 5, magnet: 5, luck: 5 },
        daily: { shards: 89, nearMiss: 11, fever: 4, maxCombo: 35 },
      };
    }

    if (screen === 'menu') {
      this.showMenu();
      return;
    }

    if (screen === 'growth') {
      this.showMenu();
      this.showGrowthPanel();
      return;
    }

    if (screen === 'tutorial') {
      this.showTutorial();
      return;
    }

    if (screen === 'onboarding') {
      this.showOnboarding(true);
      return;
    }

    if (screen === 'playing') {
      this.startRound();
      this.score = 88420;
      this.combo = 18;
      this.bestAlertTierThisRun = this.scoreAlertTier();
      this.lastAnnouncedTier = this.scoreAlertTier();
      this.hp = Math.min(this.maxHp(), 2);
      this.overdrive = 78;
      this.updateHud();
      return;
    }

    if (screen === 'pause') {
      this.startRound();
      this.score = 138880;
      this.combo = 31;
      this.bestAlertTierThisRun = this.scoreAlertTier();
      this.lastAnnouncedTier = this.scoreAlertTier();
      this.timeLeft = 38.4;
      this.updateHud();
      this.showPause();
      return;
    }

    if (screen === 'upgrade') {
      this.startRound();
      this.score = 68420;
      this.combo = 24;
      this.showUpgradeChoice(45);
      return;
    }

    if (screen === 'gameover') {
      this.titleLayer?.destroy();
      this.titleLayer = undefined;
      this.setGameplayVisible(false);
      this.clearActors();
      this.phase = 'gameover';
      this.score = params.get('stress') === '1' ? 987654321 : 128880;
      this.maxCombo = params.get('stress') === '1' ? 888 : 47;
      this.nearMiss = params.get('stress') === '1' ? 77 : 14;
      this.feverCount = params.get('stress') === '1' ? 24 : 5;
      this.resultCredits = params.get('stress') === '1' ? 99999 : 124;
      this.resultStageIndex = this.save.selectedStage;
      this.resultStageCleared = true;
      this.resultUnlockedStage = params.get('stress') !== '1' && this.save.selectedStage < STAGES.length - 1;
      this.bestAlertTierThisRun = this.scoreAlertTier();
      this.showGameOver(true, 'timeout');
    }
  }

  private setGameplayVisible(visible: boolean) {
    this.player?.setVisible(visible);

    for (const object of this.hudObjects) {
      object.setVisible(visible);
    }

    if (!visible && this.dangerOverlay != null) {
      this.dangerOverlay.setAlpha(0);
    }
  }

  private spawnLoop(delta: number) {
    const clutch = this.timeLeft <= 10;
    const stage = this.currentStage();
    const tier = this.scoreAlertTier();
    const interval = Math.max(
      clutch ? 150 : 210,
      660 - this.difficulty * 105 - tier * 24 - stage.spawnBonus * 180 - (this.feverMs > 0 ? 75 : 0) - (clutch ? 95 : 0),
    );

    if (this.spawnElapsed < interval) {
      return;
    }

    this.spawnElapsed = 0;
    const roll = Math.random();
    const hazardChance = Phaser.Math.Clamp(0.1 + this.difficulty * 0.018 + tier * 0.028 + stage.hazardBonus + (clutch ? 0.035 : 0), 0.12, 0.48);
    const pulseChance = hazardChance + (clutch ? 0.06 : 0.08);
    const boostChance = pulseChance + (this.hp <= 1 ? 0.1 : 0.06);

    if (roll < hazardChance) {
      this.spawnActor(this.pickHazardKind());
    } else if (roll < pulseChance) {
      this.spawnActor('pulse');
    } else if (roll < boostChance) {
      this.spawnActor('boost');
    } else if (roll > (clutch ? 0.86 : 0.91)) {
      this.spawnActor('coin');
    } else {
      this.spawnActor('shard');
    }

    if (Math.random() < 0.16 + this.difficulty * 0.025 + tier * 0.012 + stage.spawnBonus * 0.4) {
      this.time.delayedCall(130, () => this.spawnActor(Math.random() < 0.34 ? this.pickHazardKind() : Math.random() < 0.2 ? 'boost' : 'shard'));
    }

    void delta;
  }

  private spawnActor(kind: ActorKind, forcedX?: number) {
    const imageKey =
      this.isHazard(kind)
        ? kind
        : kind === 'pulse'
          ? 'pulse'
          : kind === 'coin'
            ? 'coin'
            : kind === 'boost'
              ? 'boost'
              : 'shard';
    const x = forcedX ?? Phaser.Math.Between(34, GAME_WIDTH - 34);
    const image = this.add.sprite(x, -34, imageKey);
    const isFever = this.feverMs > 0;
    const slowFactor = 1 - Math.min(0.28, this.upgrades.slow * 0.09);
    const speedMultiplier = this.scoreSpeedMultiplier();
    const rewardMultiplier = this.rewardMultiplier();
    const baseValue = kind === 'coin' ? 220 : kind === 'pulse' ? 90 : kind === 'boost' ? 70 : 55 + this.save.meta.luck * 3;
    const actor: Actor = {
      kind,
      image,
      radius: this.isHazard(kind) ? (kind === 'tax' ? 34 : 30) : kind === 'pulse' ? 26 : kind === 'boost' ? 24 : 21,
      speed:
        (this.isHazard(kind) ? (kind === 'rent' ? 230 : kind === 'sub' ? 188 : 205) : kind === 'pulse' ? 152 : kind === 'boost' ? 148 : 176) *
        this.difficulty *
        speedMultiplier *
        (isFever && this.isHazard(kind) ? 0.76 : 1) *
        (this.isHazard(kind) ? slowFactor : 1),
      value: Math.round(baseValue * rewardMultiplier),
      wobble: Phaser.Math.FloatBetween(0.014, 0.031),
    };

    image.setDepth(this.isHazard(kind) ? 8 : 7);
    image.setScale(this.isHazard(kind) ? Phaser.Math.FloatBetween(0.92, 1.2) : Phaser.Math.FloatBetween(0.86, 1.18));
    image.setBlendMode(this.isHazard(kind) ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
    image.play(
      kind === 'hazard'
        ? 'debt-spin'
        : kind === 'rent'
          ? 'rent-spin'
          : kind === 'tax'
            ? 'tax-spin'
            : kind === 'sub'
              ? 'sub-spin'
        : kind === 'pulse'
          ? 'payday-pulse'
          : kind === 'coin'
            ? 'coin-shine'
            : kind === 'boost'
              ? 'coupon-pop'
              : 'cash-float',
    );
    this.applyGlow(image, this.isHazard(kind) ? PALETTE.red : kind === 'boost' ? PALETTE.green : kind === 'coin' ? PALETTE.gold : PALETTE.aqua, 0.25);
    this.actors.push(actor);
  }

  private updateActors(delta: number) {
    const playerX = this.player.x;
    const playerY = this.player.y;
    const dt = delta / 1000;
    const toRemove = new Set<Actor>();

    for (const actor of this.actors) {
      const wave = Math.sin((actor.image.y + actor.image.x) * actor.wobble) * (this.isHazard(actor.kind) ? 22 : 9);
      actor.image.y += actor.speed * dt;
      actor.image.x += wave * dt;
      actor.image.rotation += dt * (this.isHazard(actor.kind) ? 1.9 : actor.kind === 'boost' ? 5.4 : 3.8);
      actor.image.scaleX += Math.sin(this.time.now * 0.006 + actor.wobble * 100) * 0.0008;

      const distance = Phaser.Math.Distance.Between(playerX, playerY, actor.image.x, actor.image.y);
      const magnetRange = this.magnetRange();

      if (!this.isHazard(actor.kind) && distance < magnetRange) {
        actor.image.x += (playerX - actor.image.x) * 0.08;
        actor.image.y += (playerY - actor.image.y) * 0.08;
      }

      if (this.isHazard(actor.kind) && distance < actor.radius + 24) {
        toRemove.add(actor);
        this.takeHit();
        continue;
      }

      if (this.isHazard(actor.kind) && !actor.nearMissed && distance < actor.radius + 64 && distance > actor.radius + 30) {
        actor.nearMissed = true;
        this.nearChain = Math.min(9, this.nearChain + 1);
        this.nearMiss += 1;
        this.overdrive = Math.min(100, this.overdrive + 10 + this.nearChain * 5 + Math.min(18, this.combo) + this.upgrades.rebate * 4);
        this.score += Math.round((90 + this.combo * 7 + this.nearChain * 35) * (1 + this.upgrades.rebate * 0.18 + this.save.meta.luck * 0.025));
        this.bridge.haptic(this.nearChain >= 3 ? 'tickMedium' : 'tickWeak');
        this.burst(actor.image.x, actor.image.y, this.nearChain >= 3 ? PALETTE.gold : PALETTE.violet, this.nearChain >= 3 ? 15 : 8);
        this.popText(actor.image.x, actor.image.y - 20, this.nearChain >= 2 ? `가까이 회피 x${this.nearChain}` : '가까이 회피 +각성', this.nearChain >= 3 ? '#ffc857' : '#cfc4ff');
        if (this.nearChain === 3 || this.nearChain === 6) {
          this.bridge.log('near_miss_chain', { chain: this.nearChain, score: this.score }, 'event');
        }
        this.time.delayedCall(1700, () => {
          this.nearChain = Math.max(0, this.nearChain - 1);
        });
      }

      if (!this.isHazard(actor.kind) && distance < actor.radius + 28) {
        toRemove.add(actor);
        this.collect(actor);
      }

      if (actor.image.y > GAME_HEIGHT + 70) {
        toRemove.add(actor);
      }
    }

    if (toRemove.size > 0) {
      this.actors = this.actors.filter((actor) => {
        if (!toRemove.has(actor)) {
          return true;
        }

        actor.image.destroy();
        return false;
      });
    }
  }

  private collect(actor: Actor) {
    const now = this.time.now;
    const comboAlive = now - this.lastCollectMs < this.comboGraceMs;
    this.combo = comboAlive ? this.combo + 1 : 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.lastCollectMs = now;

    const feverMultiplier = this.feverMs > 0 ? 2.1 + this.upgrades.payday * 0.18 + this.save.meta.luck * 0.03 + (this.hasEvolution('thirteenthPay') ? 0.35 : 0) : 1;
    const comboMultiplier = 1 + Math.min(this.combo, 36) * 0.045;
    const hpBonus = actor.kind === 'pulse' ? 0 : this.hp * 8;
    const rebateMultiplier = 1 + this.upgrades.rebate * 0.08 + this.save.meta.luck * 0.015 + (this.hasEvolution('autoRefund') ? 0.14 : 0);
    this.score += Math.round((actor.value + hpBonus) * comboMultiplier * feverMultiplier * rebateMultiplier);
    this.tweens.add({
      targets: [this.scoreText, this.scoreCard],
      scale: 1.06,
      duration: 70,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    if (actor.kind === 'shard' || actor.kind === 'coin' || actor.kind === 'boost') {
      this.shards += 1;
      this.bridge.haptic(this.combo % 8 === 0 ? 'tickMedium' : 'tickWeak');
    }

    if (actor.kind === 'pulse') {
      this.startFever();
    }

    if (actor.kind === 'boost') {
      this.timeLeft = Math.min(ROUND_SECONDS, this.timeLeft + 1.8 + this.upgrades.overtime * 0.28 + (this.hasEvolution('thirteenthPay') ? 0.45 : 0));
      this.overdrive = Math.min(100, this.overdrive + 8);
      this.bridge.haptic('softMedium');
      this.popText(actor.image.x, actor.image.y - 18, '+1.8초', '#66ffc2');
      this.tweens.add({
        targets: [this.timerText, this.timerCard],
        scale: 1.08,
        duration: 90,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    } else {
      this.popText(actor.image.x, actor.image.y - 18, `+${actor.value}`);
    }

    this.burst(
      actor.image.x,
      actor.image.y,
      actor.kind === 'coin' ? PALETTE.gold : actor.kind === 'boost' ? PALETTE.green : PALETTE.aqua,
      actor.kind === 'pulse' ? 22 : actor.kind === 'boost' ? 14 : 9,
    );

    if (this.combo > 0 && this.combo % 10 === 0) {
      this.timeLeft = Math.min(ROUND_SECONDS, this.timeLeft + 1.2);
      this.bridge.haptic('softMedium');
      this.bridge.log('combo_milestone', { combo: this.combo, score: this.score }, 'event');
      this.popText(this.player.x, this.player.y - 74, '콤보 +1.2초', '#ffc857');
      this.tweens.add({
        targets: [this.timerText, this.scoreText],
        scale: 1.09,
        duration: 90,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    }

    if (this.overdrive >= 100 && this.feverMs <= 0) {
      this.startFever();
      this.overdrive = 0;
      this.popText(this.player.x, this.player.y - 94, '월급각성', '#ffc857');
    }
  }

  private startFever() {
    this.feverMs = Math.max(this.feverMs, 6200 + this.upgrades.payday * 1250 + this.save.meta.luck * 260 + (this.hasEvolution('thirteenthPay') ? 1600 : 0));
    this.feverCount += 1;
    this.comboGraceMs = 2200;
    this.cameras.main.flash(190, 0, 194, 255, false);
    this.shockwave(this.player.x, this.player.y - 26, PALETTE.gold, 3);
    this.bridge.haptic('confetti');
    this.bridge.log('fever_start', { combo: this.combo, score: this.score });
    this.playTone([523, 659, 784], 0.045);

    this.tweens.add({
      targets: this.player,
      scale: 1.12,
      yoyo: true,
      duration: 180,
      ease: 'Back.easeOut',
    });
  }

  private takeHit() {
    if (this.feverMs > 0) {
      this.score += 140;
      this.bridge.haptic('basicMedium');
      this.cameras.main.shake(90, 0.005);
      this.popText(this.player.x, this.player.y - 88, '파산 방어', '#ffc857');
      this.playTone([196, 392], 0.04);
      return;
    }

    if (this.upgrades.shield > 0) {
      this.upgrades.shield -= 1;
      this.score += 90;
      this.bridge.haptic('success');
      this.cameras.main.shake(110, 0.006);
      this.shockwave(this.player.x, this.player.y - 12, PALETTE.violet, 2);
      if (this.hasEvolution('debtFreeze')) {
        this.freezeHazards();
      }
      this.popText(this.player.x, this.player.y - 88, '파산보험 발동', '#cfc4ff');
      this.bridge.log('shield_block', { score: this.score, timeLeft: Math.round(this.timeLeft * 10) / 10 }, 'event');
      return;
    }

    this.hp -= 1;
    this.combo = 0;
    this.nearChain = 0;
    this.comboGraceMs = 1650;
    this.bridge.haptic('wiggle');
    this.bridge.log('player_hit', { hp: this.hp, score: this.score, timeLeft: Math.round(this.timeLeft * 10) / 10 }, 'event');
    this.playTone([130, 98], 0.075);
    this.cameras.main.shake(170, 0.012);
    this.player.setAlpha(0.54);
    this.tweens.add({
      targets: this.player,
      alpha: 1,
      duration: 280,
      ease: 'Cubic.easeOut',
    });

    if (this.hp <= 0) {
      this.finishRound('crash');
    }
  }

  private updatePlayer(delta: number) {
    const lerp = 1 - Math.pow(0.002, delta / 1000);
    this.player.x = Phaser.Math.Linear(this.player.x, this.targetX, lerp);
    this.player.y = PLAYER_Y + Math.sin(this.time.now * 0.007) * 5;
    this.player.rotation = Phaser.Math.Clamp((this.targetX - this.player.x) * 0.005, -0.28, 0.28);
    const skin = this.currentSkin();
    this.playerGlow.setFillStyle(this.feverMs > 0 ? PALETTE.gold : skin.glow, this.feverMs > 0 ? 0.28 : 0.16);
    this.magnetRing.setStrokeStyle(2, this.feverMs > 0 ? PALETTE.gold : skin.glow, this.feverMs > 0 ? 0.48 : 0.26);
    this.magnetRing.setScale(1 + this.upgrades.magnet * 0.035 + this.save.meta.magnet * 0.018);
    this.playerFlame.setTint(this.feverMs > 0 ? PALETTE.gold : PALETTE.white);
    this.playerShip.setTint(this.feverMs > 0 ? 0xfff0b6 : skin.tint);
  }

  private updateCombo(delta: number) {
    if (this.combo <= 0) {
      return;
    }

    if (this.time.now - this.lastCollectMs > this.comboGraceMs) {
      this.combo = Math.max(0, this.combo - 1);
      this.lastCollectMs = this.time.now - this.comboGraceMs + 320;
    }

    if (this.feverMs <= 0) {
      this.comboGraceMs = Math.max(1200, this.comboGraceMs - delta * 0.0015);
    }
  }

  private updateHud() {
    this.scoreText.setFontSize(25);
    this.scoreText.setText(this.score.toLocaleString('ko-KR'));
    this.fitText(this.scoreText, 132, 16);
    this.timerText.setFontSize(24);
    this.timerText.setText(this.timeLeft.toFixed(1));
    this.fitText(this.timerText, 76, 16);
    this.timerText.setColor(this.timeLeft < 8 ? '#ff5f9f' : '#ffc857');
    const maxHp = this.maxHp();
    const shield = this.upgrades.shield > 0 ? ` · 보험 ${this.upgrades.shield}` : '';
    this.comboText.setFontSize(13);
    this.comboText.setText(`콤보 ${this.combo} · 체력 ${'◆'.repeat(Math.max(0, this.hp))}${'◇'.repeat(Math.max(0, maxHp - this.hp))}${shield}`);
    this.fitText(this.comboText, 245, 9);

    const fever = this.feverMs > 0 ? ` · 각성 ${(this.feverMs / 1000).toFixed(1)}s` : '';
    this.missionText.setFontSize(12);
    this.missionText.setText(`${this.stageHudLabel()}${fever}`);
    this.fitText(this.missionText, 258, 9);
    const status =
      this.feverMs > 0
        ? `월급각성: 파산 방어 · ${(2.1 + this.upgrades.payday * 0.18).toFixed(1)}배 잔고`
        : this.timeLeft <= 10
          ? '마지막 10초 · 욕심내면 신기록'
          : this.upgrades.rebate + this.upgrades.magnet + this.upgrades.slow + this.upgrades.payday > 0
            ? this.upgradeStatusLabel()
          : this.nearChain >= 2
            ? `가까이 회피 x${this.nearChain} · 각성 보너스`
            : this.overdrive > 70
              ? '월급각성 임박 · 고지서를 가까이 피하세요'
              : '가까이 피하면 각성 · 모으면 잔고 상승';
    this.statusText.setFontSize(12);
    this.statusText.setText(status);
    this.fitText(this.statusText, 324, 9);
    this.statusText.setColor(this.feverMs > 0 || this.overdrive > 70 ? '#ffc857' : '#78cfe7');
    this.overdriveFill.width = (212 * (this.feverMs > 0 ? 1 : this.overdrive)) / 100;
    this.overdriveFill.setFillStyle(this.feverMs > 0 ? PALETTE.gold : this.overdrive > 70 ? PALETTE.green : PALETTE.aqua, 0.96);
    this.dangerOverlay.setAlpha(this.hp <= 1 && this.phase === 'playing' ? 0.08 + Math.sin(this.time.now * 0.012) * 0.035 : 0);
  }

  private updateStars(delta: number) {
    for (const nebula of this.nebulae) {
      const speed = Number(nebula.getData('speed')) * delta;
      nebula.y += speed * (this.phase === 'playing' ? 2 : 0.55);

      if (nebula.y > GAME_HEIGHT + 160) {
        nebula.y = -160;
        nebula.x = Phaser.Math.Between(30, GAME_WIDTH - 30);
      }
    }

    for (const star of this.stars) {
      const speed = Number(star.getData('speed')) * delta;
      star.y += speed * (this.phase === 'playing' ? 2.7 : 0.7);

      if (star.y > GAME_HEIGHT + 5) {
        star.y = -5;
        star.x = Phaser.Math.Between(6, GAME_WIDTH - 6);
      }
    }

    for (const line of this.speedLines) {
      const speed = Number(line.getData('speed')) * delta;
      line.y += speed * (this.phase === 'playing' ? 3.4 : 0.35);
      line.alpha = this.phase === 'playing' ? Phaser.Math.Clamp(0.05 + this.difficulty * 0.03 + (this.feverMs > 0 ? 0.1 : 0), 0.05, 0.22) : 0.04;

      if (line.y > GAME_HEIGHT + 120) {
        line.y = Phaser.Math.Between(-320, -80);
        line.x = Phaser.Math.Between(20, GAME_WIDTH - 20);
      }
    }
  }

  private burst(x: number, y: number, color: number, count: number) {
    for (let i = 0; i < count; i += 1) {
      const dot =
        i % 3 === 0
          ? this.add.image(x, y, 'spark').setScale(Phaser.Math.FloatBetween(0.25, 0.58)).setTint(color)
          : this.add.circle(x, y, Phaser.Math.FloatBetween(2, 4.8), color, Phaser.Math.FloatBetween(0.62, 0.95));
      dot.setDepth(16);
      dot.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: dot,
        x: x + Phaser.Math.Between(-68, 68),
        y: y + Phaser.Math.Between(-62, 42),
        rotation: Phaser.Math.FloatBetween(-3.4, 3.4),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(340, 680),
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }

  private popText(x: number, y: number, label: string, color = '#f8fbff') {
    const text = this.add.text(x, y, label, {
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '16px',
      fontStyle: '900',
      color,
      shadow: { color: '#001622', blur: 8, fill: true },
    });
    text.setOrigin(0.5);
    text.setDepth(this.growthLayer != null || this.upgradeLayer != null || this.pauseLayer != null ? 60 : 18);
    this.tweens.add({
      targets: text,
      y: y - 34,
      alpha: 0,
      duration: 620,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private fitText(text: Phaser.GameObjects.Text, maxWidth: number, minFontSize: number) {
    const rawSize = text.style.fontSize;
    let size = typeof rawSize === 'number' ? rawSize : Number.parseFloat(String(rawSize));

    if (!Number.isFinite(size)) {
      size = 16;
    }

    while (text.width > maxWidth && size > minFontSize) {
      size -= 1;
      text.setFontSize(size);
    }

    return text;
  }

  private clearActors() {
    for (const actor of this.actors) {
      actor.image.destroy();
    }

    this.actors = [];
  }

  private createStepCard(y: number, number: string, title: string, body: string, color: number) {
    const group = this.add.container(0, 0);
    const bg = this.add.rectangle(GAME_WIDTH / 2, y, 304, 78, 0x092336, 0.72);
    bg.setStrokeStyle(1, color, 0.26);
    const index = this.add.circle(66, y, 18, color, 0.94);
    const indexText = this.add.text(66, y, number, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '17px',
      fontStyle: '900',
      color: color === PALETTE.gold ? '#1a1720' : '#041522',
    });
    indexText.setOrigin(0.5);
    const titleText = this.add.text(94, y - 18, title, {
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '15px',
      fontStyle: '900',
      color: '#f8fbff',
    });
    titleText.setOrigin(0, 0.5);
    const bodyText = this.add.text(94, y + 10, body, {
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '11px',
      lineSpacing: 2,
      color: '#b8d9e7',
      wordWrap: { width: 226, useAdvancedWrap: true },
    });
    bodyText.setOrigin(0, 0.5);
    group.add([bg, index, indexText, titleText, bodyText]);

    return group;
  }

  private createHudButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
  ) {
    const group = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, width, height, 0x06131f, 0.78);
    bg.setStrokeStyle(1, PALETTE.aqua, 0.28);
    const text = this.add.text(0, 0, label, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '12px',
      fontStyle: '900',
      color: '#d9f7ff',
    });
    text.setOrigin(0.5);
    group.add([bg, text]);
    group.setDepth(22);
    group.setSize(width, height);
    group.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    group.on('pointerdown', () => {
      this.bridge.haptic('tap');
      this.tweens.add({
        targets: group,
        scale: 0.94,
        duration: 60,
        yoyo: true,
        onComplete: onClick,
      });
    });

    return { group, label: text };
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: number,
    onClick: () => void,
  ) {
    const group = this.add.container(x, y);
    const shadow = this.add.rectangle(0, 8, width, height, 0x000000, 0.28);
    shadow.setOrigin(0.5);
    const bg = this.add.rectangle(0, 0, width, height, color, 0.96);
    bg.setOrigin(0.5);
    bg.setStrokeStyle(2, PALETTE.white, 0.3);
    const shine = this.add.rectangle(-width * 0.18, -height * 0.25, width * 0.42, 2, PALETTE.white, 0.32);
    shine.setRotation(-0.12);
    const text = this.add.text(0, 0, label, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: height > 50 ? '20px' : '15px',
      fontStyle: '900',
      color: color === PALETTE.gold || color === PALETTE.green ? '#1a1720' : color === PALETTE.red || color === PALETTE.violet ? '#fff4f4' : '#041522',
    });
    text.setOrigin(0.5);
    this.fitText(text, width - 24, height > 50 ? 16 : 12);
    group.add([shadow, bg, shine, text]);
    this.applyGlow(bg, color, 0.18);
    group.setSize(width, height);
    group.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    group.on('pointerdown', () => {
      this.bridge.haptic('tap');
      this.tweens.add({
        targets: group,
        scale: 0.96,
        duration: 70,
        yoyo: true,
        onComplete: onClick,
      });
    });

    return group;
  }

  private buildTextures() {
    if (this.textures.exists('ship')) {
      return;
    }

    const rounded = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
      const r = Math.min(radius, width / 2, height / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + width, y, x + width, y + height, r);
      ctx.arcTo(x + width, y + height, x, y + height, r);
      ctx.arcTo(x, y + height, x, y, r);
      ctx.arcTo(x, y, x + width, y, r);
      ctx.closePath();
    };

    const makeSheet = (
      key: string,
      frameWidth: number,
      frameHeight: number,
      frames: number,
      draw: (ctx: CanvasRenderingContext2D, frame: number) => void,
    ) => {
      const canvas = document.createElement('canvas');
      canvas.width = frameWidth * frames;
      canvas.height = frameHeight;
      const ctx = canvas.getContext('2d');

      if (ctx == null) {
        return;
      }

      for (let frame = 0; frame < frames; frame += 1) {
        ctx.save();
        ctx.translate(frame * frameWidth, 0);
        draw(ctx, frame);
        ctx.restore();
      }

      this.textures.addSpriteSheet(
        key,
        canvas as unknown as HTMLImageElement,
        { frameWidth, frameHeight, endFrame: frames - 1 },
        canvas,
      );
    };

    const make = (key: string, width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      makeSheet(key, width, height, 1, (ctx) => draw(ctx));
    };

    makeSheet('ship', 150, 142, 6, (ctx, frame) => {
      const bob = Math.sin((frame / 6) * Math.PI * 2);
      ctx.translate(0, bob * 2);
      ctx.save();
      ctx.shadowBlur = 32;
      ctx.shadowColor = 'rgba(0, 194, 255, 0.75)';
      const aura = ctx.createRadialGradient(75, 78, 8, 75, 78, 72);
      aura.addColorStop(0, 'rgba(0,194,255,.35)');
      aura.addColorStop(1, 'rgba(0,194,255,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.ellipse(75, 80, 68, 48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const leftWing = ctx.createLinearGradient(14, 55, 72, 104);
      leftWing.addColorStop(0, '#74f1ff');
      leftWing.addColorStop(0.58, '#0b8eb1');
      leftWing.addColorStop(1, '#073048');
      ctx.fillStyle = leftWing;
      ctx.beginPath();
      ctx.moveTo(55, 60);
      ctx.bezierCurveTo(31, 45, 12, 51, 9, 78);
      ctx.bezierCurveTo(25, 80, 37, 95, 56, 105);
      ctx.closePath();
      ctx.fill();

      const rightWing = ctx.createLinearGradient(136, 55, 78, 104);
      rightWing.addColorStop(0, '#ffe083');
      rightWing.addColorStop(0.58, '#13a8c9');
      rightWing.addColorStop(1, '#073048');
      ctx.fillStyle = rightWing;
      ctx.beginPath();
      ctx.moveTo(95, 60);
      ctx.bezierCurveTo(119, 45, 138, 51, 141, 78);
      ctx.bezierCurveTo(125, 80, 113, 95, 94, 105);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 18;
      ctx.shadowColor = 'rgba(0,0,0,.42)';
      const body = ctx.createLinearGradient(48, 24, 102, 122);
      body.addColorStop(0, '#fffef1');
      body.addColorStop(0.36, '#f7d675');
      body.addColorStop(0.72, '#2ad7ff');
      body.addColorStop(1, '#0c4662');
      rounded(ctx, 46, 20, 58, 104, 22);
      ctx.fillStyle = body;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,.82)';
      ctx.stroke();
      ctx.shadowBlur = 0;

      const top = ctx.createLinearGradient(52, 28, 98, 62);
      top.addColorStop(0, '#ffffff');
      top.addColorStop(1, '#8df2ff');
      rounded(ctx, 54, 30, 42, 34, 15);
      ctx.fillStyle = top;
      ctx.fill();
      ctx.strokeStyle = 'rgba(7,19,31,.38)';
      ctx.stroke();

      ctx.fillStyle = 'rgba(7,19,31,.86)';
      rounded(ctx, 58, 69, 34, 28, 14);
      ctx.fill();
      ctx.strokeStyle = '#ffc857';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#ffc857';
      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('₩', 75, 84);

      ctx.fillStyle = 'rgba(255,255,255,.72)';
      rounded(ctx, 61, 36, 28, 7, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,200,87,.82)';
      rounded(ctx, 61, 46, 20, 6, 3);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(75, 24);
      ctx.bezierCurveTo(69, 52, 69, 92, 75, 121);
      ctx.stroke();
    });

    makeSheet('flame', 58, 86, 6, (ctx, frame) => {
      const stretch = 1 + Math.sin((frame / 6) * Math.PI * 2) * 0.1;
      ctx.translate(29, 0);
      ctx.scale(1 - (stretch - 1) * 0.6, stretch);
      ctx.translate(-29, 0);
      const plume = ctx.createLinearGradient(29, 0, 29, 86);
      plume.addColorStop(0, '#fff9ca');
      plume.addColorStop(0.25, '#ffc857');
      plume.addColorStop(0.62, '#ff4f64');
      plume.addColorStop(1, 'rgba(0,194,255,.08)');
      ctx.shadowBlur = 22;
      ctx.shadowColor = '#ffc857';
      ctx.fillStyle = plume;
      ctx.beginPath();
      ctx.moveTo(29, 0);
      ctx.bezierCurveTo(6, 22, 8, 62, 29, 86);
      ctx.bezierCurveTo(50, 62, 52, 22, 29, 0);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,194,255,.48)';
      ctx.beginPath();
      ctx.moveTo(29, 12);
      ctx.bezierCurveTo(17, 34, 19, 56, 29, 72);
      ctx.bezierCurveTo(39, 56, 41, 34, 29, 12);
      ctx.fill();
    });

    makeSheet('shard', 88, 70, 6, (ctx, frame) => {
      ctx.translate(44, 35);
      ctx.rotate(-0.16 + Math.sin((frame / 6) * Math.PI * 2) * 0.08);
      ctx.shadowBlur = 18;
      ctx.shadowColor = 'rgba(102,255,194,.55)';
      const bill = ctx.createLinearGradient(-34, -21, 34, 21);
      bill.addColorStop(0, '#e8fff6');
      bill.addColorStop(0.45, '#66ffc2');
      bill.addColorStop(1, '#12a876');
      rounded(ctx, -34, -20, 68, 40, 9);
      ctx.fillStyle = bill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(7,19,31,.24)';
      rounded(ctx, -24, -12, 48, 24, 8);
      ctx.stroke();
      ctx.fillStyle = '#07301f';
      ctx.font = '900 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('₩', 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath();
      ctx.arc(-22, -8, 4, 0, Math.PI * 2);
      ctx.arc(22, 8, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    makeSheet('hazard', 108, 108, 8, (ctx, frame) => {
      ctx.translate(54, 54);
      ctx.rotate(frame * 0.22);
      for (let i = 0; i < 4; i += 1) {
        ctx.save();
        ctx.rotate(i * Math.PI * 0.5 + 0.28);
        const card = ctx.createLinearGradient(-12, -49, 30, -23);
        card.addColorStop(0, '#ff7a8b');
        card.addColorStop(1, '#4b1023');
        rounded(ctx, -19, -50, 38, 24, 5);
        ctx.fillStyle = card;
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        rounded(ctx, -14, -43, 14, 3, 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.shadowBlur = 26;
      ctx.shadowColor = '#ff4f64';
      const hole = ctx.createRadialGradient(0, 0, 4, 0, 0, 44);
      hole.addColorStop(0, '#000000');
      hole.addColorStop(0.52, '#160619');
      hole.addColorStop(1, '#8c72ff');
      ctx.fillStyle = hole;
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,79,100,.78)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, 31, -0.8, 4.9);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,200,87,.46)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 44, 1.1, 5.7);
      ctx.stroke();
      ctx.fillStyle = '#f8fbff';
      ctx.font = '900 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CARD', 0, 4);
    });

    makeSheet('rent', 108, 108, 8, (ctx, frame) => {
      ctx.translate(54, 54);
      ctx.rotate(Math.sin(frame * 0.7) * 0.12);
      ctx.shadowBlur = 24;
      ctx.shadowColor = '#ff4f64';
      const meteor = ctx.createRadialGradient(-8, -10, 6, 0, 0, 46);
      meteor.addColorStop(0, '#fff1d5');
      meteor.addColorStop(0.34, '#ff8f57');
      meteor.addColorStop(1, '#671629');
      ctx.fillStyle = meteor;
      ctx.beginPath();
      ctx.moveTo(0, -48);
      ctx.bezierCurveTo(42, -28, 42, 30, 0, 47);
      ctx.bezierCurveTo(-42, 30, -42, -28, 0, -48);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(7,19,31,.88)';
      rounded(ctx, -24, -8, 48, 36, 6);
      ctx.fill();
      ctx.fillStyle = '#ffc857';
      ctx.beginPath();
      ctx.moveTo(-28, -7);
      ctx.lineTo(0, -31);
      ctx.lineTo(28, -7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f8fbff';
      ctx.font = '900 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RENT', 0, 17);
    });

    makeSheet('tax', 108, 108, 8, (ctx, frame) => {
      ctx.translate(54, 54);
      ctx.rotate(frame * 0.12);
      ctx.shadowBlur = 24;
      ctx.shadowColor = '#ffc857';
      const seal = ctx.createRadialGradient(0, 0, 8, 0, 0, 44);
      seal.addColorStop(0, '#fff6bc');
      seal.addColorStop(0.42, '#ffc857');
      seal.addColorStop(1, '#5b2508');
      ctx.fillStyle = seal;
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const radius = i % 2 === 0 ? 46 : 34;
        const angle = -Math.PI / 2 + i * Math.PI * 0.2;
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,.65)';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#261104';
      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TAX', 0, 6);
    });

    makeSheet('sub', 108, 108, 8, (ctx, frame) => {
      ctx.translate(54, 54);
      const wobble = Math.sin(frame * 0.8) * 5;
      ctx.shadowBlur = 24;
      ctx.shadowColor = '#8c72ff';
      const ghost = ctx.createLinearGradient(0, -42, 0, 48);
      ghost.addColorStop(0, '#f8fbff');
      ghost.addColorStop(0.48, '#b7a9ff');
      ghost.addColorStop(1, '#351c61');
      ctx.fillStyle = ghost;
      ctx.beginPath();
      ctx.moveTo(-34, 42);
      ctx.bezierCurveTo(-42, 12 + wobble, -34, -40, 0, -44);
      ctx.bezierCurveTo(34, -40, 42, 12 - wobble, 34, 42);
      ctx.lineTo(18, 31);
      ctx.lineTo(4, 43);
      ctx.lineTo(-10, 31);
      ctx.lineTo(-24, 43);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#07131f';
      ctx.beginPath();
      ctx.arc(-12, -10, 5, 0, Math.PI * 2);
      ctx.arc(12, -10, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#07131f';
      ctx.font = '900 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SUB', 0, 18);
    });

    makeSheet('pulse', 88, 88, 6, (ctx, frame) => {
      ctx.translate(44, 44);
      const pulse = 1 + Math.sin((frame / 6) * Math.PI * 2) * 0.07;
      ctx.scale(pulse, pulse);
      ctx.shadowBlur = 26;
      ctx.shadowColor = '#ffc857';
      const seal = ctx.createRadialGradient(0, 0, 6, 0, 0, 40);
      seal.addColorStop(0, '#fff8c8');
      seal.addColorStop(0.48, '#ffc857');
      seal.addColorStop(1, '#9d5416');
      ctx.fillStyle = seal;
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#281804';
      ctx.font = '900 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAY', 0, -3);
      ctx.fillText('DAY', 0, 12);
    });

    makeSheet('coin', 68, 68, 8, (ctx, frame) => {
      ctx.translate(34, 34);
      const flip = 0.76 + Math.abs(Math.sin((frame / 8) * Math.PI * 2)) * 0.24;
      ctx.scale(flip, 1);
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#ffc857';
      const coin = ctx.createRadialGradient(-10, -13, 5, 0, 0, 30);
      coin.addColorStop(0, '#fff8b8');
      coin.addColorStop(0.48, '#ffc857');
      coin.addColorStop(1, '#8b4016');
      ctx.fillStyle = coin;
      ctx.beginPath();
      ctx.arc(0, 0, 27, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,.72)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#5d2c07';
      ctx.font = '900 23px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('₩', 0, 1);
    });

    makeSheet('boost', 82, 82, 6, (ctx, frame) => {
      ctx.translate(41, 41);
      ctx.rotate(Math.sin((frame / 6) * Math.PI * 2) * 0.1);
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#66ffc2';
      const coupon = ctx.createLinearGradient(-30, -28, 30, 28);
      coupon.addColorStop(0, '#f1fff9');
      coupon.addColorStop(0.52, '#66ffc2');
      coupon.addColorStop(1, '#057c6d');
      ctx.rotate(0.12);
      rounded(ctx, -31, -23, 62, 46, 10);
      ctx.fillStyle = coupon;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,.82)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#04382d';
      ctx.font = '900 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+TIME', 0, -2);
      ctx.strokeStyle = 'rgba(4,56,45,.48)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 8, 12, -Math.PI / 2, Math.PI * 1.4);
      ctx.stroke();
    });

    make('hero-orb', 260, 260, (ctx) => {
      ctx.translate(130, 130);
      const aura = ctx.createRadialGradient(0, 0, 12, 0, 0, 124);
      aura.addColorStop(0, 'rgba(255,255,255,.3)');
      aura.addColorStop(0.35, 'rgba(0,194,255,.22)');
      aura.addColorStop(0.72, 'rgba(255,200,87,.16)');
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 124, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,194,255,.34)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 98, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,200,87,.55)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(0, 0, 76, -0.3, 1.9);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      rounded(ctx, -54, -28, 108, 68, 22);
      ctx.fill();
      ctx.fillStyle = '#ffc857';
      ctx.font = '900 54px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('₩', 0, 10);
    });

    make('nebula-a', 180, 180, (ctx) => {
      const cloud = ctx.createRadialGradient(84, 82, 12, 84, 82, 86);
      cloud.addColorStop(0, 'rgba(0,194,255,.23)');
      cloud.addColorStop(0.52, 'rgba(140,114,255,.13)');
      cloud.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cloud;
      ctx.fillRect(0, 0, 180, 180);
      ctx.fillStyle = 'rgba(255,200,87,.09)';
      ctx.beginPath();
      ctx.ellipse(62, 120, 48, 22, -0.5, 0, Math.PI * 2);
      ctx.fill();
    });

    make('nebula-b', 180, 180, (ctx) => {
      const cloud = ctx.createRadialGradient(94, 80, 10, 94, 80, 88);
      cloud.addColorStop(0, 'rgba(255,200,87,.18)');
      cloud.addColorStop(0.48, 'rgba(0,194,255,.11)');
      cloud.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cloud;
      ctx.fillRect(0, 0, 180, 180);
      ctx.fillStyle = 'rgba(255,79,100,.08)';
      ctx.beginPath();
      ctx.ellipse(118, 118, 54, 32, 0.4, 0, Math.PI * 2);
      ctx.fill();
    });

    make('spark', 34, 34, (ctx) => {
      ctx.translate(17, 17);
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#f8fbff';
      ctx.fillStyle = '#f8fbff';
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(4, -4);
      ctx.lineTo(13, 0);
      ctx.lineTo(4, 4);
      ctx.lineTo(0, 13);
      ctx.lineTo(-4, 4);
      ctx.lineTo(-13, 0);
      ctx.lineTo(-4, -4);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#00c2ff';
      ctx.stroke();
    });
  }

  private buildAnimations() {
    if (this.anims.exists('vault-idle')) {
      return;
    }

    const loop = (key: string, texture: string, end: number, frameRate: number) => {
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(texture, { start: 0, end }),
        frameRate,
        repeat: -1,
      });
    };

    loop('vault-idle', 'ship', 5, 10);
    loop('flame-loop', 'flame', 5, 16);
    loop('cash-float', 'shard', 5, 8);
    loop('debt-spin', 'hazard', 7, 12);
    loop('rent-spin', 'rent', 7, 10);
    loop('tax-spin', 'tax', 7, 11);
    loop('sub-spin', 'sub', 7, 9);
    loop('payday-pulse', 'pulse', 5, 10);
    loop('coin-shine', 'coin', 7, 14);
    loop('coupon-pop', 'boost', 5, 10);
  }

  private loadSave(): SaveState {
    const today = new Date().toISOString().slice(0, 10);
    let parsed: SaveState = {
      ...DEFAULT_SAVE,
      bestByStage: [...DEFAULT_SAVE.bestByStage],
      daily: { ...DEFAULT_SAVE.daily },
      meta: { ...DEFAULT_SAVE.meta },
    };

    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw != null) {
        const saved = JSON.parse(raw) as Partial<SaveState>;
        parsed = {
          ...parsed,
          ...saved,
          bestByStage: STAGES.map((_, index) => Math.max(0, saved.bestByStage?.[index] ?? 0)),
          daily: { ...DEFAULT_SAVE.daily, ...saved.daily },
          meta: { ...DEFAULT_SAVE.meta, ...saved.meta },
        };
      }
    } catch {
      parsed = {
        ...DEFAULT_SAVE,
        bestByStage: [...DEFAULT_SAVE.bestByStage],
        daily: { ...DEFAULT_SAVE.daily },
        meta: { ...DEFAULT_SAVE.meta },
      };
    }

    if (parsed.dailyDate !== today) {
      parsed.dailyDate = today;
      parsed.daily = { ...DEFAULT_SAVE.daily };
    }

    parsed.unlockedStage = Phaser.Math.Clamp(Math.floor(parsed.unlockedStage ?? 0), 0, STAGES.length - 1);
    parsed.selectedStage = Phaser.Math.Clamp(Math.floor(parsed.selectedStage ?? 0), 0, parsed.unlockedStage);
    parsed.bestAlertTier = Math.max(0, Math.floor(parsed.bestAlertTier ?? 0));
    parsed.bestByStage = STAGES.map((_, index) => Math.max(0, parsed.bestByStage?.[index] ?? 0));

    return parsed;
  }

  private persistSave() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.save));
    } catch {
      // Storage is optional in file previews and some embedded WebViews.
    }
  }

  private dailyMissionLabel() {
    const daily = this.save.daily;
    const shardsDone = Math.min(90, daily.shards);
    const nearDone = Math.min(12, daily.nearMiss);
    const comboDone = Math.min(36, daily.maxCombo);

    return `오늘의 미션\n현금봉투 ${shardsDone}/90 · 가까이 회피 ${nearDone}/12 · 최대콤보 ${comboDone}/36`;
  }

  private dailyShortLabel() {
    const missionDone =
      this.save.daily.shards + this.shards >= 90 &&
      this.save.daily.nearMiss + this.nearMiss >= 12 &&
      Math.max(this.save.daily.maxCombo, this.maxCombo) >= 36;

    return missionDone ? '오늘 미션 완료' : `현금 ${this.shards + this.save.daily.shards}/90`;
  }

  private rankLabel() {
    if (this.score >= 300000) {
      return 'RANK SSS';
    }
    if (this.score >= 200000) {
      return 'RANK SS';
    }
    if (this.score >= 120000) {
      return 'RANK S';
    }
    if (this.score >= 50000) {
      return 'RANK A';
    }
    return 'RANK B';
  }

  private isHazard(kind: ActorKind) {
    return kind === 'hazard' || kind === 'rent' || kind === 'tax' || kind === 'sub';
  }

  private pickHazardKind(): ActorKind {
    const weights = { ...this.currentStage().hazardWeights };

    if (this.timeLeft <= 12) {
      weights.sub += 0.75;
      weights.tax += 0.35;
    }

    if (this.scoreAlertTier() >= 2) {
      weights.rent += 0.35;
      weights.tax += 0.35;
    }

    if (this.scoreAlertTier() >= 4) {
      weights.sub += 0.4;
      weights.hazard += 0.25;
    }

    const total = weights.hazard + weights.rent + weights.tax + weights.sub;
    let cursor = Math.random() * total;
    for (const kind of ['hazard', 'rent', 'tax', 'sub'] as HazardKind[]) {
      cursor -= weights[kind];
      if (cursor <= 0) {
        return kind;
      }
    }

    return 'hazard';
  }

  private scoreAlertTier() {
    return Math.min(MAX_ALERT_TIER, Math.max(0, Math.floor(this.score / SCORE_TIER_SIZE)));
  }

  private effectiveDifficulty() {
    const timePressure = (ROUND_SECONDS - this.timeLeft) / 28;
    const alertPressure = this.scoreAlertTier() * 0.2;
    const stagePressure = this.currentStage().speedBonus * 1.2;
    return 1 + timePressure + alertPressure + stagePressure;
  }

  private scoreSpeedMultiplier() {
    const tier = this.scoreAlertTier();
    const stage = this.currentStage();
    return Math.min(MAX_ALERT_SPEED_MULTIPLIER, 1 + tier * 0.12 + stage.speedBonus);
  }

  private rewardMultiplier() {
    const tier = this.scoreAlertTier();
    const stage = this.currentStage();
    return Math.min(2.1, 1 + tier * 0.08 + stage.rewardBonus + (this.hasEvolution('autoRefund') ? 0.08 : 0));
  }

  private maybeAnnounceAlertTier() {
    const tier = this.scoreAlertTier();
    if (tier <= this.lastAnnouncedTier) {
      return;
    }

    this.lastAnnouncedTier = tier;
    this.bestAlertTierThisRun = Math.max(this.bestAlertTierThisRun, tier);
    const speed = this.scoreSpeedMultiplier().toFixed(2);
    this.popText(GAME_WIDTH / 2, 214, `월급 경보 ${tier}단계 · 속도 ${speed}x`, tier >= 4 ? '#ffccd5' : '#ffc857');
    this.cameras.main.flash(120, 255, 79, 100, false);
    this.dangerOverlay.setAlpha(0.22);
    this.tweens.add({
      targets: this.dangerOverlay,
      alpha: 0,
      duration: 360,
      ease: 'Cubic.easeOut',
    });
    this.cameras.main.shake(150 + Math.min(160, tier * 22), 0.005 + Math.min(0.008, tier * 0.0012));
    this.bridge.haptic(tier >= 3 ? 'wiggle' : 'softMedium');
    this.bridge.log('salary_alert', { tier, score: this.score, stage: this.currentStage().id, speed }, 'event');

    const extraHazards = Math.min(4, 1 + Math.floor(tier / 2));
    for (let index = 0; index < extraHazards; index += 1) {
      this.time.delayedCall(index * 110, () => this.spawnActor(this.pickHazardKind(), Phaser.Math.Between(42, GAME_WIDTH - 42)));
    }
  }

  private currentStage() {
    const selected = Phaser.Math.Clamp(this.save.selectedStage ?? 0, 0, Math.min(this.save.unlockedStage ?? 0, STAGES.length - 1));
    return STAGES[selected] ?? STAGES[0];
  }

  private normalizedBestByStage() {
    return STAGES.map((_, index) => Math.max(0, this.save.bestByStage?.[index] ?? 0));
  }

  private stageMenuLabel() {
    const stage = this.currentStage();
    const best = this.normalizedBestByStage()[stage.id - 1] ?? 0;
    return `STAGE ${stage.id} ${stage.name}\n목표 ${stage.targetScore.toLocaleString('ko-KR')} · 기록 ${best.toLocaleString('ko-KR')}`;
  }

  private stageHudLabel() {
    const stage = this.currentStage();
    const tier = this.scoreAlertTier();
    const targetLeft = Math.max(0, stage.targetScore - this.score);
    return `STAGE ${stage.id} · 경보 ${tier} · 목표까지 ${targetLeft.toLocaleString('ko-KR')}`;
  }

  private stageResultLabel(stage: StageDefinition) {
    if (this.resultUnlockedStage) {
      return `STAGE ${stage.id} 클리어 · 다음 스테이지 해금`;
    }

    if (this.resultStageCleared) {
      return `STAGE ${stage.id} 목표 달성`;
    }

    return `STAGE ${stage.id} 목표까지 ${Math.max(0, stage.targetScore - this.score).toLocaleString('ko-KR')}`;
  }

  private cycleStage() {
    if ((this.save.unlockedStage ?? 0) <= 0) {
      this.bridge.haptic('tap');
      this.popText(GAME_WIDTH / 2, 720, 'Stage 1 목표를 넘기면 다음 구간이 열립니다', '#ffc857');
      return;
    }

    this.save.selectedStage = (this.save.selectedStage + 1) % (this.save.unlockedStage + 1);
    this.persistSave();
    this.bridge.haptic('tap');
    this.bridge.log('stage_select', { stage: this.currentStage().id }, 'event');
    this.showMenu();
  }

  private hasEvolution(id: EvolutionId) {
    return this.activeEvolutions.has(id);
  }

  private evolutionPreview(upgradeId: UpgradeId) {
    const projected = { ...this.upgrades, [upgradeId]: this.upgrades[upgradeId] + 1 };
    return EVOLUTIONS.find((evolution) => !this.hasEvolution(evolution.id) && evolution.requires.every((required) => projected[required] > 0));
  }

  private maybeUnlockEvolutions() {
    for (const evolution of EVOLUTIONS) {
      if (this.hasEvolution(evolution.id) || evolution.requires.some((required) => this.upgrades[required] <= 0)) {
        continue;
      }

      this.activeEvolutions.add(evolution.id);
      this.bridge.haptic('confetti');
      this.shockwave(this.player.x, this.player.y - 28, PALETTE.green, 3);
      this.popText(this.player.x, this.player.y - 130, `EVO ${evolution.name}`, '#66ffc2');
      this.bridge.log('evolution_unlock', { id: evolution.id, name: evolution.name, score: this.score }, 'event');
    }
  }

  private freezeHazards() {
    for (const actor of this.actors) {
      if (!this.isHazard(actor.kind)) {
        continue;
      }

      actor.speed *= 0.38;
      actor.image.setTint(PALETTE.sky);
      this.tweens.add({
        targets: actor.image,
        alpha: 0.58,
        duration: 90,
        yoyo: true,
        repeat: 5,
        ease: 'Sine.easeInOut',
      });
    }

    this.popText(this.player.x, this.player.y - 120, '채무동결', '#9defff');
  }

  private pickUpgradeOptions(count: number) {
    const pool = [...UPGRADE_CARDS].sort(() => Math.random() - 0.5);
    return pool
      .sort((a, b) => this.upgrades[a.id] - this.upgrades[b.id] + (Math.random() - 0.5) * 0.4)
      .slice(0, count);
  }

  private upgradeTitle(id: UpgradeId) {
    return UPGRADE_CARDS.find((card) => card.id === id)?.title ?? id;
  }

  private upgradeStatusLabel() {
    const evolutions = EVOLUTIONS.filter((evolution) => this.hasEvolution(evolution.id))
      .map((evolution) => evolution.name)
      .slice(0, 2)
      .join(' · ');

    if (evolutions.length > 0) {
      return `진화 ${evolutions}`;
    }

    const active = UPGRADE_CARDS
      .filter((card) => this.upgrades[card.id] > 0)
      .map((card) => `${card.title} ${this.upgrades[card.id]}`)
      .slice(0, 2)
      .join(' · ');
    return active.length > 0 ? active : '가까이 피하면 각성 · 모으면 잔고 상승';
  }

  private currentSkin() {
    return SKINS[this.save.selectedSkin] ?? SKINS[0];
  }

  private nextLockedSkin() {
    return SKINS.find((skin) => this.save.best < skin.unlock);
  }

  private applyPlayerSkin() {
    const skin = this.currentSkin();
    this.playerShip?.setTint(skin.tint);
    this.playerGlow?.setFillStyle(skin.glow, 0.16);
  }

  private maxHp() {
    return 3 + (this.save.meta.vault >= 3 ? 1 : 0) + (this.save.meta.vault >= 5 ? 1 : 0);
  }

  private magnetRange() {
    return (this.feverMs > 0 ? 126 : 82) + this.upgrades.magnet * 24 + this.save.meta.magnet * 7 + (this.hasEvolution('autoRefund') ? 28 : 0);
  }

  private metaLevelLabel() {
    return `금고${this.save.meta.vault} 자석${this.save.meta.magnet} 행운${this.save.meta.luck}`;
  }

  private metaUpgradeCost() {
    const totalLevel = this.save.meta.vault + this.save.meta.magnet + this.save.meta.luck;
    return 90 + totalLevel * 70;
  }

  private buyMetaUpgrade() {
    const reopenGrowth = this.growthLayer != null;
    const cost = this.metaUpgradeCost();
    if (this.save.credits < cost) {
      this.bridge.haptic('error');
      this.popText(GAME_WIDTH / 2, 720, `월급코인 ${cost - this.save.credits} 부족`, '#ffccd5');
      this.bridge.log('meta_upgrade_blocked', { credits: this.save.credits, cost }, 'event');
      return;
    }

    const entries: MetaUpgradeKey[] = ['vault', 'magnet', 'luck'];
    const target = entries.sort((a, b) => this.save.meta[a] - this.save.meta[b])[0];
    if (this.save.meta[target] >= 5) {
      this.popText(GAME_WIDTH / 2, 720, '모든 강화가 충분히 올랐습니다', '#ffc857');
      return;
    }

    this.save.credits -= cost;
    this.save.meta[target] += 1;
    this.persistSave();
    this.bridge.haptic('success');
    this.bridge.log('meta_upgrade_buy', { target, level: this.save.meta[target], cost }, 'event');
    this.showMenu();
    if (reopenGrowth) {
      this.showGrowthPanel();
    }
  }

  private cycleSkin() {
    const reopenGrowth = this.growthLayer != null;
    const start = this.save.selectedSkin;
    for (let step = 1; step <= SKINS.length; step += 1) {
      const index = (start + step) % SKINS.length;
      if (this.save.best >= SKINS[index].unlock) {
        this.save.selectedSkin = index;
        this.persistSave();
        this.bridge.haptic('tap');
        this.bridge.log('skin_change', { skin: SKINS[index].name }, 'event');
        this.showMenu();
        if (reopenGrowth) {
          this.showGrowthPanel();
        }
        return;
      }
    }

    this.popText(GAME_WIDTH / 2, 720, '다음 스킨은 최고잔고를 더 올리면 열립니다', '#ffc857');
  }

  private calculateCreditsEarned() {
    return Math.max(12, Math.round(this.score / 820) + this.maxCombo + this.feverCount * 7 + this.nearMiss * 2 + this.bestAlertTierThisRun * 9 + this.currentStage().id * 4);
  }

  private percentileLabel() {
    if (this.score >= 300000) {
      return '상위 0.1% 후보';
    }
    if (this.score >= 200000) {
      return '상위 1% 후보';
    }
    if (this.score >= 120000) {
      return '상위 5% 후보';
    }
    if (this.score >= 50000) {
      return '상위 15% 후보';
    }
    return '상위 40% 도전권';
  }

  private nextGoalLabel() {
    const goals = [50000, 100000, 150000, 220000, 300000];
    const next = goals.find((goal) => this.score < goal);
    return next == null ? '최종 랭크 돌파' : `다음 목표 ${next.toLocaleString('ko-KR')}`;
  }

  private shockwave(x: number, y: number, color: number, rings: number) {
    for (let index = 0; index < rings; index += 1) {
      const ring = this.add.ellipse(x, y, 52, 52, color, 0);
      ring.setStrokeStyle(3, color, 0.52 - index * 0.1);
      ring.setDepth(17);
      ring.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: ring,
        scale: 2.4 + index * 0.52,
        alpha: 0,
        duration: 420 + index * 120,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    }
  }

  private applyGlow(target: Phaser.GameObjects.GameObject, color: number, alpha: number) {
    const postFx = (target as Phaser.GameObjects.GameObject & { postFX?: { addGlow?: (...args: unknown[]) => unknown } }).postFX;
    try {
      postFx?.addGlow?.(color, alpha, 0, false, 0.12, 12);
    } catch {
      // PostFX support depends on the active renderer; visuals should degrade, not crash.
    }
  }

  private unlockAudio() {
    if (this.audio != null) {
      return;
    }

    const typedWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
    const AudioCtor = typedWindow.AudioContext ?? typedWindow.webkitAudioContext;
    if (AudioCtor == null) {
      return;
    }

    this.audio = new AudioCtor();
  }

  private playTone(notes: number[], length: number) {
    if (this.audio == null || this.muted) {
      return;
    }

    const now = this.audio.currentTime;
    notes.forEach((note, index) => {
      const oscillator = this.audio?.createOscillator();
      const gain = this.audio?.createGain();

      if (oscillator == null || gain == null || this.audio == null) {
        return;
      }

      oscillator.type = 'triangle';
      oscillator.frequency.value = note;
      gain.gain.setValueAtTime(0.0001, now + index * length);
      gain.gain.exponentialRampToValueAtTime(0.04, now + index * length + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * length + length);
      oscillator.connect(gain);
      gain.connect(this.audio.destination);
      oscillator.start(now + index * length);
      oscillator.stop(now + index * length + length + 0.02);
    });
  }
}
