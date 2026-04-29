import * as Phaser from 'phaser';
import type { HapticType, TossBridge } from '../lib/tossBridge';
import {
  DAILY_MISSION_REWARD,
  achievementProgress,
  actorJuiceProfile,
  buildRetryHook,
  collectionProgress,
  comboRhythmProfile,
  evolutionHint,
  skillPressureProfile,
  upgradeChoiceIndexAt,
  upgradeChoicePresentation,
  firstRunAssistProfile,
  missionProgress,
  missionRewardState,
  nextRuntimeQuality,
  rareEventForRun,
  resultShareCopy,
  nearMissJuiceProfile,
  resolvePerformanceProfile,
  sfxThrottleAllows,
  shouldAutoDowngradeQuality,
  stageAlertTier,
  stageDifficulty,
  stageSpeedMultiplier,
  streakLoginReward,
  updateStreakState,
  weeklyMissionProgress,
  type PerformanceProfile,
  type VisualQuality,
} from './progression';

const GAME_WIDTH = 390;
const GAME_HEIGHT = 844;
const ROUND_SECONDS = 60;
const PLAYER_Y = 710;
const SAFE_TOP = 104;
const SAVE_KEY = 'salary-defense-save-v1';
const BUILD_VERSION = 'v15-upgrade-pressure';
const SCORE_TIER_SIZE = 50000;
const MAX_ALERT_TIER = 9;
const MAX_ALERT_SPEED_MULTIPLIER = 2.45;
const MAX_DIFFICULTY = 4.85;
const MAX_ACTOR_SPEED = 900;
const MAX_ACTORS = 38;
const MAX_FRAME_DELTA = 42;
const MASTER_VOLUME = 0.34;
const ORIGINAL_BGM_VOLUME = 0.56;
const ORIGINAL_BGM_RESUME_VOLUME = 0.5;
const TEST_BGM_VOLUME = 0.92;
const SFX_VOLUME_MULTIPLIER = 1.22;

type Phase = 'menu' | 'tutorial' | 'onboarding' | 'playing' | 'upgrade' | 'paused' | 'gameover';
type ActorKind =
  | 'shard'
  | 'hazard'
  | 'rent'
  | 'tax'
  | 'sub'
  | 'pulse'
  | 'coin'
  | 'boost'
  | 'magnetItem'
  | 'shieldItem'
  | 'autopilotItem'
  | 'freezeItem'
  | 'droneItem'
  | 'boosterItem';
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
  juiceScale: number;
  juiceAura: number;
  laneWobble: number;
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
  dailyRewardClaimedDate: string;
  audio: {
    musicEnabled: boolean;
    sfxEnabled: boolean;
    hapticEnabled: boolean;
  };
  adUses: {
    date: string;
    revive: number;
    doubleReward: number;
    headStart: number;
  };
  visualQuality: VisualQuality;
  achievements: Record<string, boolean>;
  streak: {
    lastLoginDate: string;
    current: number;
    best: number;
    rewardClaimedDate: string;
  };
  weekly: {
    weekKey: string;
    score: number;
    nearMiss: number;
    fever: number;
    plays: number;
    rewardClaimedWeek: string;
  };
  meta: Record<MetaUpgradeKey, number>;
};

type StageDefinition = {
  id: number;
  name: string;
  subtitle: string;
  targetScore: number;
  baseDifficulty: number;
  baseAlertTier: number;
  carryoverRatio: number;
  minStartSpeedMultiplier: number;
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
    baseDifficulty: 0,
    baseAlertTier: 0,
    carryoverRatio: 0,
    minStartSpeedMultiplier: 1,
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
    baseDifficulty: 0.45,
    baseAlertTier: 1,
    carryoverRatio: 0.55,
    minStartSpeedMultiplier: 1.18,
    speedBonus: 0.12,
    spawnBonus: 0.12,
    hazardBonus: 0.055,
    rewardBonus: 0.08,
    hazardWeights: { hazard: 1.45, rent: 0.55, tax: 0.55, sub: 0.25 },
  },
  {
    id: 3,
    name: '월세 고가도로',
    subtitle: '월세 운석의 흔들림이 커지고 보상 배율도 상승합니다',
    targetScore: 150000,
    baseDifficulty: 0.78,
    baseAlertTier: 2,
    carryoverRatio: 0.6,
    minStartSpeedMultiplier: 1.3,
    speedBonus: 0.18,
    spawnBonus: 0.18,
    hazardBonus: 0.08,
    rewardBonus: 0.14,
    hazardWeights: { hazard: 0.9, rent: 1.55, tax: 0.65, sub: 0.35 },
  },
  {
    id: 4,
    name: '구독 지옥',
    subtitle: '작고 빠른 구독료가 몰려오며 콤보 유지가 핵심입니다',
    targetScore: 220000,
    baseDifficulty: 1.05,
    baseAlertTier: 3,
    carryoverRatio: 0.62,
    minStartSpeedMultiplier: 1.42,
    speedBonus: 0.26,
    spawnBonus: 0.26,
    hazardBonus: 0.11,
    rewardBonus: 0.22,
    hazardWeights: { hazard: 0.8, rent: 0.8, tax: 0.75, sub: 1.65 },
  },
  {
    id: 5,
    name: '블랙카드 심연',
    subtitle: '모든 고정비가 폭주하는 최종 고득점 챌린지',
    targetScore: 300000,
    baseDifficulty: 1.28,
    baseAlertTier: 4,
    carryoverRatio: 0.64,
    minStartSpeedMultiplier: 1.55,
    speedBonus: 0.34,
    spawnBonus: 0.34,
    hazardBonus: 0.15,
    rewardBonus: 0.35,
    hazardWeights: { hazard: 1.2, rent: 1.15, tax: 1.1, sub: 1.05 },
  },
  {
    id: 6,
    name: '연말정산 코어',
    subtitle: '모든 맵 이벤트와 파워업이 섞이는 무한 챌린지',
    targetScore: 420000,
    baseDifficulty: 1.52,
    baseAlertTier: 5,
    carryoverRatio: 0.66,
    minStartSpeedMultiplier: 1.68,
    speedBonus: 0.44,
    spawnBonus: 0.44,
    hazardBonus: 0.2,
    rewardBonus: 0.48,
    hazardWeights: { hazard: 1.15, rent: 1.2, tax: 1.35, sub: 1.25 },
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
  dailyRewardClaimedDate: '',
  audio: { musicEnabled: true, sfxEnabled: true, hapticEnabled: true },
  adUses: { date: '', revive: 0, doubleReward: 0, headStart: 0 },
  visualQuality: 'auto',
  achievements: {},
  streak: { lastLoginDate: '', current: 0, best: 0, rewardClaimedDate: '' },
  weekly: { weekKey: '', score: 0, nearMiss: 0, fever: 0, plays: 0, rewardClaimedWeek: '' },
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
  { name: '월급루팡 금고', tint: 0xd9fff6, glow: 0x44d7a8, unlock: 70000 },
  { name: '칼퇴 금고', tint: 0xfff8d4, glow: 0xff8f3d, unlock: 110000 },
  { name: '부장님 카드 금고', tint: 0xffd7df, glow: 0xff4f64, unlock: 180000 },
  { name: '연말정산 금고', tint: 0xd4ebff, glow: 0x9defff, unlock: 280000 },
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
  private stageBackdrop!: Phaser.GameObjects.Graphics;
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
  private centerFeedbackText!: Phaser.GameObjects.Text;
  private centerComboLiveText!: Phaser.GameObjects.Text;
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
  private currentUpgradeOptions: UpgradeId[] = [];
  private pauseLayer?: Phaser.GameObjects.Container;
  private gameOverLayer?: Phaser.GameObjects.Container;
  private muteHudLabel?: Phaser.GameObjects.Text;
  private audio?: AudioContext;
  private masterGain?: GainNode;
  private originalBgm?: AudioBufferSourceNode;
  private originalBgmGain?: GainNode;
  private testBgm?: HTMLAudioElement;
  private testBgmActive = false;
  private muted = false;
  private musicEnabled = true;
  private sfxEnabled = true;
  private hapticEnabled = true;
  private pausedForBackground = false;
  private performanceProfile: PerformanceProfile = resolvePerformanceProfile({ saveQuality: 'auto' });
  private hudSnapshot = '';
  private hudLastUpdateMs = 0;
  private effectWindowStartedAt = 0;
  private effectCountInWindow = 0;
  private popTextPool: Phaser.GameObjects.Text[] = [];
  private sparkPool: Array<Phaser.GameObjects.Image | Phaser.GameObjects.Arc> = [];
  private rareEventTriggered?: string;
  private noHitRun = true;
  private resultPreviousBest = 0;
  private newAchievementNotices: Array<{ id: string; title: string; reward: number }> = [];
  private pendingStreakReward = 0;
  private fpsText?: Phaser.GameObjects.Text;
  private fpsAccumMs = 0;
  private fpsFrames = 0;
  private fpsValue = 60;
  private fpsMinValue = 60;
  private fpsLastLogMs = 0;
  private lowFpsSeconds = 0;
  private lastSfxAt: Record<string, number> = {};
  private roundStartPlays = 0;
  private firstRunMagnetGranted = false;
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
  private magnetMs = 0;
  private autopilotMs = 0;
  private freezeMs = 0;
  private droneMs = 0;
  private boosterMs = 0;
  private mapEventMs = 0;
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
    this.performanceProfile = this.detectPerformanceProfile();
    this.musicEnabled = this.save.audio.musicEnabled;
    this.sfxEnabled = this.save.audio.sfxEnabled;
    this.hapticEnabled = this.save.audio.hapticEnabled;
    this.muted = !this.musicEnabled && !this.sfxEnabled;
    this.installVisibilityHandlers();
    this.buildTextures();
    this.buildAnimations();
    this.buildWorld();
    this.buildHud();
    this.showMenu();
    this.parent.dataset.cometReady = 'ready';
    this.applyDebugScreen();
    this.bridge.identify().then(() => this.bridge.log('identify', { status: 'ready' }, 'info'));
    void this.bridge.preloadRewardAd?.('doubleReward');
    void this.bridge.preloadRewardAd?.('revive');
  }

  update(_time: number, delta: number) {
    this.updateFpsMeter(delta);
    const frameDelta = Math.min(delta, MAX_FRAME_DELTA);
    this.updateStars(frameDelta);

    if (this.phase !== 'playing') {
      this.updateCenterComboBadge();
      return;
    }

    this.timeLeft = Math.max(0, this.timeLeft - frameDelta / 1000);
    this.difficulty = this.effectiveDifficulty();
    this.spawnElapsed += frameDelta;
    this.feverMs = Math.max(0, this.feverMs - frameDelta);
    this.updatePowerItemTimers(frameDelta);
    this.arenaShake = Math.max(0, this.arenaShake - frameDelta);
    this.maybeTriggerExpenseStorm();
    this.maybeTriggerStageMapEvent();

    if (this.maybeTriggerUpgradeChoice()) {
      this.updateHud();
      return;
    }

    this.updateAutopilotTarget();
    this.updatePlayer(frameDelta);
    this.spawnLoop(frameDelta);
    this.updateActors(frameDelta);
    this.maybeAnnounceAlertTier();
    this.updateCombo(frameDelta);
    this.updateCenterComboBadge();
    this.maybeTriggerRareEvent();
    this.updateHud();

    if (this.timeLeft <= 0) {
      this.finishRound('timeout');
    }
  }

  private installVisibilityHandlers() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseAudioForBackground();
        if (this.phase === 'playing') {
          this.pausedForBackground = true;
          this.showPause();
        }
        this.bridge.log('app_background', { phase: this.phase }, 'event');
      } else {
        this.resumeAudioFromBackground();
        this.bridge.log('app_foreground', { pausedForBackground: this.pausedForBackground }, 'event');
      }
    });
  }

  private updateFpsMeter(delta: number) {
    const safeDelta = Math.max(1, delta);
    const instantFps = 1000 / safeDelta;
    this.fpsAccumMs += safeDelta;
    this.fpsFrames += 1;
    this.fpsMinValue = Math.min(this.fpsMinValue, instantFps);
    this.lowFpsSeconds = instantFps < 45 ? this.lowFpsSeconds + safeDelta / 1000 : Math.max(0, this.lowFpsSeconds - safeDelta / 1600);

    if (this.fpsAccumMs >= 500) {
      this.fpsValue = Math.round((this.fpsFrames * 1000) / this.fpsAccumMs);
      this.fpsText?.setText(`FPS ${this.fpsValue} · ${this.performanceProfile.quality}`);
      this.fpsText?.setColor(this.fpsValue < 45 ? '#ff5f6d' : this.fpsValue < 55 ? '#ffc857' : '#66ffc2');
      this.fpsAccumMs = 0;
      this.fpsFrames = 0;
    }

    if (shouldAutoDowngradeQuality({ saveQuality: this.save.visualQuality, lowFpsSeconds: this.lowFpsSeconds, quality: this.performanceProfile.quality })) {
      const nextQuality = nextRuntimeQuality(this.performanceProfile.quality);
      if (nextQuality !== this.performanceProfile.quality) {
        this.save.visualQuality = nextQuality;
        this.performanceProfile = { ...this.performanceProfile, quality: nextQuality };
        this.applyRuntimeQualityProfile();
        this.persistSave();
        this.lowFpsSeconds = 0;
        this.popText(GAME_WIDTH / 2, 166, '프레임 안정화 모드 적용', '#ffc857');
        this.bridge.log('fps_auto_quality_downgrade', { fps: this.fpsValue, minFps: Math.round(this.fpsMinValue), quality: nextQuality }, 'event');
      }
    }

    const now = this.time.now;
    if (now - this.fpsLastLogMs >= 10000) {
      this.fpsLastLogMs = now;
      this.bridge.log('fps_sample', { fps: this.fpsValue, minFps: Math.round(this.fpsMinValue), quality: this.performanceProfile.quality, actors: this.actors.length }, 'event');
      this.fpsMinValue = this.fpsValue;
    }
  }

  private applyRuntimeQualityProfile() {
    const targetAlpha = this.performanceProfile.quality === 'low' ? 0.22 : this.performanceProfile.quality === 'medium' ? 0.36 : 0.5;
    for (const star of this.stars) {
      star.setAlpha(Math.min(star.alpha, targetAlpha));
    }
    for (const line of this.speedLines) {
      line.setAlpha(Math.min(line.alpha, targetAlpha + 0.08));
    }
  }

  private pauseAudioForBackground() {
    if (this.originalBgmGain != null && this.audio != null) {
      this.originalBgmGain.gain.cancelScheduledValues(this.audio.currentTime);
      this.originalBgmGain.gain.setTargetAtTime(0, this.audio.currentTime, 0.03);
    }
    if (this.testBgm != null) {
      this.testBgm.pause();
    }
  }

  private resumeAudioFromBackground() {
    if (this.muted || !this.musicEnabled) return;
    if (this.originalBgmGain != null && this.audio != null) {
      this.originalBgmGain.gain.cancelScheduledValues(this.audio.currentTime);
      this.originalBgmGain.gain.setTargetAtTime(ORIGINAL_BGM_RESUME_VOLUME, this.audio.currentTime, 0.08);
    }
    if (this.testBgm != null && this.testBgmActive) {
      void this.testBgm.play().catch(() => undefined);
    }
  }

  private pauseAudioForAd() {
    this.pauseAudioForBackground();
  }

  private resumeAudioAfterAd() {
    this.resumeAudioFromBackground();
  }

  private async runRewardAd(reason: 'revive' | 'doubleReward' | 'headStart') {
    this.pauseAudioForAd();
    this.bridge.log('reward_ad_start', { reason }, 'event');
    try {
      const result = await this.bridge.showRewardAd(reason);
      this.bridge.log('reward_ad_result', { reason, status: result.status, rewarded: result.rewarded }, 'event');
      return result;
    } finally {
      this.resumeAudioAfterAd();
      void this.bridge.preloadRewardAd(reason);
    }
  }

  private haptic(type: HapticType) {
    if (!this.hapticEnabled) {
      return;
    }
    this.bridge.haptic(type);
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

    this.stageBackdrop = this.add.graphics();
    this.stageBackdrop.setDepth(0.1);
    this.renderStageBackdrop();

    for (let i = 0; i < this.performanceProfile.nebulaCount; i += 1) {
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

    for (let i = 0; i < this.performanceProfile.starCount; i += 1) {
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

    for (let i = 0; i < this.performanceProfile.speedLineCount; i += 1) {
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
      if (this.phase === 'upgrade') {
        this.handleUpgradePointer(pointer);
        return;
      }
      if (this.phase === 'playing' && pointer.y > SAFE_TOP + 44) {
        this.haptic('tap');
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

  private renderStageBackdrop() {
    if (this.stageBackdrop == null) {
      return;
    }

    const stage = this.currentStage().id;
    const colors = [
      { a: 0x00c2ff, b: 0x66ffc2, c: 0xffc857 },
      { a: 0xff4f64, b: 0xffc857, c: 0x8c72ff },
      { a: 0xff8f57, b: 0xff4f64, c: 0x9defff },
      { a: 0x8c72ff, b: 0x00c2ff, c: 0xff5f9f },
      { a: 0xff4f64, b: 0x8c72ff, c: 0xffc857 },
      { a: 0xffc857, b: 0x9defff, c: 0xff5f9f },
    ][Phaser.Math.Clamp(stage - 1, 0, 5)];

    this.stageBackdrop.clear();
    this.stageBackdrop.fillStyle(colors.a, 0.08);
    this.stageBackdrop.fillEllipse(76, 150, 420, 250);
    this.stageBackdrop.fillStyle(colors.b, 0.07);
    this.stageBackdrop.fillEllipse(328, 514, 300, 460);
    this.stageBackdrop.fillStyle(colors.c, 0.05);
    this.stageBackdrop.fillEllipse(180, 780, 420, 210);
    this.stageBackdrop.lineStyle(1, colors.b, stage >= 4 ? 0.12 : 0.07);

    const gap = stage >= 4 ? 42 : 58;
    for (let i = 0; i < 16; i += 1) {
      this.stageBackdrop.beginPath();
      this.stageBackdrop.moveTo(0, 90 + i * gap);
      this.stageBackdrop.lineTo(GAME_WIDTH, 72 + i * (gap - 4));
      this.stageBackdrop.strokePath();
    }
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

    this.centerFeedbackText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 72, '', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '22px',
      fontStyle: '900',
      color: '#fff4d8',
      stroke: '#001622',
      strokeThickness: 4,
      shadow: { color: '#001622', blur: 6, fill: true },
    });
    this.centerFeedbackText.setOrigin(0.5, 0.5);
    this.centerFeedbackText.setDepth(80);
    this.centerFeedbackText.setAlpha(0);
    this.hudObjects.push(this.centerFeedbackText);

    this.centerComboLiveText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 96, '', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '22px',
      fontStyle: '900',
      color: '#66ffc2',
      stroke: '#050816',
      strokeThickness: 5,
    });
    this.centerComboLiveText.setOrigin(0.5, 0.5);
    this.centerComboLiveText.setDepth(89);
    this.centerComboLiveText.setAlpha(0);
    this.hudObjects.push(this.centerComboLiveText);

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

    this.muteHudLabel = undefined;

    const pauseButton = this.createHudButton(GAME_WIDTH - 31, 106, 44, 44, 'Ⅱ', () => {
      this.showPause();
    });
    this.hudObjects.push(pauseButton.group);

    if (new URLSearchParams(window.location.search).get('fps') === '1') {
      this.fpsText = this.add.text(GAME_WIDTH - 18, 144, 'FPS 60', {
        align: 'right',
        fontFamily: 'Pretendard, sans-serif',
        fontSize: '11px',
        fontStyle: '900',
        color: '#66ffc2',
        backgroundColor: 'rgba(6, 19, 31, 0.68)',
        padding: { left: 8, right: 8, top: 3, bottom: 3 },
      });
      this.fpsText.setOrigin(1, 0);
      this.fpsText.setDepth(22);
      this.hudObjects.push(this.fpsText);
    }

    this.setGameplayVisible(false);
  }

  private showMenu() {
    this.phase = 'menu';
    this.renderStageBackdrop();
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
    const weekly = weeklyMissionProgress(this.save.weekly);
    const unlockedAchievementCount = Object.values(this.save.achievements).filter(Boolean).length;
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

    const legend = this.createMenuLegend(layout.bestY - 40, layout.compact);

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
    const mission = this.add.text(
      GAME_WIDTH / 2,
      layout.missionY,
      `${this.stageMenuLabel()}\n🔥 연속 ${this.save.streak.current}일 · 주간 ${weekly.completed}/${weekly.total} · 업적 ${unlockedAchievementCount}/5 · 부드러운 모드`,
      {
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
      this.haptic('tap');
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
      legend,
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

    if (this.pendingStreakReward > 0) {
      const reward = this.pendingStreakReward;
      this.pendingStreakReward = 0;
      this.time.delayedCall(380, () => {
        this.popText(GAME_WIDTH / 2, Math.max(140, layout.glassY - layout.glassHeight / 2 + 58), `연속 ${this.save.streak.current}일 출석 +${reward} 코인`, reward >= 500 ? '#ffc857' : '#66ffc2');
        this.haptic(reward >= 250 ? 'confetti' : 'success');
        this.playTone(reward >= 250 ? [659, 880, 1175, 1568] : [659, 880, 1175], 0.055, 0.1, 'triangle');
      });
    }

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

  private createMenuLegend(y: number, compact: boolean) {
    const group = this.add.container(GAME_WIDTH / 2, y);
    const items = [
      { icon: '💵', label: '먹으면 잔고', color: PALETTE.green },
      { icon: '💳', label: '맞으면 증발', color: PALETTE.red },
      { icon: '⚡', label: '스치면 각성', color: PALETTE.gold },
    ];

    items.forEach((item, index) => {
      const x = (index - 1) * (compact ? 94 : 102);
      const bg = this.add.rectangle(x, 0, compact ? 88 : 96, 38, 0x041522, 0.78);
      bg.setStrokeStyle(1, item.color, 0.34);
      const text = this.add.text(x, 0, `${item.icon} ${item.label}`, {
        align: 'center',
        fontFamily: 'Pretendard, sans-serif',
        fontSize: compact ? '10px' : '11px',
        fontStyle: '900',
        color: '#f8fbff',
      });
      text.setOrigin(0.5);
      this.fitText(text, compact ? 80 : 88, 8);
      group.add([bg, text]);
    });

    return group;
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
    const collection = this.createButton(GAME_WIDTH / 2, 600, 250, 46, '도감 / 업적', PALETTE.gold, () => {
      this.showCollectionPanel();
    });
    const close = this.createButton(GAME_WIDTH / 2, 658, 210, 44, '닫기', PALETTE.aqua, () => {
      this.growthLayer?.destroy();
      this.growthLayer = undefined;
    });

    const hint = this.add.text(GAME_WIDTH / 2, 714, '스킨·업적·스테이지 도감을 채우면 장기 목표가 열립니다', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '12px',
      color: '#7eb5c9',
      wordWrap: { width: 280, useAdvancedWrap: true },
    });
    hint.setOrigin(0.5);

    layer.add([overlay, card, glow, ship, title, credits, meta, next, progressBack, progressFill, upgrade, skin, collection, close, hint]);
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

  private showCollectionPanel() {
    const unlockedSkins = SKINS.filter((skin) => this.save.best >= skin.unlock).length;
    const achievements = Object.values(this.save.achievements).filter(Boolean).length;
    const stages = this.save.unlockedStage + 1;
    const evolutions = EVOLUTIONS.filter((evolution) => this.hasEvolution(evolution.id)).length;
    const collection = collectionProgress({ unlockedSkins, achievements, stages, evolutions });
    const weekly = weeklyMissionProgress(this.save.weekly);
    const layer = this.add.container(0, 0);
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x02070d, 0.76);
    const card = this.add.rectangle(GAME_WIDTH / 2, 428, 336, 596, 0x06131f, 0.98);
    card.setStrokeStyle(1, PALETTE.gold, 0.42);
    const title = this.add.text(GAME_WIDTH / 2, 164, '월급 방어 도감', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '27px',
      fontStyle: '900',
      color: '#f8fbff',
      shadow: { color: '#ffc857', blur: 16, fill: true },
    });
    title.setOrigin(0.5);
    const summary = this.add.text(GAME_WIDTH / 2, 212, collection.summary, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '14px',
      fontStyle: '900',
      color: '#ffc857',
      wordWrap: { width: 284, useAdvancedWrap: true },
    });
    summary.setOrigin(0.5);
    const rows = [
      `🏦 스킨 ${unlockedSkins}/${SKINS.length}: ${this.currentSkin().name}`,
      `🏆 업적 ${achievements}/5: 첫 5만·아슬회피·콤보·클리어·무피격`,
      `🪐 스테이지 ${stages}/${STAGES.length}: ${this.currentStage().name}`,
      `🧬 EVO ${evolutions}/${EVOLUTIONS.length}: ${EVOLUTIONS.map((evolution) => evolution.name).join(' / ')}`,
      `📅 주간미션 ${weekly.completed}/${weekly.total}: ${weekly.goals.map((goal) => `${goal.done ? '✓' : '·'}${goal.label}`).join('  ')}`,
      `🔥 연속접속 ${this.save.streak.current}일 · 최고 ${this.save.streak.best}일`,
    ];
    const body = this.add.text(GAME_WIDTH / 2, 380, rows.join('\n\n'), {
      align: 'left',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '12px',
      color: '#dff8ff',
      lineSpacing: 5,
      wordWrap: { width: 286, useAdvancedWrap: true },
    });
    body.setOrigin(0.5);
    const close = this.createButton(GAME_WIDTH / 2, 680, 210, 46, '성장으로 돌아가기', PALETTE.aqua, () => {
      layer.destroy();
    });
    layer.add([overlay, card, title, summary, body, close]);
    layer.setDepth(62);
    layer.setAlpha(0);
    this.tweens.add({ targets: layer, alpha: 1, duration: 180, ease: 'Cubic.easeOut' });
    this.bridge.log('screen_collection', { percent: collection.percent, achievements }, 'screen');
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
    const progress = this.add.text(46, 58, step >= 7 ? '완료' : `${step + 1}/8`, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '13px',
      fontStyle: '900',
      color: '#07131f',
      backgroundColor: step >= 7 ? '#66ffc2' : '#ffc857',
      padding: { left: 10, right: 10, top: 5, bottom: 5 },
    });
    progress.setOrigin(0, 0.5);

    const titleCopy = [
      '금고를 직접 움직여보세요',
      '먹을 것과 피할 것을 먼저 볼게요',
      '파워업은 시간제로 작동합니다',
      '현금봉투를 눌러 수집하세요',
      '빨간 고지서는 피하세요',
      '가까이 피하면 각성합니다',
      '업그레이드는 레벨이 쌓입니다',
      '준비 완료',
    ][step] ?? '준비 완료';
    const bodyCopy = [
      '아래 금고를 좌우로 드래그하면 이동합니다.',
      '초록/금색 보상은 먹고, 빨간 고지서는 피하세요.',
      '같은 파워업을 또 먹으면 남은 시간이 누적됩니다.',
      '좋은 보상은 반짝입니다. 먹으면 잔고와 콤보가 오릅니다.',
      '오른쪽 안전 구역을 눌러 충돌을 피하세요.',
      '너무 멀리 피하지 말고 안전선 근처를 눌러보세요.',
      '같은 카드를 다시 고르면 레벨이 올라 효과가 강해집니다.',
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

    const skip = this.createButton(GAME_WIDTH / 2, 784, 166, 44, step >= 7 ? '시작하기' : '건너뛰기', step >= 7 ? PALETTE.aqua : PALETTE.gold, () => {
      this.completeOnboarding();
    });

    layer.add([overlay, card, progress, title, body, skip]);

    if (step === 0) {
      this.renderOnboardingDrag(layer);
    } else if (step === 1) {
      this.renderOnboardingLegend(layer);
    } else if (step === 2) {
      this.renderOnboardingPowerItems(layer);
    } else if (step === 3) {
      this.renderOnboardingCollect(layer);
    } else if (step === 4) {
      this.renderOnboardingDodge(layer);
    } else if (step === 5) {
      this.renderOnboardingNearMiss(layer);
    } else if (step === 6) {
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
    const cashZone = this.add.zone(GAME_WIDTH / 2, 442, 150, 150).setInteractive();
    const collectCash = () => {
      this.haptic('success');
      this.playTone([659, 880, 1175], 0.045, 0.085, 'triangle');
      this.burst(cash.x, cash.y, PALETTE.green, 16);
      this.popText(cash.x, cash.y - 44, '+현금', '#66ffc2');
      this.advanceOnboarding(260);
    };
    cash.on('pointerdown', collectCash);
    cashZone.on('pointerdown', collectCash);
    layer.add([ring, cash, hint, hand, cashZone]);
  }

  private renderOnboardingLegend(layer: Phaser.GameObjects.Container) {
    const board = this.add.rectangle(GAME_WIDTH / 2, 530, 328, 472, 0x06131f, 0.72);
    board.setStrokeStyle(1, PALETTE.aqua, 0.32);
    const goodTitle = this.add.text(GAME_WIDTH / 2, 330, '먹으면 좋은 것', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '19px',
      fontStyle: '900',
      color: '#66ffc2',
    }).setOrigin(0.5);
    const badTitle = this.add.text(GAME_WIDTH / 2, 552, '피해야 하는 고지서', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '19px',
      fontStyle: '900',
      color: '#ffccd5',
    }).setOrigin(0.5);

    const good = [
      { key: 'shard', anim: 'cash-float', label: '현금봉투', desc: '잔고/콤보 상승' },
      { key: 'coin', anim: 'coin-shine', label: '월급코인', desc: '성장 재화' },
      { key: 'boost', anim: 'coupon-pop', label: '시간쿠폰', desc: '남은 시간 회복' },
      { key: 'pulse', anim: 'payday-pulse', label: 'PAYDAY', desc: '월급각성 시작' },
    ];
    const bad = [
      { key: 'hazard', anim: 'debt-spin', label: '카드값', desc: '피하기' },
      { key: 'rent', anim: 'rent-spin', label: '월세', desc: '피하기' },
      { key: 'tax', anim: 'tax-spin', label: '세금', desc: '피하기' },
      { key: 'sub', anim: 'sub-spin', label: '구독료', desc: '피하기' },
    ];

    const entries: Phaser.GameObjects.GameObject[] = [board, goodTitle, badTitle];
    good.forEach((item, index) => {
      entries.push(...this.createOnboardingLegendItem(82 + index * 75, 414, item.key, item.anim, item.label, item.desc, PALETTE.green));
    });
    bad.forEach((item, index) => {
      entries.push(...this.createOnboardingLegendItem(82 + index * 75, 638, item.key, item.anim, item.label, item.desc, PALETTE.red));
    });

    const next = this.createButton(GAME_WIDTH / 2, 720, 222, 50, '알겠어요', PALETTE.aqua, () => {
      this.advanceOnboarding(180);
    });
    layer.add([...entries, next]);
  }

  private createOnboardingLegendItem(x: number, y: number, key: string, anim: string, label: string, desc: string, color: number) {
    const tile = this.add.rectangle(x, y, 68, 128, 0x082234, 0.94);
    tile.setStrokeStyle(1, color, 0.42);
    const sprite = this.add.sprite(x, y - 30, key).setScale(0.62).play(anim);
    const name = this.add.text(x, y + 12, label, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '11px',
      fontStyle: '900',
      color: '#f8fbff',
    }).setOrigin(0.5);
    this.fitText(name, 58, 8);
    const body = this.add.text(x, y + 38, desc, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '9px',
      fontStyle: '800',
      color: '#b8d9e7',
      wordWrap: { width: 58, useAdvancedWrap: true },
    }).setOrigin(0.5);
    return [tile, sprite, name, body];
  }

  private renderOnboardingPowerItems(layer: Phaser.GameObjects.Container) {
    const board = this.add.rectangle(GAME_WIDTH / 2, 532, 330, 420, 0x06131f, 0.72);
    board.setStrokeStyle(1, PALETTE.violet, 0.36);
    const title = this.add.text(GAME_WIDTH / 2, 338, '중복 획득 = 지속시간 누적', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '18px',
      fontStyle: '900',
      color: '#cfc4ff',
    }).setOrigin(0.5);
    const items = [
      { key: 'magnetItem', anim: 'salary-magnet', label: '급여자석', desc: '보상 흡입' },
      { key: 'autopilotItem', anim: 'auto-pilot', label: '오토파일럿', desc: '자동 회피' },
      { key: 'shieldItem', anim: 'insurance-shield', label: '파산보험', desc: '1회 방어' },
      { key: 'freezeItem', anim: 'debt-freeze', label: '채무동결', desc: '고지서 감속' },
      { key: 'droneItem', anim: 'finance-drone', label: '드론', desc: '근접 요격' },
      { key: 'boosterItem', anim: 'salary-boost', label: '부스터', desc: '돌파 질주' },
    ];
    const entries: Phaser.GameObjects.GameObject[] = [board, title];
    items.forEach((item, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      entries.push(...this.createOnboardingLegendItem(104 + col * 92, 430 + row * 138, item.key, item.anim, item.label, item.desc, index === 1 || index === 2 ? PALETTE.violet : PALETTE.green));
    });
    const note = this.add.text(GAME_WIDTH / 2, 680, 'HUD에 남은 초가 표시되고, 다시 먹으면 최대치까지 더해집니다.', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '12px',
      fontStyle: '900',
      color: '#bde6f4',
      wordWrap: { width: 286, useAdvancedWrap: true },
    }).setOrigin(0.5);
    const next = this.createButton(GAME_WIDTH / 2, 730, 222, 50, '알겠어요', PALETTE.aqua, () => {
      this.advanceOnboarding(180);
    });
    layer.add([...entries, note, next]);
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
      this.haptic('tap');
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
      this.haptic('softMedium');
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
        this.haptic('success');
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
    const ring = this.add.ellipse(0, 0, 48, 48, PALETTE.aqua, 0);
    ring.setStrokeStyle(2, PALETTE.aqua, 0.62);

    const glow = this.add.circle(0, 0, 20, PALETTE.aqua, 0.16);
    glow.setBlendMode(Phaser.BlendModes.ADD);

    const pointer = this.add.graphics();
    pointer.fillStyle(PALETTE.white, 0.96);
    pointer.lineStyle(1.5, PALETTE.aqua, 0.46);
    pointer.fillRoundedRect(-6, -34, 12, 42, 7);
    pointer.strokeRoundedRect(-6, -34, 12, 42, 7);
    pointer.fillStyle(0xdff9ff, 0.98);
    pointer.fillCircle(0, -35, 8);
    pointer.lineStyle(1.5, PALETTE.white, 0.8);
    pointer.strokeCircle(0, -35, 8);
    pointer.fillStyle(PALETTE.white, 0.92);
    pointer.fillCircle(0, 5, 17);
    pointer.fillStyle(0xdff9ff, 0.9);
    pointer.fillCircle(-6, 0, 4);

    const sparkle = this.add.image(15, -42, 'spark').setScale(0.34).setTint(PALETTE.aqua).setAlpha(0.72);
    sparkle.setBlendMode(Phaser.BlendModes.ADD);
    group.add([ring, glow, pointer, sparkle]);

    this.tweens.add({
      targets: ring,
      scale: 1.34,
      alpha: 0.08,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: sparkle,
      alpha: 0.18,
      angle: 34,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
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
      this.haptic('tap');
    }

    if (pointer.isDown || kind === 'down') {
      const x = Phaser.Math.Clamp(pointer.x, 72, GAME_WIDTH - 72);
      this.onboardingDemoShip?.setX(x);

      if (Math.abs(x - this.onboardingDragStartX) > 88) {
        this.haptic('success');
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
    this.renderStageBackdrop();
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
    this.resultPreviousBest = this.save.best;
    this.roundStartPlays = this.save.plays;
    this.firstRunMagnetGranted = false;
    this.rareEventTriggered = undefined;
    this.noHitRun = true;
    this.hudSnapshot = '';
    this.hudLastUpdateMs = 0;
    this.effectWindowStartedAt = 0;
    this.effectCountInWindow = 0;
    this.resultStageIndex = this.save.selectedStage;
    this.resultStageCleared = false;
    this.resultUnlockedStage = false;
    this.hp = this.maxHp();
    if (firstRunAssistProfile(this.roundStartPlays, 0).freeShield) {
      this.upgrades.shield = Math.max(this.upgrades.shield, 1);
    }
    this.timeLeft = ROUND_SECONDS;
    this.targetX = GAME_WIDTH / 2;
    this.spawnElapsed = 0;
    this.difficulty = 1;
    this.lastAnnouncedTier = 0;
    this.bestAlertTierThisRun = 0;
    this.feverMs = 0;
    this.magnetMs = 0;
    this.autopilotMs = 0;
    this.freezeMs = 0;
    this.droneMs = 0;
    this.boosterMs = 0;
    this.mapEventMs = 0;
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
    this.haptic('success');
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
    this.musicEnabled = !this.muted;
    this.sfxEnabled = !this.muted;
    this.save.audio.musicEnabled = this.musicEnabled;
    this.save.audio.sfxEnabled = this.sfxEnabled;
    this.save.audio.hapticEnabled = this.hapticEnabled;
    this.persistSave();
    if (this.testBgm != null) {
      this.testBgm.muted = this.muted;
    }
    if (this.originalBgmGain != null && this.audio != null) {
      this.originalBgmGain.gain.setTargetAtTime(this.muted || this.testBgmActive ? 0 : ORIGINAL_BGM_VOLUME, this.audio.currentTime, 0.035);
    }
    if (!this.muted) {
      this.unlockAudio();
      this.playTone([523, 659, 784], 0.045, 0.08, 'triangle');
    }
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
    this.setGameplayVisible(false);
    this.upgradeLayer?.destroy();
    this.upgradeLayer = undefined;

    const options = this.pickUpgradeOptions(3);
    this.currentUpgradeOptions = options.map((option) => option.id);
    const layout = upgradeChoicePresentation(GAME_HEIGHT);
    const layer = this.add.container(0, 0);
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x02070d, layout.overlayAlpha);
    overlay.setInteractive();
    const topChip = this.add.rectangle(GAME_WIDTH / 2, 74, 250, 34, 0x06131f, 0.86);
    topChip.setStrokeStyle(1, PALETTE.aqua, 0.22);
    const topText = this.add.text(
      GAME_WIDTH / 2,
      74,
      `현재 ${this.score.toLocaleString('ko-KR')} · 남은 ${this.timeLeft.toFixed(1)}초 · STAGE ${this.currentStage().id}`,
      {
        align: 'center',
        fontFamily: 'Pretendard, sans-serif',
        fontSize: '11px',
        fontStyle: '900',
        color: '#bde6f4',
      },
    );
    topText.setOrigin(0.5);
    const headline = this.add.text(GAME_WIDTH / 2, layout.titleY, '월급 생존 선택', {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '30px',
      fontStyle: '900',
      color: '#f8fbff',
      shadow: { color: '#00c2ff', blur: 18, fill: true },
    });
    headline.setOrigin(0.5);

    const sub = this.add.text(GAME_WIDTH / 2, layout.subtitleY, `${threshold}초 구간 돌파 · 이번 판 빌드를 고르세요`, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '13px',
      fontStyle: '900',
      color: '#bde6f4',
    });
    sub.setOrigin(0.5);

    const cards = options.map((option, index) => this.createUpgradeCard(layout.cardStartY + index * layout.cardGap, option, layout));
    layer.add([overlay, topChip, topText, headline, sub, ...cards]);
    layer.setDepth(layout.layerDepth);
    layer.setAlpha(0);
    this.upgradeLayer = layer;

    this.tweens.add({
      targets: layer,
      alpha: 1,
      duration: 180,
      ease: 'Cubic.easeOut',
    });

    this.haptic('softMedium');
    this.bridge.log('upgrade_open', { threshold, options: options.map((option) => option.id).join(',') }, 'event');
  }

  private handleUpgradePointer(pointer: Phaser.Input.Pointer) {
    const layout = upgradeChoicePresentation(GAME_HEIGHT);
    const index = upgradeChoiceIndexAt(layout, pointer.x, pointer.y, this.currentUpgradeOptions.length, GAME_WIDTH);
    const id = index >= 0 ? this.currentUpgradeOptions[index] : undefined;
    if (id != null) {
      this.chooseUpgrade(id);
    }
  }

  private createUpgradeCard(y: number, option: (typeof UPGRADE_CARDS)[number], layout: ReturnType<typeof upgradeChoicePresentation>) {
    const evolutionPreview = this.evolutionPreview(option.id);
    const group = this.add.container(GAME_WIDTH / 2, y + layout.cardHeight / 2);
    const bg = this.add.rectangle(0, 0, layout.cardWidth, layout.cardHeight, 0x082234, 0.96);
    bg.setStrokeStyle(2, evolutionPreview != null ? PALETTE.green : option.color, evolutionPreview != null ? 0.72 : 0.45);
    const glow = this.add.rectangle(0, 0, layout.cardWidth, layout.cardHeight, evolutionPreview != null ? PALETTE.green : option.color, evolutionPreview != null ? 0.11 : 0.05);
    const hit = this.add.rectangle(0, 0, layout.cardWidth + 8, layout.cardHeight + 8, 0xffffff, 0.001);
    hit.setDepth(20);
    hit.setInteractive({ useHandCursor: true });
    const left = -layout.cardWidth / 2;
    const icon = this.add.circle(left + 34, -20, 21, option.color, 0.96);
    const iconText = this.add.text(left + 34, -20, String(this.upgrades[option.id] + 1), {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '18px',
      fontStyle: '900',
      color: option.color === PALETTE.gold ? '#1a1720' : '#041522',
    });
    iconText.setOrigin(0.5);
    const title = this.add.text(left + 76, -30, option.title, {
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '20px',
      fontStyle: '900',
      color: '#f8fbff',
    });
    title.setOrigin(0, 0.5);
    this.fitText(title, layout.cardWidth - 126, 14);
    const subtitle = this.add.text(left + 76, 3, option.subtitle, {
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '12px',
      lineSpacing: 3,
      color: '#b8d9e7',
      wordWrap: { width: layout.cardWidth - 116, useAdvancedWrap: true },
    });
    subtitle.setOrigin(0, 0.5);
    this.fitText(subtitle, layout.cardWidth - 116, 10);
    const current = this.add.text(layout.cardWidth / 2 - 22, layout.cardHeight / 2 - 21, evolutionPreview == null ? (evolutionHint(option.id, this.upgrades) ?? `Lv.${this.upgrades[option.id]}`) : `EVO ${evolutionPreview.name}`, {
      align: 'right',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '12px',
      fontStyle: '900',
      color: evolutionPreview == null ? '#ffc857' : '#66ffc2',
    });
    current.setOrigin(1, 0.5);
    this.fitText(current, 132, 9);
    const choose = () => {
      this.chooseUpgrade(option.id);
    };
    hit.on('pointerdown', choose);
    group.add([glow, bg, icon, iconText, title, subtitle, current, hit]);
    group.setSize(layout.cardWidth, layout.cardHeight);
    group.setInteractive(new Phaser.Geom.Rectangle(-layout.cardWidth / 2, -layout.cardHeight / 2, layout.cardWidth, layout.cardHeight), Phaser.Geom.Rectangle.Contains);
    group.on('pointerdown', choose);

    return group;
  }

  private chooseUpgrade(id: UpgradeId) {
    if (this.phase !== 'upgrade') {
      return;
    }

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
    this.currentUpgradeOptions = [];
    this.phase = 'playing';
    this.setGameplayVisible(true);
    this.haptic('success');
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
    this.haptic('wiggle');
    this.bridge.log('expense_storm', { threshold: next, label }, 'event');

    for (let i = 0; i < 5; i += 1) {
      this.time.delayedCall(i * 115, () => {
        const x = 46 + i * 74 + Phaser.Math.Between(-12, 12);
        this.spawnActor(kinds[i % kinds.length], Phaser.Math.Clamp(x, 36, GAME_WIDTH - 36));
      });
    }
  }

  private maybeTriggerStageMapEvent() {
    if (this.mapEventMs > 0 || this.phase !== 'playing') {
      return;
    }

    const stage = this.currentStage().id;
    const elapsed = ROUND_SECONDS - this.timeLeft;
    if (elapsed < 8 || Math.random() > 0.012 + stage * 0.002) {
      return;
    }

    this.mapEventMs = 7200;
    const center = Phaser.Math.Between(82, GAME_WIDTH - 82);
    const label =
      stage === 1
        ? '골목 보너스 라인'
        : stage === 2
          ? '카드값 터널 급가속'
          : stage === 3
            ? '월세 운석 낙하'
            : stage === 4
              ? '구독료 네온 웨이브'
              : '연말정산 코어 폭주';

    this.popText(GAME_WIDTH / 2, 188, label, stage >= 4 ? '#ffccd5' : '#9defff');
    this.bridge.log('stage_map_event', { stage, label, score: this.score }, 'event');

    for (let index = 0; index < 5; index += 1) {
      this.time.delayedCall(index * 130, () => {
        const offset = (index - 2) * 52;
        const x = Phaser.Math.Clamp(center + offset, 34, GAME_WIDTH - 34);
        if (stage === 1) {
          this.spawnActor(index === 2 ? 'magnetItem' : 'shard', x);
        } else if (stage === 2) {
          this.spawnActor(index % 2 === 0 ? 'hazard' : 'boosterItem', x);
        } else if (stage === 3) {
          this.spawnActor(index === 2 ? 'shieldItem' : 'rent', x);
        } else if (stage === 4) {
          this.spawnActor(index % 2 === 0 ? 'sub' : 'autopilotItem', x);
        } else {
          this.spawnActor(index === 1 ? 'droneItem' : index === 3 ? 'freezeItem' : this.pickHazardKind(), x);
        }
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
    this.haptic(reason === 'crash' ? 'error' : 'confetti');

    const oldBest = this.save.best;
    const isRecord = this.score > oldBest;
    const stageIndex = this.save.selectedStage;
    const stage = STAGES[stageIndex] ?? STAGES[0];
    this.resultStageIndex = stageIndex;
    this.resultStageCleared = this.score >= stage.targetScore;
    this.resultUnlockedStage = false;
    this.resultCredits = Math.max(this.calculateCreditsEarned(), firstRunAssistProfile(this.roundStartPlays, ROUND_SECONDS - this.timeLeft).minCredits);
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
    this.save.weekly.score += this.score;
    this.save.weekly.nearMiss += this.nearMiss;
    this.save.weekly.fever += this.feverCount;
    this.save.weekly.plays += 1;
    const unlockedAchievements = this.claimRunAchievements();
    this.newAchievementNotices = unlockedAchievements.map((achievement) => ({ id: achievement.id, title: achievement.title, reward: achievement.reward }));
    if (unlockedAchievements.length > 0) {
      const achievementCredits = unlockedAchievements.reduce((sum, achievement) => sum + achievement.reward, 0);
      this.save.credits += achievementCredits;
      this.resultCredits += achievementCredits;
      this.bridge.log('achievement_unlock', { ids: unlockedAchievements.map((achievement) => achievement.id).join(','), reward: achievementCredits }, 'event');
    }
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
      `하이라이트 · 콤보 ${this.maxCombo} · 아슬회피 ${this.nearMiss} · 각성 ${this.feverCount}회`,
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

    const missionStatus = missionProgress({ shards: this.save.daily.shards, nearMiss: this.save.daily.nearMiss, maxCombo: this.save.daily.maxCombo });
    const weeklyStatus = weeklyMissionProgress(this.save.weekly);
    const weeklyClaimable = weeklyStatus.completed >= weeklyStatus.total && this.save.weekly.rewardClaimedWeek !== this.save.weekly.weekKey;
    const achievementLine = this.newAchievementNotices.length > 0
      ? `신규 업적 ${this.newAchievementNotices.map((achievement) => achievement.title).slice(0, 2).join(' · ')} +${this.newAchievementNotices.reduce((sum, achievement) => sum + achievement.reward, 0)}`
      : `업적 ${Object.values(this.save.achievements).filter(Boolean).length}/5`;
    const retryHook = buildRetryHook({
      resultUnlockedStage: this.resultUnlockedStage,
      score: this.score,
      previousBest: this.resultPreviousBest,
      nextSkin: this.nextLockedSkin(),
      stageTarget: resultStage.targetScore,
      missionRemaining: missionStatus.total - missionStatus.completed,
      credits: this.save.credits,
      nextMetaCost: this.metaUpgradeCost(),
    });
    const percentile = this.add.text(GAME_WIDTH / 2, 462, `${this.stageResultLabel(resultStage)} · ${retryHook}`, {
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

    const mission = this.add.text(GAME_WIDTH / 2, 535, `${this.dailyMissionLabel()}\n주간 ${weeklyStatus.completed}/4${weeklyClaimable ? ' · 보상 대기' : ''} · ${achievementLine} · 연속 ${this.save.streak.current}일`, {
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '12px',
      color: '#ffc857',
      lineSpacing: 4,
    });
    mission.setOrigin(0.5);
    this.fitText(mission, 292, 9);

    const rewardState = missionRewardState(
      { shards: this.save.daily.shards, nearMiss: this.save.daily.nearMiss, maxCombo: this.save.daily.maxCombo },
      this.save.dailyRewardClaimedDate === this.save.dailyDate,
    );

    const retry = this.createButton(GAME_WIDTH / 2, 612, 288, 58, `${retryHook} · 재도전`, PALETTE.aqua, () => {
      layer.destroy();
      this.gameOverLayer = undefined;
      this.startRound();
    });

    const claim = this.createButton(124, 673, 138, 44, rewardState.claimable ? `미션 +${DAILY_MISSION_REWARD}` : rewardState.complete ? '미션 완료' : `${missionStatus.completed}/3 미션`, rewardState.claimable ? PALETTE.green : PALETTE.violet, () => {
      this.claimDailyMissionReward();
      layer.destroy();
      this.gameOverLayer = undefined;
      this.showGameOver(isRecord, reason);
    });

    const doubleReward = this.createButton(266, 673, 138, 44, weeklyClaimable ? '주간 +900' : '광고 2배', weeklyClaimable ? PALETTE.green : PALETTE.gold, () => {
      if (weeklyClaimable) {
        this.claimWeeklyMissionReward();
        layer.destroy();
        this.gameOverLayer = undefined;
        this.showGameOver(isRecord, reason);
        return;
      }
      void this.tryDoubleRewardAd();
    });

    const share = this.createButton(124, 725, 138, 44, '결과 공유', PALETTE.green, () => {
      void this.shareResultCard();
    });

    const board = this.createButton(266, 725, 138, 44, '랭킹 확인', PALETTE.gold, () => {
      this.haptic('tap');
      void this.bridge.openLeaderboard();
    });

    const menu = this.createButton(GAME_WIDTH / 2, 779, 180, 44, '메뉴', PALETTE.violet, () => {
      layer.destroy();
      this.gameOverLayer = undefined;
      this.showMenu();
    });

    layer.add([overlay, card, halo, title, score, detail, rank, percentile, credit, mission, retry, claim, doubleReward, share, board, menu]);
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
      const step = Number.parseInt(params.get('step') ?? '0', 10);
      if (Number.isFinite(step)) {
        this.onboardingStep = Phaser.Math.Clamp(step, 0, 7);
        this.renderOnboardingStep();
      }
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
      if ('setVisible' in object && typeof object.setVisible === 'function') {
        object.setVisible(visible);
      }
    }

    if (!visible && this.dangerOverlay != null) {
      this.dangerOverlay.setAlpha(0);
    }
  }

  private spawnLoop(delta: number) {
    if (this.actors.length >= MAX_ACTORS) {
      return;
    }

    const clutch = this.timeLeft <= 10;
    const stage = this.currentStage();
    const tier = this.scoreAlertTier();
    const elapsedSeconds = ROUND_SECONDS - this.timeLeft;
    const pressure = skillPressureProfile({ stageId: stage.id, combo: this.combo, hp: this.hp, elapsedSeconds, score: this.score });
    const startCompression = stage.id >= 2 && elapsedSeconds < 12 ? stage.baseDifficulty * 28 : 0;
    const interval = Math.max(
      clutch ? 120 : 170,
      625 - this.difficulty * 112 - tier * 29 - stage.spawnBonus * 210 - startCompression - pressure.spawnReductionMs - (this.feverMs > 0 ? 90 : 0) - (clutch ? 115 : 0),
    );

    if (this.spawnElapsed < interval) {
      return;
    }

    this.spawnElapsed = 0;
    const assist = firstRunAssistProfile(this.roundStartPlays, elapsedSeconds);
    if (assist.guaranteeMagnet && !this.firstRunMagnetGranted) {
      this.firstRunMagnetGranted = true;
      this.spawnActor('magnetItem', this.player.x);
      this.bridge.log('first_run_assist_magnet', { elapsedSeconds: Math.round(elapsedSeconds * 10) / 10 }, 'event');
      return;
    }

    const roll = Math.random();
    const hazardChance = Phaser.Math.Clamp(
      (0.12 + this.difficulty * 0.022 + tier * 0.033 + stage.hazardBonus + pressure.hazardBonus + (clutch ? 0.045 : 0)) * assist.hazardMultiplier,
      0.08,
      0.56,
    );
    const pulseChance = hazardChance + (clutch ? 0.055 : 0.075);
    const powerChance = pulseChance + this.stagePowerItemChance();
    const boostChance = powerChance + (this.hp <= 1 ? 0.1 : 0.06);

    if (roll < hazardChance) {
      this.spawnActor(this.pickHazardKind());
    } else if (roll < pulseChance) {
      this.spawnActor('pulse');
    } else if (roll < powerChance) {
      this.spawnActor(this.pickStagePowerItem());
    } else if (roll < boostChance) {
      this.spawnActor('boost');
    } else if (roll > (clutch ? 0.86 : 0.91)) {
      this.spawnActor('coin');
    } else {
      this.spawnActor('shard');
    }

    if (this.actors.length < MAX_ACTORS - 1 && Math.random() < 0.18 + this.difficulty * 0.03 + tier * 0.016 + stage.spawnBonus * 0.5 + pressure.doubleSpawnBonus) {
      this.time.delayedCall(130, () => {
        if (this.phase === 'playing' && this.actors.length < MAX_ACTORS) {
          this.spawnActor(Math.random() < 0.34 ? this.pickHazardKind() : Math.random() < 0.28 ? this.pickStagePowerItem() : 'shard');
        }
      });
    }

    void delta;
  }

  private maybeTriggerRareEvent() {
    if (this.rareEventTriggered != null) {
      return;
    }

    const elapsedSeconds = ROUND_SECONDS - this.timeLeft;
    const event = rareEventForRun({
      plays: this.save.plays + 1,
      elapsedSeconds,
      score: this.score,
      feverCount: this.feverCount,
    });

    if (event == null) {
      return;
    }

    this.rareEventTriggered = event;
    if (event === 'goldenSalary') {
      this.score += 2500;
      this.feverMs = Math.max(this.feverMs, 2600);
      this.spawnActor('coin', this.player.x);
      this.spawnActor('boost', Phaser.Math.Clamp(this.player.x + 44, 34, GAME_WIDTH - 34));
      this.popText(GAME_WIDTH / 2, 256, '황금 월급 입금!', '#ffc857');
      this.burst(this.player.x, this.player.y - 70, PALETTE.gold, 18);
    } else if (event === 'taxRefundRush') {
      this.timeLeft = Math.min(ROUND_SECONDS, this.timeLeft + 4);
      this.freezeHazards();
      this.spawnActor('magnetItem', this.player.x);
      this.popText(GAME_WIDTH / 2, 256, '세금 환급 폭주!', '#66ffc2');
      this.burst(this.player.x, this.player.y - 70, PALETTE.green, 16);
    } else {
      this.timeLeft = Math.min(ROUND_SECONDS, this.timeLeft + 5);
      this.score += 1600;
      this.spawnActor('boost', this.player.x);
      this.popText(GAME_WIDTH / 2, 256, '보너스 타임!', '#9defff');
      this.burst(this.player.x, this.player.y - 70, PALETTE.sky, 16);
    }
    this.playTone([523, 659, 784, 1046], 0.05);
    this.haptic('confetti');
    this.bridge.log('rare_event', { event, score: this.score, elapsedSeconds: Math.round(elapsedSeconds) }, 'event');
  }

  private spawnActor(kind: ActorKind, forcedX?: number) {
    if (this.actors.length >= MAX_ACTORS) {
      return;
    }

    const imageKey =
      this.isHazard(kind)
        ? kind
        : kind === 'pulse'
          ? 'pulse'
          : kind === 'coin'
            ? 'coin'
            : kind === 'boost'
              ? 'boost'
              : this.isPowerItem(kind)
                ? kind
              : 'shard';
    const x = forcedX ?? Phaser.Math.Between(34, GAME_WIDTH - 34);
    const image = this.add.sprite(x, -34, imageKey);
    const isFever = this.feverMs > 0;
    const slowFactor = (1 - Math.min(0.28, this.upgrades.slow * 0.09)) * (this.freezeMs > 0 ? 0.48 : 1);
    const speedMultiplier = this.scoreSpeedMultiplier();
    const elapsedSeconds = ROUND_SECONDS - this.timeLeft;
    const pressure = skillPressureProfile({ stageId: this.currentStage().id, combo: this.combo, hp: this.hp, elapsedSeconds, score: this.score });
    const rewardMultiplier = this.rewardMultiplier();
    const baseValue = kind === 'coin' ? 220 : kind === 'pulse' ? 90 : kind === 'boost' ? 70 : this.isPowerItem(kind) ? 110 : 55 + this.save.meta.luck * 3;
    const baseSpeed =
      (this.isHazard(kind) ? (kind === 'rent' ? 230 : kind === 'sub' ? 188 : 205) : this.isPowerItem(kind) ? 138 : kind === 'pulse' ? 152 : kind === 'boost' ? 148 : 176) *
      this.difficulty *
      speedMultiplier *
      (1 + pressure.speedBonus) *
      (isFever && this.isHazard(kind) ? 0.84 : 1) *
      (this.isHazard(kind) ? slowFactor : 1);
    const juice = actorJuiceProfile(kind, this.currentStage().id, this.actors.length);
    const baseScale = juice.scale;
    const actor: Actor = {
      kind,
      image,
      radius: this.isHazard(kind) ? (kind === 'tax' ? 34 : 30) : this.isPowerItem(kind) ? 28 : kind === 'pulse' ? 26 : kind === 'boost' ? 24 : 21,
      speed: Math.min(MAX_ACTOR_SPEED, baseSpeed),
      value: Math.round(baseValue * rewardMultiplier),
      wobble: Phaser.Math.FloatBetween(0.014, 0.031),
      juiceScale: baseScale,
      juiceAura: juice.aura,
      laneWobble: juice.laneWobble,
    };

    image.setDepth(this.isHazard(kind) ? 8 : 7);
    image.setScale(baseScale);
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
              : kind === 'magnetItem'
                ? 'salary-magnet'
              : kind === 'shieldItem'
                ? 'insurance-shield'
              : kind === 'autopilotItem'
                ? 'auto-pilot'
              : kind === 'freezeItem'
                ? 'debt-freeze'
              : kind === 'droneItem'
                ? 'finance-drone'
              : kind === 'boosterItem'
                ? 'salary-boost'
              : 'cash-float',
    );
    this.applyGlow(image, this.actorGlowColor(kind), this.isPowerItem(kind) ? 0.38 : this.isHazard(kind) ? 0.2 + juice.aura * 0.05 : 0.25 + juice.aura * 0.04);
    this.actors.push(actor);
  }

  private updateActors(delta: number) {
    const playerX = this.player.x;
    const playerY = this.player.y;
    const dt = delta / 1000;
    const toRemove = new Set<Actor>();

    for (const actor of this.actors) {
      const wave = Math.sin((actor.image.y + actor.image.x) * actor.wobble) * (this.isHazard(actor.kind) ? 22 + actor.laneWobble : 9 + actor.laneWobble * 0.35);
      actor.image.y += actor.speed * dt;
      actor.image.x += wave * dt;
      actor.image.rotation += dt * (this.isHazard(actor.kind) ? 1.9 : actor.kind === 'boost' ? 5.4 : 3.8);
      const pulse = 1 + Math.sin(this.time.now * 0.006 + actor.wobble * 100) * 0.018;
      actor.image.setScale(actor.juiceScale * pulse, actor.juiceScale);

      const distance = Phaser.Math.Distance.Between(playerX, playerY, actor.image.x, actor.image.y);
      const magnetRange = this.magnetRange();

      if (!this.isHazard(actor.kind) && distance < magnetRange) {
        const pull = this.magnetMs > 0 ? 0.15 : 0.08;
        actor.image.x += (playerX - actor.image.x) * pull;
        actor.image.y += (playerY - actor.image.y) * pull;
      }

      if (this.droneMs > 0 && this.isHazard(actor.kind) && distance < 86) {
        toRemove.add(actor);
        this.score += 120;
        this.overdrive = Math.min(100, this.overdrive + 4);
        this.burst(actor.image.x, actor.image.y, PALETTE.sky, 10);
        this.popText(actor.image.x, actor.image.y - 18, '드론 요격', '#9defff');
        continue;
      }

      if (this.boosterMs > 0 && this.isHazard(actor.kind) && Math.abs(actor.image.x - playerX) < 74 && actor.image.y > SAFE_TOP) {
        toRemove.add(actor);
        this.score += 150;
        this.burst(actor.image.x, actor.image.y, PALETTE.gold, 14);
        continue;
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
        const juice = nearMissJuiceProfile(this.nearChain);
        this.overdrive = Math.min(100, this.overdrive + 10 + this.nearChain * 5 + Math.min(18, this.combo) + this.upgrades.rebate * 4);
        this.score += Math.round((juice.scoreBonus + this.combo * 7 + this.nearChain * 35) * (1 + this.upgrades.rebate * 0.18 + this.save.meta.luck * 0.025));
        this.haptic(this.nearChain >= 3 ? 'tickMedium' : 'tickWeak');
        this.cameras.main.shake(juice.freezeMs, juice.shake);
        this.burst(actor.image.x, actor.image.y, this.nearChain >= 3 ? PALETTE.gold : PALETTE.violet, this.nearChain >= 3 ? 24 : 14);
        this.shockwave(actor.image.x, actor.image.y, this.nearChain >= 3 ? PALETTE.gold : PALETTE.violet, 1.15 + Math.min(1.2, this.nearChain * 0.16));
        this.playTone([juice.pitch, Math.min(1320, juice.pitch * 1.26)], 0.026, 0.07 + Math.min(0.045, this.nearChain * 0.006), 'triangle');
        const nearLabel = this.nearChain >= 2 ? `스쳤다! x${this.nearChain}` : '스쳤다! +각성';
        this.showCenterFeedback(nearLabel, this.nearChain >= 3 ? '#ffc857' : '#cfc4ff', GAME_HEIGHT / 2 + 72);
        this.popText(GAME_WIDTH / 2, PLAYER_Y - 138, nearLabel, this.nearChain >= 3 ? '#ffc857' : '#cfc4ff', true);
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

    const rhythm = comboRhythmProfile(this.combo);
    this.comboGraceMs = Math.max(1650, 1650 + rhythm.beat * 55);
    const feverMultiplier = this.feverMs > 0 ? 2.1 + this.upgrades.payday * 0.18 + this.save.meta.luck * 0.03 + (this.hasEvolution('thirteenthPay') ? 0.35 : 0) : 1;
    const comboMultiplier = 1 + Math.min(this.combo, 36) * 0.045;
    const hpBonus = actor.kind === 'pulse' ? 0 : this.hp * 8;
    const rebateMultiplier = 1 + this.upgrades.rebate * 0.08 + this.save.meta.luck * 0.015 + (this.hasEvolution('autoRefund') ? 0.14 : 0);
    this.score += Math.round((actor.value + hpBonus) * comboMultiplier * feverMultiplier * rebateMultiplier);
    this.tweens.add({
      targets: [this.scoreText, this.scoreCard],
      scale: 1.04 + rhythm.multiplier * 0.025,
      duration: Math.max(42, 86 - rhythm.beat * 5),
      yoyo: true,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: this.comboText,
      scale: Math.max(1.08, 1 + rhythm.multiplier * 0.08),
      duration: Math.max(38, 76 - rhythm.beat * 5),
      yoyo: true,
      ease: 'Back.easeOut',
    });

    if (actor.kind === 'shard' || actor.kind === 'coin' || actor.kind === 'boost') {
      this.shards += 1;
      this.haptic(this.combo % 8 === 0 ? 'tickMedium' : 'tickWeak');
    }

    if (actor.kind === 'coin') {
      this.playTone([988, 1319 + rhythm.pitch], 0.032, 0.075 + rhythm.multiplier * 0.025, 'triangle');
    } else if (actor.kind === 'shard') {
      this.playTone([659 + Math.min(12, this.combo) * 32 + rhythm.pitch], 0.036, 0.058 + rhythm.multiplier * 0.02, 'triangle');
    }

    if (actor.kind === 'pulse') {
      this.startFever();
    }

    if (this.isPowerItem(actor.kind)) {
      this.activatePowerItem(actor.kind, actor.image.x, actor.image.y);
    }

    const centerComboColor = this.combo >= 24 ? '#fff4d8' : this.combo >= 8 ? '#9defff' : '#66ffc2';
    if (this.combo >= 1 && actor.kind !== 'boost') {
      const scoreLabel = `+${actor.value}`;
      // The persistent center combo badge owns COMBO/FEVER text.
      // Keep collection popups local to the actor so the center never stacks duplicate combo labels.
      this.popText(actor.image.x, actor.image.y - 34, scoreLabel, centerComboColor, false);
    }

    if (this.combo >= 4 && this.combo % 4 === 0 && actor.kind !== 'boost') {
      this.shockwave(GAME_WIDTH / 2, PLAYER_Y - 94, this.combo >= 24 ? PALETTE.gold : PALETTE.sky, 1.4);
    }

    if (actor.kind === 'boost') {
      this.timeLeft = Math.min(ROUND_SECONDS, this.timeLeft + 1.8 + this.upgrades.overtime * 0.28 + (this.hasEvolution('thirteenthPay') ? 0.45 : 0));
      this.overdrive = Math.min(100, this.overdrive + 8);
      this.haptic('softMedium');
      this.playTone([523, 784, 1047], 0.04, 0.08, 'triangle');
      this.popText(actor.image.x, actor.image.y - 18, '+1.8초', '#66ffc2');
      this.tweens.add({
        targets: [this.timerText, this.timerCard],
        scale: 1.08,
        duration: 90,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    }

    this.burst(actor.image.x, actor.image.y, this.actorGlowColor(actor.kind), actor.kind === 'pulse' || this.isPowerItem(actor.kind) ? 22 : actor.kind === 'boost' ? 14 : 9);

    if (this.combo > 0 && this.combo % 10 === 0) {
      this.timeLeft = Math.min(ROUND_SECONDS, this.timeLeft + 1.2);
      this.haptic('softMedium');
      this.bridge.log('combo_milestone', { combo: this.combo, score: this.score }, 'event');
      this.showCenterFeedback(`+1.2초 보너스`, '#ffc857', GAME_HEIGHT / 2 + 54);
      this.popText(GAME_WIDTH / 2, PLAYER_Y - 110, `+1.2초`, '#ffc857', false);
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
    this.haptic('confetti');
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
    if (this.boosterMs > 0) {
      this.score += 90;
      this.haptic('basicMedium');
      this.popText(this.player.x, this.player.y - 88, '부스터 방어', '#ffc857');
      return;
    }

    if (this.feverMs > 0) {
      this.score += 140;
      this.haptic('basicMedium');
      this.cameras.main.shake(90, 0.005);
      this.popText(this.player.x, this.player.y - 88, '파산 방어', '#ffc857');
      this.playTone([196, 392], 0.04);
      return;
    }

    if (this.upgrades.shield > 0) {
      this.upgrades.shield -= 1;
      this.score += 90;
      this.haptic('success');
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
    this.noHitRun = false;
    this.combo = 0;
    this.nearChain = 0;
    this.comboGraceMs = 1650;
    this.haptic('wiggle');
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
    const response = this.currentStage().id >= 3 ? 0.00125 : 0.00155;
    const lerp = 1 - Math.pow(response, delta / 1000);
    this.player.x = Phaser.Math.Linear(this.player.x, this.targetX, lerp);
    this.player.y = PLAYER_Y + Math.sin(this.time.now * 0.007) * 5;
    this.player.rotation = Phaser.Math.Clamp((this.targetX - this.player.x) * 0.005, -0.28, 0.28);
    const skin = this.currentSkin();
    const activeColor = this.feverMs > 0 ? PALETTE.gold : this.autopilotMs > 0 ? PALETTE.violet : this.magnetMs > 0 ? PALETTE.green : this.droneMs > 0 ? PALETTE.sky : skin.glow;
    this.playerGlow.setFillStyle(activeColor, this.feverMs > 0 || this.autopilotMs > 0 || this.boosterMs > 0 ? 0.3 : 0.16);
    this.magnetRing.setStrokeStyle(2, activeColor, this.magnetMs > 0 ? 0.68 : this.feverMs > 0 ? 0.48 : 0.26);
    this.magnetRing.setScale(1 + this.upgrades.magnet * 0.035 + this.save.meta.magnet * 0.018 + (this.magnetMs > 0 ? 0.72 : 0) + (this.droneMs > 0 ? 0.2 : 0));
    this.playerFlame.setTint(this.boosterMs > 0 || this.feverMs > 0 ? PALETTE.gold : PALETTE.white);
    this.playerFlame.setScale(this.boosterMs > 0 ? 1.22 : 1);
    this.playerShip.setTint(this.feverMs > 0 || this.boosterMs > 0 ? 0xfff0b6 : skin.tint);
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

  private updatePowerItemTimers(delta: number) {
    this.magnetMs = Math.max(0, this.magnetMs - delta);
    this.autopilotMs = Math.max(0, this.autopilotMs - delta);
    this.freezeMs = Math.max(0, this.freezeMs - delta);
    this.droneMs = Math.max(0, this.droneMs - delta);
    this.boosterMs = Math.max(0, this.boosterMs - delta);
    this.mapEventMs = Math.max(0, this.mapEventMs - delta);
  }

  private updateAutopilotTarget() {
    if (this.autopilotMs <= 0) {
      return;
    }

    let nearbyHazard: Actor | undefined;
    let nearbyHazardDelta = Number.POSITIVE_INFINITY;
    let reward: Actor | undefined;
    let rewardDistance = Number.POSITIVE_INFINITY;

    for (const actor of this.actors) {
      if (this.isHazard(actor.kind)) {
        if (actor.image.y > SAFE_TOP && actor.image.y < PLAYER_Y + 18) {
          const yDelta = Math.abs(actor.image.y - PLAYER_Y);
          if (yDelta < nearbyHazardDelta) {
            nearbyHazard = actor;
            nearbyHazardDelta = yDelta;
          }
        }
      } else if (actor.image.y > SAFE_TOP && actor.image.y < PLAYER_Y) {
        const distance = Phaser.Math.Distance.Between(actor.image.x, actor.image.y, this.player.x, this.player.y);
        if (distance < rewardDistance) {
          reward = actor;
          rewardDistance = distance;
        }
      }
    }

    if (nearbyHazard != null && Math.abs(nearbyHazard.image.x - this.player.x) < 96) {
      const left = nearbyHazard.image.x < GAME_WIDTH / 2 ? nearbyHazard.image.x + 126 : nearbyHazard.image.x - 126;
      this.targetX = Phaser.Math.Clamp(left, 38, GAME_WIDTH - 38);
      return;
    }

    if (reward != null) {
      this.targetX = Phaser.Math.Clamp(reward.image.x, 38, GAME_WIDTH - 38);
    }
  }

  private powerStatusLabel() {
    if (this.boosterMs > 0) {
      return `월급 부스터 ${(this.boosterMs / 1000).toFixed(1)}초 · 고지서 돌파`;
    }
    if (this.autopilotMs > 0) {
      return `오토파일럿 ${(this.autopilotMs / 1000).toFixed(1)}초 · 자동 회피`;
    }
    if (this.droneMs > 0) {
      return `재무팀 드론 ${(this.droneMs / 1000).toFixed(1)}초 · 근접 고지서 요격`;
    }
    if (this.magnetMs > 0) {
      return `급여자석 ${(this.magnetMs / 1000).toFixed(1)}초 · 보상 자동 흡입`;
    }
    if (this.freezeMs > 0) {
      return `채무동결 ${(this.freezeMs / 1000).toFixed(1)}초 · 고지서 감속`;
    }
    return undefined;
  }

  private updateHud(force = false) {
    const now = this.time.now;
    const powerStatus = this.powerStatusLabel();
    const feverSeconds = this.feverMs > 0 ? (this.feverMs / 1000).toFixed(1) : '';
    const powerSeconds = powerStatus ?? '';
    const timerBucket = Math.ceil(this.timeLeft * 5) / 5;
    const snapshot = [
      this.score,
      timerBucket.toFixed(1),
      this.combo,
      this.hp,
      this.maxHp(),
      this.upgrades.shield,
      Math.round(this.overdrive),
      feverSeconds,
      powerSeconds,
      this.nearChain,
      this.phase,
    ].join('|');

    if (!force && snapshot === this.hudSnapshot && now - this.hudLastUpdateMs < 120) {
      this.updateCenterComboBadge();
      this.dangerOverlay.setAlpha(this.hp <= 1 && this.phase === 'playing' ? 0.08 + Math.sin(now * 0.012) * 0.035 : 0);
      return;
    }

    this.hudSnapshot = snapshot;
    this.hudLastUpdateMs = now;
    this.updateCenterComboBadge();
    this.scoreText.setFontSize(25);
    this.scoreText.setText(this.score.toLocaleString('ko-KR'));
    this.fitText(this.scoreText, 132, 16);
    this.timerText.setFontSize(24);
    this.timerText.setText(timerBucket.toFixed(1));
    this.fitText(this.timerText, 76, 16);
    this.timerText.setColor(this.timeLeft < 8 ? '#ff5f9f' : '#ffc857');
    const maxHp = this.maxHp();
    const shield = this.upgrades.shield > 0 ? ` · 보험 ${this.upgrades.shield}` : '';
    this.comboText.setFontSize(13);
    const comboLabel = this.combo >= 24 ? `FEVER ${this.combo}` : this.combo >= 8 ? `${this.combo} COMBO!` : `콤보 ${this.combo}`;
    this.comboText.setText(`${comboLabel} · 체력 ${'◆'.repeat(Math.max(0, this.hp))}${'◇'.repeat(Math.max(0, maxHp - this.hp))}${shield}`);
    this.fitText(this.comboText, 245, 9);

    const fever = this.feverMs > 0 ? ` · 각성 ${feverSeconds}s` : '';
    this.missionText.setFontSize(12);
    this.missionText.setText(`${this.stageHudLabel()}${fever}`);
    this.fitText(this.missionText, 258, 9);
    const status =
      powerStatus ??
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
    const resolvedStatus = powerStatus ?? status;
    this.statusText.setFontSize(12);
    this.statusText.setText(resolvedStatus);
    this.fitText(this.statusText, 324, 9);
    this.statusText.setColor(powerStatus != null || this.feverMs > 0 || this.overdrive > 70 ? '#ffc857' : '#78cfe7');
    this.overdriveFill.width = (212 * (this.feverMs > 0 ? 1 : this.overdrive)) / 100;
    this.overdriveFill.setFillStyle(this.feverMs > 0 ? PALETTE.gold : this.overdrive > 70 ? PALETTE.green : PALETTE.aqua, 0.96);
    this.dangerOverlay.setAlpha(this.hp <= 1 && this.phase === 'playing' ? 0.08 + Math.sin(now * 0.012) * 0.035 : 0);
  }

  private updateCenterComboBadge() {
    if (!this.centerComboLiveText?.active) {
      return;
    }

    if (this.phase === 'playing' && this.combo > 0) {
      const liveLabel = this.combo >= 24 ? `FEVER ${this.combo}` : this.combo >= 8 ? `${this.combo} COMBO` : `${this.combo} COMBO`;
      this.centerComboLiveText.setText(liveLabel);
      this.centerComboLiveText.setVisible(true);
      this.centerComboLiveText.setActive(true);
      this.centerComboLiveText.setOrigin(0.5, 0.5);
      this.centerComboLiveText.setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 96);
      this.centerComboLiveText.setDepth(112);
      this.centerComboLiveText.setAlpha(0.92);
      this.centerComboLiveText.setScale(0.92 + Math.min(0.16, this.combo * 0.003));
      this.centerComboLiveText.setColor(this.combo >= 24 ? '#fff4d8' : this.combo >= 8 ? '#9defff' : '#66ffc2');
    } else {
      this.centerComboLiveText.setAlpha(0);
      this.centerComboLiveText.setVisible(false);
    }
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

  private canEmitEffect(cost = 1) {
    const now = this.time.now;
    if (now - this.effectWindowStartedAt >= 1000) {
      this.effectWindowStartedAt = now;
      this.effectCountInWindow = 0;
    }
    if (this.effectCountInWindow + cost > this.performanceProfile.maxPopupsPerSecond) {
      return false;
    }
    this.effectCountInWindow += cost;
    return true;
  }

  private acquireSpark(x: number, y: number, color: number, image: boolean) {
    const pooled = this.sparkPool.pop();
    const dot = pooled ?? (image ? this.add.image(x, y, 'spark') : this.add.circle(x, y, 3, color, 0.86));
    dot.setPosition(x, y);
    dot.setAlpha(1);
    dot.setVisible(true);
    dot.setActive(true);
    dot.setDepth(16);
    dot.setBlendMode(Phaser.BlendModes.ADD);
    if (dot instanceof Phaser.GameObjects.Image) {
      dot.setTexture('spark');
      dot.setTint(color);
      dot.setScale(Phaser.Math.FloatBetween(0.25, 0.58));
    } else {
      dot.setFillStyle(color, Phaser.Math.FloatBetween(0.62, 0.95));
      dot.setRadius(Phaser.Math.FloatBetween(2, 4.8));
      dot.setScale(1);
    }
    return dot;
  }

  private releaseSpark(dot: Phaser.GameObjects.Image | Phaser.GameObjects.Arc) {
    dot.setVisible(false);
    dot.setActive(false);
    dot.setAlpha(0);
    if (this.sparkPool.length < 80) {
      this.sparkPool.push(dot);
    } else {
      dot.destroy();
    }
  }

  private burst(x: number, y: number, color: number, count: number) {
    if (!this.canEmitEffect(1)) {
      return;
    }

    const resolvedCount = Math.max(1, Math.round(count * this.performanceProfile.particleMultiplier));
    for (let i = 0; i < resolvedCount; i += 1) {
      const dot = this.acquireSpark(x, y, color, i % 3 === 0);
      this.tweens.add({
        targets: dot,
        x: x + Phaser.Math.Between(-68, 68),
        y: y + Phaser.Math.Between(-62, 42),
        rotation: Phaser.Math.FloatBetween(-3.4, 3.4),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(300, 620),
        ease: 'Cubic.easeOut',
        onComplete: () => this.releaseSpark(dot),
      });
    }
  }

  private showCenterFeedback(label: string, color = '#fff4d8', y = GAME_HEIGHT / 2 + 86) {
    if (!this.centerFeedbackText?.active) {
      return;
    }
    const fontSize = label.includes('FEVER') ? '30px' : label.includes('COMBO') || label.includes('스쳤다') ? '26px' : '22px';
    this.centerFeedbackText.setStyle({
      align: 'center',
      fontFamily: 'Pretendard, sans-serif',
      fontSize,
      fontStyle: '900',
      color,
      stroke: '#001622',
      strokeThickness: 5,
      shadow: { color: '#001622', blur: 14, fill: true },
    });
    this.centerFeedbackText.setText(label);
    this.centerFeedbackText.setOrigin(0.5, 0.5);
    this.centerFeedbackText.setPosition(GAME_WIDTH / 2, y);
    this.centerFeedbackText.setVisible(true);
    this.centerFeedbackText.setActive(true);
    this.centerFeedbackText.setDepth(90);
    this.centerFeedbackText.setAlpha(1);
    this.centerFeedbackText.setScale(0.88);
    this.tweens.killTweensOf(this.centerFeedbackText);
    this.tweens.add({
      targets: this.centerFeedbackText,
      scale: 1.08,
      duration: 72,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.centerFeedbackText,
          y: y - 16,
          alpha: 0,
          duration: 920,
          ease: 'Cubic.easeOut',
        });
      },
    });
  }

  private popText(x: number, y: number, label: string, color = '#f8fbff', priority = false) {
    if (!priority && !this.canEmitEffect(1)) {
      return;
    }

    const text = this.popTextPool.pop() ?? this.add.text(0, 0, '', {
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '16px',
      fontStyle: '900',
      color,
      align: 'center',
      shadow: { color: '#001622', blur: 8, fill: true },
    });
    const centeredX = Phaser.Math.Clamp(x, 46, GAME_WIDTH - 46);
    text.setText(label);
    const fontSize = priority ? (label.includes('FEVER') ? '25px' : label.includes('COMBO') || label.includes('스쳤다') ? '22px' : '18px') : '16px';
    text.setStyle({
      fontFamily: 'Pretendard, sans-serif',
      fontSize,
      fontStyle: '900',
      color,
      align: 'center',
      shadow: { color: '#001622', blur: 8, fill: true },
    });
    text.setOrigin(0.5, 0.5);
    text.setPosition(centeredX, y);
    text.setAlpha(1);
    text.setVisible(true);
    text.setActive(true);
    text.setScale(1);
    text.setDepth(priority ? 64 : this.growthLayer != null || this.upgradeLayer != null || this.pauseLayer != null ? 60 : 18);
    this.tweens.add({
      targets: text,
      y: y - 34,
      alpha: 0,
      duration: 620,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        text.setVisible(false);
        text.setActive(false);
        if (this.popTextPool.length < 24) {
          this.popTextPool.push(text);
        } else {
          text.destroy();
        }
      },
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
    const hit = this.add.zone(0, 0, width + 20, height + 20);
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
    group.add([bg, text, hit]);
    group.setDepth(22);
    group.setSize(width, height);
    const fire = () => {
      this.haptic('tap');
      this.tweens.add({
        targets: group,
        scale: 0.94,
        duration: 60,
        yoyo: true,
        onComplete: onClick,
      });
    };
    hit.setInteractive();
    hit.on('pointerdown', fire);

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
    const hit = this.add.zone(0, 0, width + 26, height + 24);
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
    group.add([shadow, bg, shine, text, hit]);
    this.applyGlow(bg, color, 0.18);
    group.setSize(width, height);
    let locked = false;
    const fire = () => {
      if (locked) {
        return;
      }

      locked = true;
      this.haptic('tap');
      this.tweens.add({
        targets: group,
        scale: 0.96,
        duration: 70,
        yoyo: true,
        onComplete: () => {
          locked = false;
          onClick();
        },
      });
    };
    hit.setInteractive();
    hit.on('pointerdown', fire);

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
      ctx.beginPath();
      ctx.arc(75, 84, 5, 0, Math.PI * 2);
      ctx.fill();

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
      ctx.fillStyle = 'rgba(7,48,31,.85)';
      ctx.beginPath();
      ctx.arc(0, 1, 7, 0, Math.PI * 2);
      ctx.fill();
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
      ctx.font = '900 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('카드', 0, 5);
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
      ctx.font = '900 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('월세', 0, 17);
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
      ctx.font = '900 17px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('세금', 0, 6);
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
      ctx.font = '900 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('구독', 0, 18);
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
      ctx.beginPath();
      ctx.arc(0, 1, 7, 0, Math.PI * 2);
      ctx.fill();
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

    const powerSheet = (key: string, label: string, colorA: string, colorB: string, mark: (ctx: CanvasRenderingContext2D) => void) => {
      makeSheet(key, 86, 86, 6, (ctx, frame) => {
        ctx.translate(43, 43);
        const pulse = 1 + Math.sin((frame / 6) * Math.PI * 2) * 0.06;
        ctx.scale(pulse, pulse);
        ctx.shadowBlur = 22;
        ctx.shadowColor = colorA;
        const core = ctx.createRadialGradient(-8, -10, 6, 0, 0, 38);
        core.addColorStop(0, '#ffffff');
        core.addColorStop(0.42, colorA);
        core.addColorStop(1, colorB);
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(0, 0, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,.78)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.stroke();
        mark(ctx);
        ctx.fillStyle = '#07131f';
        ctx.font = '900 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, 0, 24);
      });
    };

    powerSheet('magnetItem', 'MAG', '#66ffc2', '#07523f', (ctx) => {
      ctx.strokeStyle = '#07301f';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(-9, -4, 12, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(9, -4, 12, Math.PI * 1.5, Math.PI * 0.5);
      ctx.stroke();
    });

    powerSheet('shieldItem', 'SAFE', '#cfc4ff', '#2d1c67', (ctx) => {
      ctx.fillStyle = '#07131f';
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(20, -12);
      ctx.lineTo(15, 10);
      ctx.lineTo(0, 22);
      ctx.lineTo(-15, 10);
      ctx.lineTo(-20, -12);
      ctx.closePath();
      ctx.fill();
    });

    powerSheet('autopilotItem', 'AUTO', '#8c72ff', '#21135a', (ctx) => {
      ctx.fillStyle = '#07131f';
      ctx.beginPath();
      ctx.moveTo(0, -25);
      ctx.lineTo(18, 18);
      ctx.lineTo(0, 10);
      ctx.lineTo(-18, 18);
      ctx.closePath();
      ctx.fill();
    });

    powerSheet('freezeItem', 'ICE', '#9defff', '#0a5878', (ctx) => {
      ctx.strokeStyle = '#07131f';
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i += 1) {
        ctx.save();
        ctx.rotate((Math.PI * 2 * i) / 3);
        ctx.beginPath();
        ctx.moveTo(0, -24);
        ctx.lineTo(0, 22);
        ctx.stroke();
        ctx.restore();
      }
    });

    powerSheet('droneItem', 'DRON', '#9defff', '#06415f', (ctx) => {
      ctx.fillStyle = '#07131f';
      rounded(ctx, -19, -10, 38, 20, 8);
      ctx.fill();
      ctx.fillStyle = '#9defff';
      ctx.beginPath();
      ctx.arc(-25, -2, 7, 0, Math.PI * 2);
      ctx.arc(25, -2, 7, 0, Math.PI * 2);
      ctx.fill();
    });

    powerSheet('boosterItem', 'RUN', '#ffc857', '#8b4016', (ctx) => {
      ctx.fillStyle = '#07131f';
      ctx.beginPath();
      ctx.moveTo(-19, 20);
      ctx.lineTo(0, -25);
      ctx.lineTo(19, 20);
      ctx.lineTo(0, 10);
      ctx.closePath();
      ctx.fill();
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
      ctx.beginPath();
      ctx.arc(0, 10, 15, 0, Math.PI * 2);
      ctx.fill();
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
    loop('salary-magnet', 'magnetItem', 5, 10);
    loop('insurance-shield', 'shieldItem', 5, 10);
    loop('auto-pilot', 'autopilotItem', 5, 10);
    loop('debt-freeze', 'freezeItem', 5, 10);
    loop('finance-drone', 'droneItem', 5, 10);
    loop('salary-boost', 'boosterItem', 5, 10);
  }

  private detectPerformanceProfile() {
    const nav = navigator as Navigator & { deviceMemory?: number };
    return resolvePerformanceProfile({
      deviceMemory: nav.deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      saveQuality: this.save.visualQuality,
    });
  }

  private weekKey(date: string) {
    const stamp = Date.parse(`${date}T00:00:00.000Z`);
    const day = Number.isFinite(stamp) ? new Date(stamp) : new Date();
    const first = Date.UTC(day.getUTCFullYear(), 0, 1);
    const week = Math.ceil(((day.getTime() - first) / 86400000 + new Date(first).getUTCDay() + 1) / 7);
    return `${day.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  private loadSave(): SaveState {
    const today = new Date().toISOString().slice(0, 10);
    let parsed: SaveState = {
      ...DEFAULT_SAVE,
      bestByStage: [...DEFAULT_SAVE.bestByStage],
      daily: { ...DEFAULT_SAVE.daily },
      audio: { ...DEFAULT_SAVE.audio },
      adUses: { ...DEFAULT_SAVE.adUses },
      achievements: { ...DEFAULT_SAVE.achievements },
      streak: { ...DEFAULT_SAVE.streak },
      weekly: { ...DEFAULT_SAVE.weekly },
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
          audio: { ...DEFAULT_SAVE.audio, ...saved.audio },
          adUses: { ...DEFAULT_SAVE.adUses, ...saved.adUses },
          visualQuality: saved.visualQuality ?? DEFAULT_SAVE.visualQuality,
          achievements: { ...DEFAULT_SAVE.achievements, ...saved.achievements },
          streak: { ...DEFAULT_SAVE.streak, ...saved.streak },
          weekly: { ...DEFAULT_SAVE.weekly, ...saved.weekly },
          meta: { ...DEFAULT_SAVE.meta, ...saved.meta },
        };
      }
    } catch {
      parsed = {
        ...DEFAULT_SAVE,
        bestByStage: [...DEFAULT_SAVE.bestByStage],
        daily: { ...DEFAULT_SAVE.daily },
        audio: { ...DEFAULT_SAVE.audio },
        adUses: { ...DEFAULT_SAVE.adUses },
        achievements: { ...DEFAULT_SAVE.achievements },
        streak: { ...DEFAULT_SAVE.streak },
        weekly: { ...DEFAULT_SAVE.weekly },
        meta: { ...DEFAULT_SAVE.meta },
      };
    }

    if (parsed.dailyDate !== today) {
      parsed.dailyDate = today;
      parsed.daily = { ...DEFAULT_SAVE.daily };
    }

    parsed.streak = updateStreakState(parsed.streak ?? DEFAULT_SAVE.streak, today) as SaveState['streak'];
    const loginReward = streakLoginReward(parsed.streak);
    if (loginReward > 0) {
      parsed.credits += loginReward;
      parsed.streak.rewardClaimedDate = today;
      this.pendingStreakReward = loginReward;
    } else {
      this.pendingStreakReward = 0;
    }
    const weekKey = this.weekKey(today);
    if (parsed.weekly.weekKey !== weekKey) {
      parsed.weekly = { ...DEFAULT_SAVE.weekly, weekKey };
    }

    parsed.unlockedStage = Phaser.Math.Clamp(Math.floor(parsed.unlockedStage ?? 0), 0, STAGES.length - 1);
    parsed.selectedStage = Phaser.Math.Clamp(Math.floor(parsed.selectedStage ?? 0), 0, parsed.unlockedStage);
    parsed.bestAlertTier = Math.max(0, Math.floor(parsed.bestAlertTier ?? 0));
    parsed.bestByStage = STAGES.map((_, index) => Math.max(0, parsed.bestByStage?.[index] ?? 0));
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));

    return parsed;
  }

  private persistSave() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.save));
    } catch {
      // Storage is optional in file previews and some embedded WebViews.
    }
  }

  private async shareResultCard() {
    const copy = resultShareCopy({ score: this.score, rank: this.rankLabel(), nearMiss: this.nearMiss, feverCount: this.feverCount });
    const url = 'https://0ssol1620-byte.github.io/toss-comet-rush/';
    this.haptic('success');
    this.bridge.log('share_click', { score: this.score, rank: this.rankLabel(), nearMiss: this.nearMiss }, 'click');
    if (navigator.share != null) {
      await navigator.share({ title: '월급 방어전', text: copy, url }).catch(() => undefined);
    } else if (navigator.clipboard != null) {
      await navigator.clipboard.writeText(`${copy}\n${url}`).catch(() => undefined);
      this.popText(GAME_WIDTH / 2, 706, '공유 문구 복사 완료', '#66ffc2');
    } else {
      this.popText(GAME_WIDTH / 2, 706, '공유 문구 준비 완료', '#66ffc2');
    }
  }

  private claimRunAchievements() {
    const progress = achievementProgress({
      score: this.score,
      nearMiss: this.nearMiss,
      maxCombo: this.maxCombo,
      stageCleared: this.resultStageCleared,
      noHit: this.noHitRun,
    });
    const newlyUnlocked = progress.filter((achievement) => achievement.unlocked && !this.save.achievements[achievement.id]);
    for (const achievement of newlyUnlocked) {
      this.save.achievements[achievement.id] = true;
    }
    return newlyUnlocked;
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

  private claimDailyMissionReward() {
    const state = missionRewardState(
      { shards: this.save.daily.shards, nearMiss: this.save.daily.nearMiss, maxCombo: this.save.daily.maxCombo },
      this.save.dailyRewardClaimedDate === this.save.dailyDate,
    );
    if (!state.claimable) {
      this.haptic('tap');
      this.popText(GAME_WIDTH / 2, 632, state.complete ? '오늘 보상은 이미 수령했어요' : '미션 3개 완료 후 수령!', '#ffc857');
      return false;
    }

    this.save.credits += DAILY_MISSION_REWARD;
    this.save.dailyRewardClaimedDate = this.save.dailyDate;
    this.persistSave();
    this.haptic('confetti');
    this.playTone([784, 988, 1319, 1568], 0.065, 0.12, 'triangle');
    this.popText(GAME_WIDTH / 2, 632, `미션 보상 +${DAILY_MISSION_REWARD}`, '#66ffc2');
    this.bridge.log('daily_mission_complete', { reward: DAILY_MISSION_REWARD, date: this.save.dailyDate }, 'event');
    return true;
  }

  private claimWeeklyMissionReward() {
    const weekly = weeklyMissionProgress(this.save.weekly);
    if (weekly.completed < weekly.total) {
      this.haptic('tap');
      this.popText(GAME_WIDTH / 2, 632, `주간 미션 ${weekly.total - weekly.completed}개 남았어요`, '#ffc857');
      return false;
    }
    if (this.save.weekly.rewardClaimedWeek === this.save.weekly.weekKey) {
      this.haptic('tap');
      this.popText(GAME_WIDTH / 2, 632, '이번 주 보상은 이미 받았어요', '#ffc857');
      return false;
    }

    const reward = 900;
    this.save.credits += reward;
    this.resultCredits += reward;
    this.save.weekly.rewardClaimedWeek = this.save.weekly.weekKey;
    this.persistSave();
    this.haptic('confetti');
    this.playTone([659, 880, 1175, 1568], 0.07, 0.13, 'triangle');
    this.popText(GAME_WIDTH / 2, 632, `주간 월급왕 보상 +${reward}`, '#66ffc2');
    this.bridge.log('weekly_mission_reward_claim', { weekKey: this.save.weekly.weekKey, reward }, 'event');
    return true;
  }

  private async tryDoubleRewardAd() {
    if (this.resultCredits <= 0) {
      this.popText(GAME_WIDTH / 2, 632, '2배 보상은 코인 획득 후 가능해요', '#ffc857');
      return;
    }

    const result = await this.runRewardAd('doubleReward');
    if (!result.rewarded) {
      this.haptic('tickWeak');
      this.popText(GAME_WIDTH / 2, 632, result.supported ? '광고 보상이 완료되지 않았어요' : '현재 광고 미지원 환경이에요', '#ffc857');
      return;
    }

    this.save.credits += this.resultCredits;
    this.persistSave();
    this.haptic('confetti');
    this.playTone([880, 1175, 1568], 0.07, 0.12, 'triangle');
    this.popText(GAME_WIDTH / 2, 632, `코인 2배 +${this.resultCredits}`, '#66ffc2');
    this.bridge.log('reward_double_ad_reward', { credits: this.resultCredits }, 'event');
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

  private isPowerItem(kind: ActorKind) {
    return kind === 'magnetItem' || kind === 'shieldItem' || kind === 'autopilotItem' || kind === 'freezeItem' || kind === 'droneItem' || kind === 'boosterItem';
  }

  private actorGlowColor(kind: ActorKind) {
    if (this.isHazard(kind)) {
      return PALETTE.red;
    }

    if (kind === 'coin' || kind === 'pulse' || kind === 'boosterItem') {
      return PALETTE.gold;
    }

    if (kind === 'boost' || kind === 'magnetItem') {
      return PALETTE.green;
    }

    if (kind === 'shieldItem' || kind === 'autopilotItem') {
      return PALETTE.violet;
    }

    if (kind === 'freezeItem' || kind === 'droneItem') {
      return PALETTE.sky;
    }

    return PALETTE.aqua;
  }

  private stagePowerItemChance() {
    const stage = this.currentStage().id;
    return Phaser.Math.Clamp(0.07 + stage * 0.011 + (this.hp <= 1 ? 0.04 : 0), 0.08, 0.16);
  }

  private pickStagePowerItem(): ActorKind {
    const stage = this.currentStage().id;
    const roll = Math.random();

    if (stage <= 1) {
      return roll < 0.42 ? 'magnetItem' : roll < 0.72 ? 'shieldItem' : 'freezeItem';
    }

    if (stage === 2) {
      return roll < 0.36 ? 'boosterItem' : roll < 0.62 ? 'magnetItem' : roll < 0.82 ? 'shieldItem' : 'autopilotItem';
    }

    if (stage === 3) {
      return roll < 0.34 ? 'shieldItem' : roll < 0.58 ? 'autopilotItem' : roll < 0.8 ? 'droneItem' : 'freezeItem';
    }

    if (stage === 4) {
      return roll < 0.32 ? 'autopilotItem' : roll < 0.56 ? 'droneItem' : roll < 0.78 ? 'magnetItem' : 'freezeItem';
    }

    return roll < 0.24 ? 'boosterItem' : roll < 0.46 ? 'droneItem' : roll < 0.68 ? 'autopilotItem' : roll < 0.84 ? 'shieldItem' : 'freezeItem';
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
    return stageAlertTier(this.currentStage(), this.score, SCORE_TIER_SIZE, MAX_ALERT_TIER);
  }

  private effectiveDifficulty() {
    const elapsed = ROUND_SECONDS - this.timeLeft;
    const stage = this.currentStage();
    return stageDifficulty(stage, elapsed, this.scoreAlertTier(), this.timeLeft, MAX_DIFFICULTY);
  }

  private scoreSpeedMultiplier() {
    const stage = this.currentStage();
    return stageSpeedMultiplier(stage, this.scoreAlertTier(), MAX_ALERT_SPEED_MULTIPLIER);
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
    this.haptic(tier >= 3 ? 'wiggle' : 'softMedium');
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
    this.haptic('tap');
    this.popText(GAME_WIDTH / 2, 720, '맵은 클리어 흐름에 따라 자동으로 다음 스테이지로 이동합니다', '#ffc857');
    this.bridge.log('stage_progression_hint', { stage: this.currentStage().id }, 'event');
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
      this.haptic('confetti');
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

  private activatePowerItem(kind: ActorKind, x: number, y: number) {
    if (kind === 'magnetItem') {
      this.magnetMs = this.stackPowerDuration(this.magnetMs, 6200 + this.upgrades.magnet * 420, 12000);
      this.popText(x, y - 34, `급여자석 ${(this.magnetMs / 1000).toFixed(1)}초`, '#66ffc2');
      this.playTone([440, 660, 990], 0.045, 0.09, 'sine');
      this.haptic('success');
    } else if (kind === 'shieldItem') {
      this.upgrades.shield += 1;
      this.popText(x, y - 34, '파산보험 +1', '#cfc4ff');
      this.playTone([392, 523, 784], 0.05, 0.08, 'triangle');
      this.haptic('success');
    } else if (kind === 'autopilotItem') {
      this.autopilotMs = this.stackPowerDuration(this.autopilotMs, 4400, 9000);
      this.popText(x, y - 34, `오토파일럿 ${(this.autopilotMs / 1000).toFixed(1)}초`, '#cfc4ff');
      this.playTone([330, 494, 659, 988], 0.035, 0.075, 'square');
      this.haptic('softMedium');
    } else if (kind === 'freezeItem') {
      this.freezeMs = this.stackPowerDuration(this.freezeMs, 5200, 11000);
      this.freezeHazards();
      this.popText(x, y - 34, `채무동결 ${(this.freezeMs / 1000).toFixed(1)}초`, '#9defff');
      this.playTone([784, 523, 392], 0.05, 0.075, 'sine');
      this.haptic('softMedium');
    } else if (kind === 'droneItem') {
      this.droneMs = this.stackPowerDuration(this.droneMs, 7200, 14000);
      this.popText(x, y - 34, `재무팀 드론 ${(this.droneMs / 1000).toFixed(1)}초`, '#9defff');
      this.playTone([740, 880, 1175], 0.04, 0.08, 'square');
      this.haptic('success');
    } else if (kind === 'boosterItem') {
      this.boosterMs = this.stackPowerDuration(this.boosterMs, 3300, 7000);
      this.score += 420;
      this.popText(x, y - 34, `월급 부스터 ${(this.boosterMs / 1000).toFixed(1)}초`, '#ffc857');
      this.playTone([196, 392, 784, 1175], 0.035, 0.09, 'sawtooth');
      this.haptic('confetti');
    }

    this.bridge.log('power_item_collect', { kind, stage: this.currentStage().id, score: this.score }, 'event');
    this.shockwave(x, y, this.actorGlowColor(kind), kind === 'boosterItem' ? 3 : 2);
  }

  private stackPowerDuration(currentMs: number, addMs: number, capMs: number) {
    return Math.min(capMs, currentMs + addMs);
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
    return (this.feverMs > 0 ? 126 : 82) + this.upgrades.magnet * 24 + this.save.meta.magnet * 7 + (this.hasEvolution('autoRefund') ? 28 : 0) + (this.magnetMs > 0 ? 160 : 0);
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
      this.haptic('error');
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
    this.haptic('success');
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
        this.haptic('tap');
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
      if (this.audio.state === 'suspended') {
        void this.audio.resume();
      }
      this.startOriginalBgmLoop();
      return;
    }

    type AudioContextConstructor = new (contextOptions?: AudioContextOptions) => AudioContext;
    const typedWindow = window as Window & { AudioContext?: AudioContextConstructor; webkitAudioContext?: AudioContextConstructor };
    const AudioCtor = typedWindow.AudioContext ?? typedWindow.webkitAudioContext;
    if (AudioCtor == null) {
      return;
    }

    const audio = new AudioCtor();
    const master = audio.createGain();
    master.gain.setValueAtTime(MASTER_VOLUME, audio.currentTime);
    master.connect(audio.destination);
    this.audio = audio;
    this.masterGain = master;
    this.startTestBgmIfRequested();
    this.startOriginalBgmLoop();
  }

  private startTestBgmIfRequested() {
    if (!new URLSearchParams(window.location.search).has('ncs')) {
      return;
    }

    if (this.testBgm == null) {
      const source = window.location.pathname.endsWith('/play-direct.html') ? './public/ncs-test.mp3' : './ncs-test.mp3';
      this.testBgm = new Audio(source);
      this.testBgm.loop = true;
      this.testBgm.volume = TEST_BGM_VOLUME;
    }

    void this.testBgm.play()
      .then(() => {
        this.testBgmActive = true;
        if (this.originalBgmGain != null && this.audio != null) {
          this.originalBgmGain.gain.setTargetAtTime(0, this.audio.currentTime, 0.035);
        }
      })
      .catch(() => {
        this.testBgmActive = false;
        this.startOriginalBgmLoop();
      });
  }

  private startOriginalBgmLoop() {
    if (this.audio == null || this.masterGain == null || this.originalBgm != null || this.testBgmActive) {
      return;
    }

    const source = this.audio.createBufferSource();
    const gain = this.audio.createGain();
    source.buffer = this.createOriginalBgmBuffer();
    source.loop = true;
    gain.gain.setValueAtTime(this.muted ? 0 : ORIGINAL_BGM_VOLUME, this.audio.currentTime);
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
    this.originalBgm = source;
    this.originalBgmGain = gain;
  }

  private createOriginalBgmBuffer() {
    if (this.audio == null) {
      throw new Error('Audio context is not ready');
    }

    const sampleRate = this.audio.sampleRate;
    const bpm = 176;
    const beat = 60 / bpm;
    const bars = 8;
    const duration = beat * 4 * bars;
    const buffer = this.audio.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);
    const bassPattern = [98, 98, 123, 98, 147, 147, 123, 110, 98, 98, 123, 98, 165, 147, 123, 110];
    const leadPattern = [392, 494, 587, 784, 659, 587, 494, 740, 440, 554, 659, 880, 740, 659, 587, 494];
    const twoPi = Math.PI * 2;

    for (let i = 0; i < data.length; i += 1) {
      const t = i / sampleRate;
      const stepFloat = t / (beat / 2);
      const step = Math.floor(stepFloat);
      const stepTime = (stepFloat - step) * (beat / 2);
      const beatIndex = Math.floor(t / beat);
      const barBeat = beatIndex % 4;
      const bassFreq = bassPattern[step % bassPattern.length];
      const leadFreq = leadPattern[step % leadPattern.length];
      const bassEnv = Math.max(0, 1 - stepTime / (beat * 0.92));
      const leadEnv = Math.max(0, 1 - stepTime / (beat * 0.42));
      const kickT = t % beat;
      const snareT = t % (beat * 2);
      const hatT = t % (beat / 2);
      const kick = barBeat === 0 || barBeat === 2 ? Math.sin(twoPi * (72 - kickT * 70) * kickT) * Math.exp(-kickT * 18) * 0.95 : 0;
      const snareSeed = Math.sin((i + step * 97) * 12.9898) * 43758.5453;
      const snareNoise = (snareSeed - Math.floor(snareSeed)) * 2 - 1;
      const snare = barBeat === 1 || barBeat === 3 ? snareNoise * Math.exp(-snareT * 12) * 0.28 : 0;
      const hatSeed = Math.sin((i + 41) * 78.233) * 16317.912;
      const hatNoise = (hatSeed - Math.floor(hatSeed)) * 2 - 1;
      const hat = hatNoise * Math.exp(-hatT * 52) * 0.075;
      const bass = Math.sin(twoPi * bassFreq * t) * bassEnv * 0.28;
      const leadPhase = (leadFreq * t) % 1;
      const leadWave = leadPhase < 0.5 ? 1 : -1;
      const lead = leadWave * leadEnv * 0.105;
      const sidechain = 0.7 + Math.min(0.3, kickT * 10);
      data[i] = Phaser.Math.Clamp((kick + snare + hat + (bass + lead) * sidechain) * 0.82, -0.92, 0.92);
    }

    return buffer;
  }

  private playKick(volume: number) {
    const throttle = sfxThrottleAllows(this.lastSfxAt, 'kick', this.time.now, 55);
    this.lastSfxAt = throttle.last;
    if (this.audio == null || this.muted || !this.sfxEnabled || !throttle.allowed) {
      return;
    }

    const safeVolume = Math.min(0.22, volume * SFX_VOLUME_MULTIPLIER);
    const now = this.audio.currentTime;
    const oscillator = this.audio.createOscillator();
    const gain = this.audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(118, now);
    oscillator.frequency.exponentialRampToValueAtTime(44, now + 0.11);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(safeVolume, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    oscillator.connect(gain);
    gain.connect(this.masterGain ?? this.audio.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.17);
  }

  private playNoiseBurst(volume: number, length: number, frequency: number, filterType: BiquadFilterType) {
    const throttle = sfxThrottleAllows(this.lastSfxAt, 'noise', this.time.now, 38);
    this.lastSfxAt = throttle.last;
    if (this.audio == null || this.muted || !this.sfxEnabled || !throttle.allowed) {
      return;
    }

    const safeVolume = Math.min(0.24, volume * SFX_VOLUME_MULTIPLIER);
    const buffer = this.audio.createBuffer(1, Math.max(1, Math.floor(this.audio.sampleRate * length)), this.audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }

    const source = this.audio.createBufferSource();
    const filter = this.audio.createBiquadFilter();
    const gain = this.audio.createGain();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = filterType === 'bandpass' ? 1.8 : 0.8;
    gain.gain.setValueAtTime(safeVolume, this.audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.audio.currentTime + length);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain ?? this.audio.destination);
    source.start();
  }

  private playTone(notes: number[], length: number, volume = 0.075, type: OscillatorType = 'triangle') {
    const key = `tone:${type}:${notes[0] ?? 0}`;
    const throttle = sfxThrottleAllows(this.lastSfxAt, key, this.time.now, notes.length > 2 ? 45 : 28);
    this.lastSfxAt = throttle.last;
    if (this.audio == null || this.muted || !this.sfxEnabled || !throttle.allowed) {
      return;
    }

    const safeVolume = Math.min(0.22, volume * SFX_VOLUME_MULTIPLIER);
    const now = this.audio.currentTime;
    notes.forEach((note, index) => {
      const oscillator = this.audio?.createOscillator();
      const gain = this.audio?.createGain();

      if (oscillator == null || gain == null || this.audio == null) {
        return;
      }

      oscillator.type = type;
      oscillator.frequency.value = note;
      gain.gain.setValueAtTime(0.0001, now + index * length);
      gain.gain.exponentialRampToValueAtTime(safeVolume, now + index * length + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * length + length);
      oscillator.connect(gain);
      gain.connect(this.masterGain ?? this.audio.destination);
      oscillator.start(now + index * length);
      oscillator.stop(now + index * length + length + 0.02);
    });
  }
}
