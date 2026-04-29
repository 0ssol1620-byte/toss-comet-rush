export type UpgradeId = 'magnet' | 'rebate' | 'overtime' | 'shield' | 'payday' | 'slow';
export type RuntimeUpgrades = Record<UpgradeId, number>;

export type DailyMissionStats = {
  shards: number;
  nearMiss: number;
  maxCombo: number;
};

export type VisualQuality = 'auto' | 'low' | 'medium' | 'high';

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
    hazardMultiplier: firstRun && elapsedSeconds < 8 ? 0.6 : 1,
    freeShield: firstRun,
    guaranteeMagnet: firstRun && elapsedSeconds >= 12 && elapsedSeconds <= 15,
    minCredits: firstRun ? 100 : 0,
  };
}

export function resolvePerformanceProfile(input: {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  saveQuality?: VisualQuality;
}): PerformanceProfile {
  const forced = input.saveQuality !== 'auto' ? input.saveQuality : undefined;
  const weakDevice = (input.deviceMemory != null && input.deviceMemory <= 2) || (input.hardwareConcurrency != null && input.hardwareConcurrency <= 3);
  const quality = forced ?? (weakDevice ? 'low' : input.deviceMemory != null && input.deviceMemory >= 6 && (input.hardwareConcurrency ?? 4) >= 6 ? 'high' : 'medium');

  if (quality === 'low') {
    return { quality, starCount: 56, speedLineCount: 8, nebulaCount: 2, particleMultiplier: 0.45, maxPopupsPerSecond: 8 };
  }

  if (quality === 'medium') {
    return { quality, starCount: 88, speedLineCount: 12, nebulaCount: 3, particleMultiplier: 0.7, maxPopupsPerSecond: 12 };
  }

  return { quality, starCount: 128, speedLineCount: 18, nebulaCount: 5, particleMultiplier: 1, maxPopupsPerSecond: 18 };
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

export function shouldAutoDowngradeQuality(input: { saveQuality: VisualQuality; lowFpsSeconds: number; quality: Exclude<VisualQuality, 'auto'> }) {
  return input.saveQuality === 'auto' && input.lowFpsSeconds >= 4 && input.quality !== 'low';
}

export function nextRuntimeQuality(quality: Exclude<VisualQuality, 'auto'>): Exclude<VisualQuality, 'auto'> {
  if (quality === 'high') return 'medium';
  if (quality === 'medium') return 'low';
  return 'low';
}

export function sfxThrottleAllows(last: Record<string, number>, key: string, nowMs: number, minGapMs: number) {
  const previous = last[key] ?? 0;
  if (nowMs - previous < minGapMs) {
    return { allowed: false, last };
  }
  return { allowed: true, last: { ...last, [key]: nowMs } };
}

export type ActorJuiceKind = 'shard' | 'hazard' | 'rent' | 'tax' | 'sub' | 'pulse' | 'coin' | 'boost' | 'magnetItem' | 'shieldItem' | 'autopilotItem' | 'freezeItem' | 'droneItem' | 'boosterItem';

export function actorJuiceProfile(kind: ActorJuiceKind, stageId: number, spawnIndex: number) {
  const baseScale: Record<ActorJuiceKind, number> = {
    shard: 0.98,
    hazard: 1.12,
    rent: 1.34,
    tax: 1.16,
    sub: 0.92,
    pulse: 1.06,
    coin: 0.86,
    boost: 1,
    magnetItem: 1.08,
    shieldItem: 1.1,
    autopilotItem: 1.08,
    freezeItem: 1.08,
    droneItem: 1.05,
    boosterItem: 1.08,
  };
  const variant = kind === 'hazard' && spawnIndex === 0 ? 0 : ((spawnIndex % 5) - 2) * 0.045;
  const stageBoost = kind === 'hazard' && spawnIndex === 0 ? 0 : kind === 'coin' || kind === 'shard' ? Math.min(0.12, stageId * 0.018) : Math.min(0.16, stageId * 0.012);
  const scale = Math.round((baseScale[kind] + variant + stageBoost) * 100) / 100;
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
    label: capped >= 24 ? `FEVER ${capped} COMBO!!` : capped >= 8 ? `${capped} COMBO!` : `+${capped} COMBO`,
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
