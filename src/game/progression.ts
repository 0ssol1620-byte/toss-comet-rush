export type UpgradeId = 'magnet' | 'rebate' | 'overtime' | 'shield' | 'payday' | 'slow';
export type RuntimeUpgrades = Record<UpgradeId, number>;

export type DailyMissionStats = {
  shards: number;
  nearMiss: number;
  maxCombo: number;
};

export type VisualQuality = 'auto' | 'ultra-low' | 'low' | 'medium' | 'high';

export type PerformanceProfile = {
  quality: Exclude<VisualQuality, 'auto'>;
  starCount: number;
  speedLineCount: number;
  nebulaCount: number;
  particleMultiplier: number;
  maxPopupsPerSecond: number;
};

export type StreakState = {
  lastLoginDate: string;
  current: number;
  best: number;
  rewardClaimedDate?: string;
};

export type RunSummary = {
  score: number;
  nearMiss: number;
  maxCombo: number;
  stageCleared: boolean;
  noHit: boolean;
};

export type WeeklyStats = {
  score: number;
  nearMiss: number;
  fever: number;
  plays: number;
};

export type RareEventId = 'goldenSalary' | 'taxRefundRush' | 'bonusTime' | undefined;
export type RewardAdState = 'unsupported' | 'idle' | 'loading' | 'loaded' | 'showing' | 'failed';
export type RewardAdEvent = 'load' | 'loaded' | 'show' | 'rewarded' | 'closed' | 'failed' | 'unsupported';

export const DAILY_MISSION_TARGETS = {
  shards: 90,
  nearMiss: 12,
  maxCombo: 36,
} as const;

export const DAILY_MISSION_REWARD = 300;

export const EVOLUTION_RECIPES: Array<{
  id: string;
  name: string;
  requires: [UpgradeId, UpgradeId];
}> = [
  { id: 'autoRefund', name: '자동환급장', requires: ['magnet', 'rebate'] },
  { id: 'debtFreeze', name: '채무동결', requires: ['shield', 'slow'] },
  { id: 'thirteenthPay', name: '13월의 월급', requires: ['payday', 'overtime'] },
];

export function formatKoreanNumber(value: number) {
  return Math.max(0, Math.ceil(value)).toLocaleString('ko-KR');
}

export function missionProgress(daily: DailyMissionStats) {
  const shardsLeft = Math.max(0, DAILY_MISSION_TARGETS.shards - daily.shards);
  const nearLeft = Math.max(0, DAILY_MISSION_TARGETS.nearMiss - daily.nearMiss);
  const comboLeft = Math.max(0, DAILY_MISSION_TARGETS.maxCombo - daily.maxCombo);
  const remaining = [
    shardsLeft > 0 ? `현금봉투 ${shardsLeft}개` : undefined,
    nearLeft > 0 ? `가까이 회피 ${nearLeft}회` : undefined,
    comboLeft > 0 ? `콤보 ${comboLeft}` : undefined,
  ].filter(Boolean) as string[];

  const completed = Number(shardsLeft === 0) + Number(nearLeft === 0) + Number(comboLeft === 0);

  return {
    completed,
    total: 3,
    complete: completed === 3,
    shardsDone: Math.min(DAILY_MISSION_TARGETS.shards, daily.shards),
    nearDone: Math.min(DAILY_MISSION_TARGETS.nearMiss, daily.nearMiss),
    comboDone: Math.min(DAILY_MISSION_TARGETS.maxCombo, daily.maxCombo),
    remainingText: remaining.length > 0 ? remaining.join(' · ') : '보상 수령 가능',
  };
}

export function missionRewardState(daily: DailyMissionStats, claimed: boolean) {
  const progress = missionProgress(daily);
  return {
    complete: progress.complete,
    claimable: progress.complete && !claimed,
    reward: DAILY_MISSION_REWARD,
  };
}

export function evolutionHint(upgradeId: UpgradeId, upgrades: RuntimeUpgrades) {
  const projected = { ...upgrades, [upgradeId]: upgrades[upgradeId] + 1 };
  const recipe = EVOLUTION_RECIPES.find((candidate) => candidate.requires.includes(upgradeId));
  if (recipe == null) {
    return undefined;
  }

  const missingAfterPick = recipe.requires.filter((required) => projected[required] <= 0).length;
  if (missingAfterPick === 0) {
    return `선택 시 EVO ${recipe.name} 완성`;
  }

  return `${recipe.name}까지 ${missingAfterPick}단계`;
}

export function buildRetryHook(input: {
  resultUnlockedStage: boolean;
  score: number;
  previousBest: number;
  nextSkin?: { name: string; unlock: number };
  stageTarget: number;
  missionRemaining?: number;
  credits: number;
  nextMetaCost: number;
}) {
  if (input.resultUnlockedStage) {
    return '다음 스테이지가 열렸어요';
  }

  if (input.nextSkin != null && input.score < input.nextSkin.unlock) {
    return `${input.nextSkin.name}까지 ${formatKoreanNumber(input.nextSkin.unlock - input.score)}점`;
  }

  if (input.missionRemaining != null && input.missionRemaining > 0) {
    return `오늘 미션 ${input.missionRemaining}개만 더`;
  }

  if (input.previousBest > 0 && input.score >= input.previousBest * 0.9) {
    return '신기록이 코앞이에요';
  }

  if (input.score < input.stageTarget) {
    return `스테이지 목표까지 ${formatKoreanNumber(input.stageTarget - input.score)}점`;
  }

  if (input.credits < input.nextMetaCost) {
    return `강화까지 코인 ${formatKoreanNumber(input.nextMetaCost - input.credits)}개`;
  }

  return '한 판 더 하면 강화할 수 있어요';
}

export function firstRunAssistProfile(plays: number, elapsedSeconds: number) {
  const firstRun = plays === 0;
  return {
    firstRun,
    hazardMultiplier: firstRun && elapsedSeconds < 6 ? 0.72 : 1,
    freeShield: firstRun,
    guaranteeMagnet: firstRun && elapsedSeconds >= 11 && elapsedSeconds <= 12.5,
    minCredits: firstRun ? 100 : 0,
  };
}

export function spawnOddsProfile(input: { stageId: number; difficulty: number; tier: number; hp: number; clutch: boolean; assistHazardMultiplier: number; pressureHazardBonus: number; powerItemChance: number }) {
  const stagePressure = Math.max(0, input.stageId - 1);
  const hazardChance = Math.min(
    0.66,
    Math.max(
      0.12,
      (0.15 + input.difficulty * 0.026 + input.tier * 0.038 + stagePressure * 0.016 + input.pressureHazardBonus + (input.clutch ? 0.06 : 0)) *
        input.assistHazardMultiplier,
    ),
  );
  const pulseChance = Math.min(0.84, hazardChance + (input.clutch ? 0.04 : 0.055));
  const powerChance = Math.min(0.91, pulseChance + input.powerItemChance);
  const boostChance = Math.min(0.96, powerChance + (input.hp <= 1 ? 0.075 : 0.035));
  const coinThreshold = input.clutch ? 0.9 : 0.94;
  return { hazardChance, pulseChance, powerChance, boostChance, coinThreshold };
}

export function resolvePerformanceProfile(input: {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  saveQuality?: VisualQuality;
}): PerformanceProfile {
  const forced = input.saveQuality !== 'auto' ? input.saveQuality : undefined;
  const ultraWeakDevice = (input.deviceMemory != null && input.deviceMemory <= 0.75) || (input.hardwareConcurrency != null && input.hardwareConcurrency <= 1);
  const weakDevice = (input.deviceMemory != null && input.deviceMemory <= 2) || (input.hardwareConcurrency != null && input.hardwareConcurrency <= 3);
  const quality = forced ?? (ultraWeakDevice ? 'ultra-low' : weakDevice ? 'low' : input.deviceMemory != null && input.deviceMemory >= 6 && (input.hardwareConcurrency ?? 4) >= 6 ? 'high' : 'medium');

  if (quality === 'ultra-low') {
    return { quality, starCount: 24, speedLineCount: 3, nebulaCount: 0, particleMultiplier: 0.2, maxPopupsPerSecond: 3 };
  }

  if (quality === 'low') {
    return { quality, starCount: 40, speedLineCount: 6, nebulaCount: 1, particleMultiplier: 0.35, maxPopupsPerSecond: 6 };
  }

  if (quality === 'medium') {
    return { quality, starCount: 64, speedLineCount: 8, nebulaCount: 2, particleMultiplier: 0.5, maxPopupsPerSecond: 8 };
  }

  return { quality, starCount: 88, speedLineCount: 12, nebulaCount: 3, particleMultiplier: 0.7, maxPopupsPerSecond: 12 };
}

function toUtcDay(date: string) {
  const parsed = Date.parse(`${date}T00:00:00.000Z`);
  return Number.isFinite(parsed) ? Math.floor(parsed / 86400000) : 0;
}

export function updateStreakState(previous: StreakState, today: string): StreakState {
  if (previous.lastLoginDate === today) {
    return { ...previous, best: Math.max(previous.best, previous.current) };
  }

  const yesterday = toUtcDay(today) - toUtcDay(previous.lastLoginDate) === 1;
  const current = yesterday ? Math.max(0, previous.current) + 1 : 1;
  return {
    lastLoginDate: today,
    current,
    best: Math.max(previous.best, current),
    rewardClaimedDate: '',
  };
}

export function achievementProgress(run: RunSummary) {
  return [
    { id: 'first-50k', title: '첫 월급 방어', unlocked: run.score >= 50000, reward: 120 },
    { id: 'near-master', title: '아슬회피 장인', unlocked: run.nearMiss >= 12, reward: 140 },
    { id: 'combo-36', title: '콤보 루틴 완성', unlocked: run.maxCombo >= 36, reward: 140 },
    { id: 'stage-clear', title: '스테이지 돌파', unlocked: run.stageCleared, reward: 180 },
    { id: 'no-hit', title: '무피격 칼퇴', unlocked: run.noHit && run.stageCleared, reward: 220 },
  ];
}

export function streakLoginReward(streak: StreakState) {
  if (streak.rewardClaimedDate === streak.lastLoginDate) {
    return 0;
  }
  if (streak.current >= 7) {
    return 500;
  }
  if (streak.current >= 3) {
    return 250;
  }
  return 100;
}

export function weeklyMissionProgress(week: WeeklyStats) {
  const goals = [
    { id: 'weekly-score', label: '주간 잔고 50만', done: week.score >= 500000 },
    { id: 'weekly-near', label: '아슬회피 45회', done: week.nearMiss >= 45 },
    { id: 'weekly-fever', label: '월급각성 9회', done: week.fever >= 9 },
    { id: 'weekly-plays', label: '7판 방어', done: week.plays >= 7 },
  ];
  const completed = goals.filter((goal) => goal.done).length;
  return { goals, completed, total: goals.length, complete: completed === goals.length, reward: 900 };
}

export type StageBalanceInput = {
  id: number;
  baseDifficulty: number;
  baseAlertTier?: number;
  speedBonus: number;
  minStartSpeedMultiplier?: number;
};

export function stageAlertTier(stage: { baseAlertTier?: number; id?: number }, score: number, tierSize: number, maxTier: number) {
  const base = Math.max(0, stage.baseAlertTier ?? Math.max(0, (stage.id ?? 1) - 1));
  const scoreTier = Math.max(0, Math.floor(score / tierSize));
  return Math.min(maxTier, base + scoreTier);
}

export function stageDifficulty(stage: StageBalanceInput, elapsedSeconds: number, alertTier: number, timeLeft: number, maxDifficulty: number) {
  const timePressure = elapsedSeconds / 30;
  const alertPressure = alertTier * 0.17;
  const stagePressure = stage.baseDifficulty + stage.speedBonus * 1.05;
  const clutchPressure = timeLeft <= 10 ? 0.22 : 0;
  const stageRampPressure = Math.min(0.35, (elapsedSeconds / 60) * Math.max(0, stage.id - 1) * 0.08);
  return Math.min(maxDifficulty, Math.max(1, 1 + timePressure + alertPressure + stagePressure + clutchPressure + stageRampPressure));
}

export function stageSpeedMultiplier(stage: { speedBonus: number; minStartSpeedMultiplier?: number }, alertTier: number, maxMultiplier: number) {
  const raw = 1 + alertTier * 0.115 + stage.speedBonus;
  const minimum = stage.minStartSpeedMultiplier ?? 1;
  return Math.min(maxMultiplier, Math.max(minimum, raw));
}

export function shouldAutoDowngradeQuality(input: { saveQuality: VisualQuality; lowFpsSeconds: number; severeLowFpsSeconds?: number; quality: Exclude<VisualQuality, 'auto'> }) {
  if (input.saveQuality !== 'auto' || input.quality === 'ultra-low') return false;
  return (input.severeLowFpsSeconds ?? 0) >= 2 || input.lowFpsSeconds >= 4;
}

export function nextRuntimeQuality(quality: Exclude<VisualQuality, 'auto'>): Exclude<VisualQuality, 'auto'> {
  if (quality === 'high') return 'medium';
  if (quality === 'medium') return 'low';
  return 'ultra-low';
}

export function sfxThrottleAllows(last: Record<string, number>, key: string, nowMs: number, minGapMs: number) {
  const previous = last[key] ?? 0;
  if (nowMs - previous < minGapMs) {
    return { allowed: false, last };
  }
  return { allowed: true, last: { ...last, [key]: nowMs } };
}

export type ActorJuiceKind = 'shard' | 'hazard' | 'rent' | 'tax' | 'sub' | 'pulse' | 'coin' | 'boost' | 'magnetItem' | 'shieldItem' | 'autopilotItem' | 'freezeItem' | 'droneItem' | 'boosterItem';

export function comboCollectionPolicy(kind: ActorJuiceKind) {
  const money = kind === 'shard' || kind === 'coin';
  return {
    countsForCombo: money,
    resetsComboOnMiss: money,
  };
}

export function nextComboAfterCollect(input: { currentCombo: number; lastCollectMs: number; nowMs: number; comboGraceMs: number; kind: ActorJuiceKind }) {
  if (!comboCollectionPolicy(input.kind).countsForCombo) {
    return input.currentCombo;
  }
  return input.nowMs - input.lastCollectMs < input.comboGraceMs ? input.currentCombo + 1 : 1;
}

export function nextComboAfterMiss(input: { currentCombo: number; kind: ActorJuiceKind }) {
  return comboCollectionPolicy(input.kind).resetsComboOnMiss ? 0 : input.currentCombo;
}

export type DoubleRewardAdReason = 'ready' | 'claimed' | 'limit' | 'unsupported' | 'inFlight' | 'empty';

export function doubleRewardAdState(input: { claimed: boolean; usesToday: number; dailyLimit: number; supported: boolean; inFlight: boolean; resultCredits?: number }) {
  if ((input.resultCredits ?? 1) <= 0) return { canShow: false, reason: 'empty' as DoubleRewardAdReason };
  if (input.claimed) return { canShow: false, reason: 'claimed' as DoubleRewardAdReason };
  if (input.inFlight) return { canShow: false, reason: 'inFlight' as DoubleRewardAdReason };
  if (input.usesToday >= input.dailyLimit) return { canShow: false, reason: 'limit' as DoubleRewardAdReason };
  if (!input.supported) return { canShow: false, reason: 'unsupported' as DoubleRewardAdReason };
  return { canShow: true, reason: 'ready' as DoubleRewardAdReason };
}

export function frozenHazardSpeed(input: { baseSpeed: number; currentFrozenUntil: number; nowMs: number; durationMs: number; multiplier?: number }) {
  const multiplier = input.multiplier ?? 0.38;
  const hasExistingFreeze = input.currentFrozenUntil > 0;
  const active = !hasExistingFreeze || input.nowMs < input.currentFrozenUntil;
  const frozenUntil = active ? Math.max(input.currentFrozenUntil, input.nowMs + input.durationMs) : input.currentFrozenUntil;
  return {
    frozenUntil,
    multiplier,
    speed: active ? Math.round(input.baseSpeed * multiplier * 1000) / 1000 : input.baseSpeed,
  };
}

export function nearMissGrade(margin: number) {
  if (margin > 0 && margin < 16) return { grade: 'perfect' as const, label: '말도 안 되는 회피', feverGain: 30, slowMoMs: 220, scoreMultiplier: 1.65 };
  if (margin > 0 && margin < 32) return { grade: 'great' as const, label: '초근접 회피', feverGain: 18, slowMoMs: 0, scoreMultiplier: 1.28 };
  if (margin > 0 && margin < 64) return { grade: 'normal' as const, label: '가까이 회피', feverGain: 10, slowMoMs: 0, scoreMultiplier: 1 };
  return { grade: 'none' as const, label: '', feverGain: 0, slowMoMs: 0, scoreMultiplier: 0 };
}

export function resultVerdict(input: { score: number; previousBest: number; nearMiss: number; maxCombo: number; stageCleared: boolean }) {
  if (input.score > input.previousBest) return '신기록! 월급 방어력 폭발';
  if (input.stageCleared) return '스테이지 돌파! 다음 구간 해금';
  if (input.nearMiss >= 12) return '아슬회피 장인급 플레이';
  if (input.maxCombo >= 36) return '콤보 루틴 완성';
  return '다음 판이면 바로 넘길 수 있어요';
}

export function rewardAdTransition(state: RewardAdState, event: RewardAdEvent): { state: RewardAdState; canReward: boolean } {
  if (state === 'unsupported') return { state: 'unsupported', canReward: false };
  if (event === 'unsupported') return { state: 'unsupported', canReward: false };
  if (event === 'load') return { state: 'loading', canReward: false };
  if (event === 'loaded' && state === 'loading') return { state: 'loaded', canReward: false };
  if (event === 'show' && state === 'loaded') return { state: 'showing', canReward: false };
  if (event === 'rewarded' && state === 'showing') return { state: 'loading', canReward: true };
  if ((event === 'closed' || event === 'failed') && state === 'showing') return { state: event === 'failed' ? 'failed' : 'loading', canReward: false };
  if (event === 'failed') return { state: 'failed', canReward: false };
  return { state, canReward: false };
}

export function actorJuiceProfile(kind: ActorJuiceKind, stageId: number, spawnIndex: number) {
  const baseScale: Record<ActorJuiceKind, number> = {
    shard: 0.94,
    hazard: 1.16,
    rent: 1.42,
    tax: 1.22,
    sub: 0.84,
    pulse: 1.02,
    coin: 0.82,
    boost: 1,
    magnetItem: 1.08,
    shieldItem: 1.1,
    autopilotItem: 1.08,
    freezeItem: 1.08,
    droneItem: 1.05,
    boosterItem: 1.08,
  };
  const variant = kind === 'hazard' && spawnIndex === 0 ? 0 : ((spawnIndex % 7) - 3) * 0.052;
  const threatVariance = kind === 'rent' ? (spawnIndex % 3) * 0.06 : kind === 'sub' ? -((spawnIndex % 2) * 0.05) : 0;
  const stageBoost = kind === 'hazard' && spawnIndex === 0 ? 0 : kind === 'coin' || kind === 'shard' ? Math.min(0.08, stageId * 0.012) : Math.min(0.18, stageId * 0.014);
  const scale = Math.round((baseScale[kind] + variant + threatVariance + stageBoost) * 100) / 100;
  return {
    scale,
    laneWobble: kind === 'sub' || kind === 'hazard' ? (spawnIndex % 3) * 8 : 0,
    aura: kind === 'rent' || kind === 'tax' ? 1.16 : kind === 'pulse' || kind === 'coin' ? 1.08 : 1,
  };
}

export function nearMissJuiceProfile(chain: number) {
  const capped = Math.min(8, Math.max(1, chain));
  return {
    label: capped <= 1 ? '스침!' : `아슬회피 x${capped}`,
    scoreBonus: 260 + (capped - 1) * 76,
    shake: Math.round((0.004 + Math.min(0.005, (capped - 1) * 0.001)) * 1000) / 1000,
    pitch: Math.min(1120, 680 + capped * 60),
    freezeMs: capped === 1 ? 18 : Math.min(30, 17 + Math.round(capped * 1.5)),
  };
}

export function comboRhythmProfile(combo: number) {
  const capped = Math.max(1, combo);
  const beat = capped >= 24 ? 8 : capped >= 8 ? 4 : capped >= 4 ? 2 : 1;
  const multiplier = capped >= 24 ? 2.2 : capped >= 12 ? 1.6 : capped >= 6 ? 1.3 : 1;
  const pitch = Math.min(1180, 500 + capped * 26.66);
  return {
    multiplier,
    beat,
    pitch: Math.round(pitch / 20) * 20,
    label: capped >= 24 ? `FEVER ${capped}` : capped >= 8 ? `${capped} COMBO` : `${capped} COMBO`,
  };
}

export function upgradeChoicePresentation(gameHeight: number) {
  const compact = gameHeight <= 620;
  return {
    titleY: compact ? 116 : 146,
    subtitleY: compact ? 148 : 184,
    cardStartY: compact ? 176 : 218,
    cardGap: compact ? 116 : 132,
    cardWidth: compact ? 318 : 334,
    cardHeight: compact ? 104 : 112,
    layerDepth: 140,
    overlayAlpha: 0.82,
    hideGameplayHud: true,
  };
}

export type UpgradeChoicePresentation = ReturnType<typeof upgradeChoicePresentation>;

export function upgradeChoiceIndexAt(layout: UpgradeChoicePresentation, x: number, y: number, count = 3, gameWidth = 390) {
  const left = gameWidth / 2 - layout.cardWidth / 2;
  const right = gameWidth / 2 + layout.cardWidth / 2;
  if (x < left || x > right) {
    return -1;
  }
  for (let index = 0; index < count; index += 1) {
    const top = layout.cardStartY + index * layout.cardGap;
    const bottom = top + layout.cardHeight;
    if (y >= top && y <= bottom) {
      return index;
    }
  }
  return -1;
}

export function skillPressureProfile(input: { stageId: number; combo: number; hp: number; elapsedSeconds: number; score: number }) {
  const skilled = input.elapsedSeconds >= 10 && input.hp >= 2 && (input.combo >= 24 || input.score >= input.stageId * 30000);
  if (!skilled) {
    return { spawnReductionMs: 0, hazardBonus: 0, speedBonus: 0, doubleSpawnBonus: 0, label: '' };
  }
  const comboTier = input.combo >= 96 ? 4 : input.combo >= 48 ? 3 : input.combo >= 24 ? 2 : 1;
  const stageTier = Math.max(1, input.stageId);
  return {
    spawnReductionMs: Math.min(96, 30 + comboTier * 12 + stageTier * 0),
    hazardBonus: Math.round(Math.min(0.085, 0.026 + comboTier * 0.009 + stageTier * 0.0) * 1000) / 1000,
    speedBonus: Math.round(Math.min(0.18, comboTier * 0.03) * 1000) / 1000,
    doubleSpawnBonus: Math.round(Math.min(0.22, 0.04 + comboTier * 0.03) * 1000) / 1000,
    label: '실력자 압박',
  };
}

export function collectionProgress(input: { unlockedSkins: number; achievements: number; stages: number; evolutions: number }) {
  const total = 8 + 5 + 6 + 3;
  const completed = Math.max(0, input.unlockedSkins) + Math.max(0, input.achievements) + Math.max(0, input.stages) + Math.max(0, input.evolutions);
  const percent = Math.min(100, Math.round((completed / total) * 100));
  return {
    completed,
    total,
    percent,
    summary: `수집률 ${percent}% · 스킨 ${input.unlockedSkins}/8 · 업적 ${input.achievements}/5 · 스테이지 ${input.stages}/6 · EVO ${input.evolutions}/3`,
  };
}

export function resultShareCopy(input: { score: number; rank: string; nearMiss: number; feverCount: number }) {
  return `나는 오늘 월급 ${formatKoreanNumber(input.score)}원을 방어했다. RANK ${input.rank} · 아슬회피 ${input.nearMiss}회 · 월급각성 ${input.feverCount}회. 너도 월급 지켜봐라.`;
}

export function rareEventForRun(input: { plays: number; elapsedSeconds: number; score: number; feverCount: number }): RareEventId {
  if (input.elapsedSeconds >= 16 && input.elapsedSeconds <= 24 && input.score >= 60000 && input.plays % 3 === 0) {
    return 'goldenSalary';
  }
  if (input.elapsedSeconds >= 48 && input.score >= 25000 && input.feverCount === 0) {
    return 'taxRefundRush';
  }
  if (input.elapsedSeconds >= 36 && input.score >= 120000 && input.feverCount >= 2) {
    return 'bonusTime';
  }
  return undefined;
}
