export type UpgradeId = 'magnet' | 'rebate' | 'overtime' | 'shield' | 'payday' | 'slow';
export type RuntimeUpgrades = Record<UpgradeId, number>;

export type DailyMissionStats = {
  shards: number;
  nearMiss: number;
  maxCombo: number;
};

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
