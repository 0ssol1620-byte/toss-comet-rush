import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transformSync } from 'esbuild';

const sourcePath = fileURLToPath(new URL('../src/game/progression.ts', import.meta.url));
const { code } = transformSync(readFileSync(sourcePath, 'utf8'), {
  loader: 'ts',
  format: 'esm',
  target: 'es2022',
});
const out = join(mkdtempSync(join(tmpdir(), 'comet-progression-')), 'progression.mjs');
writeFileSync(out, code);
const progression = await import(pathToFileURL(out));

const {
  buildRetryHook,
  missionProgress,
  missionRewardState,
  evolutionHint,
  firstRunAssistProfile,
  spawnOddsProfile,
  resolvePerformanceProfile,
  resultShareCopy,
  collectionProgress,
  streakLoginReward,
  updateStreakState,
  achievementProgress,
  weeklyMissionProgress,
  rareEventForRun,
  stageAlertTier,
  stageDifficulty,
  stageSpeedMultiplier,
  shouldAutoDowngradeQuality,
  nextRuntimeQuality,
  sfxThrottleAllows,
  actorJuiceProfile,
  nearMissJuiceProfile,
  comboRhythmProfile,
  upgradeChoicePresentation,
  upgradeChoiceIndexAt,
  skillPressureProfile,
  comboCollectionPolicy,
  nextComboAfterCollect,
  nextComboAfterMiss,
  doubleRewardAdState,
  frozenHazardSpeed,
  nearMissGrade,
  resultVerdict,
  rewardAdTransition,
  activePlayScoreMultiplier,
  isHeldPowerItem,
  addHeldItem,
  consumeHeldItem,
  autopilotCollisionPolicy,
  runRankLabel,
} = progression;

assert.equal(
  buildRetryHook({
    resultUnlockedStage: true,
    score: 150000,
    previousBest: 120000,
    nextSkin: { name: '절약왕 금고', unlock: 24000 },
    stageTarget: 220000,
    missionRemaining: 2,
    credits: 400,
    nextMetaCost: 510,
  }),
  '다음 스테이지가 열렸어요',
);

assert.equal(
  buildRetryHook({
    resultUnlockedStage: false,
    score: 23500,
    previousBest: 30000,
    nextSkin: { name: '절약왕 금고', unlock: 24000 },
    stageTarget: 50000,
    missionRemaining: 1,
    credits: 40,
    nextMetaCost: 90,
  }),
  '절약왕 금고까지 500점',
);

assert.equal(missionProgress({ shards: 90, nearMiss: 12, maxCombo: 36 }).completed, 3);
assert.deepEqual(missionRewardState({ shards: 90, nearMiss: 12, maxCombo: 36 }, false), {
  complete: true,
  claimable: true,
  reward: 300,
});
assert.equal(missionRewardState({ shards: 90, nearMiss: 12, maxCombo: 36 }, true).claimable, false);
assert.equal(missionProgress({ shards: 87, nearMiss: 11, maxCombo: 36 }).remainingText, '현금봉투 3개 · 가까이 회피 1회');

assert.equal(evolutionHint('magnet', { magnet: 0, rebate: 1, overtime: 0, shield: 0, payday: 0, slow: 0 }), '선택 시 EVO 자동환급장 완성');
assert.equal(evolutionHint('payday', { magnet: 0, rebate: 0, overtime: 0, shield: 0, payday: 0, slow: 0 }), '13월의 월급까지 1단계');

assert.equal(firstRunAssistProfile(0, 4).hazardMultiplier, 0.72);
assert.equal(firstRunAssistProfile(0, 11.5).guaranteeMagnet, true);
assert.equal(firstRunAssistProfile(0, 13).guaranteeMagnet, false);
assert.equal(firstRunAssistProfile(1, 4).hazardMultiplier, 1);
const stage2Odds = spawnOddsProfile({ stageId: 2, difficulty: 1.8, tier: 1, hp: 3, clutch: false, assistHazardMultiplier: 1, pressureHazardBonus: 0.06, powerItemChance: 0.047 });
assert.ok(stage2Odds.hazardChance > 0.3);
assert.ok(stage2Odds.powerChance - stage2Odds.pulseChance < 0.06);
assert.ok(stage2Odds.coinThreshold >= 0.94);
const clutchOdds = spawnOddsProfile({ stageId: 6, difficulty: 4.85, tier: 8, hp: 1, clutch: true, assistHazardMultiplier: 1, pressureHazardBonus: 0.12, powerItemChance: 0.085 });
assert.ok(clutchOdds.hazardChance <= clutchOdds.pulseChance);
assert.ok(clutchOdds.pulseChance <= clutchOdds.powerChance);
assert.ok(clutchOdds.powerChance <= clutchOdds.boostChance);
assert.ok(clutchOdds.boostChance < 1);

assert.deepEqual(resolvePerformanceProfile({ deviceMemory: 1, hardwareConcurrency: 2, saveQuality: 'auto' }), {
  quality: 'low',
  starCount: 40,
  speedLineCount: 6,
  nebulaCount: 1,
  particleMultiplier: 0.35,
  maxPopupsPerSecond: 6,
});
assert.equal(resolvePerformanceProfile({ deviceMemory: 8, hardwareConcurrency: 8, saveQuality: 'high' }).starCount, 88);
assert.ok(resolvePerformanceProfile({ deviceMemory: 4, hardwareConcurrency: 4, saveQuality: 'auto' }).particleMultiplier <= 0.55);
assert.equal(updateStreakState({ lastLoginDate: '', current: 0, best: 0 }, '2026-04-29').current, 1);
assert.deepEqual(updateStreakState({ lastLoginDate: '2026-04-28', current: 2, best: 2 }, '2026-04-29'), {
  lastLoginDate: '2026-04-29',
  current: 3,
  best: 3,
  rewardClaimedDate: '',
});
assert.equal(updateStreakState({ lastLoginDate: '2026-04-27', current: 4, best: 5 }, '2026-04-29').current, 1);
assert.equal(achievementProgress({ score: 120000, nearMiss: 14, maxCombo: 42, stageCleared: true, noHit: true }).filter((a) => a.unlocked).length, 5);
assert.equal(weeklyMissionProgress({ score: 500000, nearMiss: 6, fever: 2, plays: 1 }).completed, 1);
assert.equal(weeklyMissionProgress({ score: 500000, nearMiss: 45, fever: 9, plays: 7 }).complete, true);
assert.equal(rareEventForRun({ plays: 3, elapsedSeconds: 18, score: 65000, feverCount: 1 }), 'goldenSalary');
assert.equal(rareEventForRun({ plays: 2, elapsedSeconds: 50, score: 30000, feverCount: 0 }), 'taxRefundRush');

assert.equal(streakLoginReward({ lastLoginDate: '2026-04-29', current: 1, best: 1 }), 100);
assert.equal(streakLoginReward({ lastLoginDate: '2026-04-29', current: 7, best: 7 }), 500);
assert.equal(streakLoginReward({ lastLoginDate: '2026-04-29', current: 7, best: 7, rewardClaimedDate: '2026-04-29' }), 0);

const collection = collectionProgress({ unlockedSkins: 3, achievements: 4, stages: 2, evolutions: 1 });
assert.equal(collection.completed, 10);
assert.equal(collection.total, 22);
assert.match(collection.summary, /EVO 1\/3/);
assert.match(resultShareCopy({ score: 284500, rank: 'SS', nearMiss: 19, feverCount: 4 }), /월급 284,500원/);

assert.equal(stageAlertTier({ baseAlertTier: 0 }, 0, 50000, 9), 0);
assert.equal(stageAlertTier({ baseAlertTier: 1 }, 0, 50000, 9), 1);
assert.equal(stageAlertTier({ baseAlertTier: 2 }, 100000, 50000, 9), 4);
assert.ok(stageDifficulty({ id: 1, baseDifficulty: 0, speedBonus: 0 }, 0, 0, 60, 4.85) < 1.05);
assert.ok(stageDifficulty({ id: 2, baseDifficulty: 0.45, speedBonus: 0.12 }, 0, 1, 60, 4.85) >= 1.7);
assert.ok(stageDifficulty({ id: 4, baseDifficulty: 1.05, speedBonus: 0.26 }, 55, 4, 5, 4.85) > 4.2);
assert.equal(stageSpeedMultiplier({ speedBonus: 0.12, minStartSpeedMultiplier: 1.18 }, 0, 2.45), 1.18);
assert.ok(stageSpeedMultiplier({ speedBonus: 0.44, minStartSpeedMultiplier: 1.68 }, 5, 2.45) >= 2);
assert.equal(shouldAutoDowngradeQuality({ saveQuality: 'auto', lowFpsSeconds: 4, quality: 'medium' }), true);
assert.equal(shouldAutoDowngradeQuality({ saveQuality: 'high', lowFpsSeconds: 9, quality: 'high' }), false);
assert.equal(nextRuntimeQuality('high'), 'medium');
assert.equal(nextRuntimeQuality('medium'), 'low');
assert.equal(nextRuntimeQuality('low'), 'ultra-low');
assert.deepEqual(sfxThrottleAllows({}, 'collect', 1000, 38), { allowed: true, last: { collect: 1000 } });
assert.equal(sfxThrottleAllows({ collect: 1000 }, 'collect', 1020, 38).allowed, false);
assert.equal(sfxThrottleAllows({ collect: 1000 }, 'collect', 1040, 38).allowed, true);

assert.deepEqual(actorJuiceProfile('hazard', 4, 0), { scale: 1.16, laneWobble: 0, aura: 1 });
assert.ok(actorJuiceProfile('rent', 5, 2).scale > actorJuiceProfile('sub', 5, 2).scale);
assert.ok(actorJuiceProfile('coin', 2, 3).scale > actorJuiceProfile('coin', 2, 0).scale);
assert.deepEqual(nearMissJuiceProfile(1), { label: '스침!', scoreBonus: 260, shake: 0.004, pitch: 740, freezeMs: 18 });
assert.deepEqual(nearMissJuiceProfile(6), { label: '아슬회피 x6', scoreBonus: 640, shake: 0.009, pitch: 1040, freezeMs: 26 });
assert.deepEqual(comboRhythmProfile(1), { multiplier: 1, beat: 1, pitch: 520, label: '1 COMBO' });
assert.deepEqual(comboRhythmProfile(12), { multiplier: 1.6, beat: 4, pitch: 820, label: '12 COMBO' });
assert.deepEqual(comboRhythmProfile(30), { multiplier: 2.2, beat: 8, pitch: 1180, label: 'FEVER 30' });

assert.deepEqual(upgradeChoicePresentation(844), {
  titleY: 146,
  subtitleY: 184,
  cardStartY: 218,
  cardGap: 132,
  cardWidth: 334,
  cardHeight: 112,
  layerDepth: 140,
  overlayAlpha: 0.82,
  hideGameplayHud: true,
});
assert.ok(upgradeChoicePresentation(568).cardGap <= 118);
assert.equal(upgradeChoicePresentation(568).hideGameplayHud, true);
assert.equal(upgradeChoiceIndexAt(upgradeChoicePresentation(844), 195, 274), 0);
assert.equal(upgradeChoiceIndexAt(upgradeChoicePresentation(844), 195, 406), 1);
assert.equal(upgradeChoiceIndexAt(upgradeChoicePresentation(844), 20, 274), -1);
assert.equal(upgradeChoiceIndexAt(upgradeChoicePresentation(844), 195, 184), -1);

assert.deepEqual(skillPressureProfile({ stageId: 2, combo: 124, hp: 3, elapsedSeconds: 15, score: 67765 }), {
  spawnReductionMs: 78,
  hazardBonus: 0.062,
  speedBonus: 0.12,
  doubleSpawnBonus: 0.16,
  label: '실력자 압박',
});
assert.equal(skillPressureProfile({ stageId: 1, combo: 3, hp: 1, elapsedSeconds: 8, score: 1000 }).hazardBonus, 0);

assert.deepEqual(comboCollectionPolicy('shard'), { countsForCombo: true, resetsComboOnMiss: true });
assert.deepEqual(comboCollectionPolicy('coin'), { countsForCombo: true, resetsComboOnMiss: true });
assert.deepEqual(comboCollectionPolicy('boost'), { countsForCombo: false, resetsComboOnMiss: false });
assert.deepEqual(comboCollectionPolicy('pulse'), { countsForCombo: false, resetsComboOnMiss: false });
assert.equal(nextComboAfterCollect({ currentCombo: 7, lastCollectMs: 1000, nowMs: 2300, comboGraceMs: 1650, kind: 'shard' }), 8);
assert.equal(nextComboAfterCollect({ currentCombo: 7, lastCollectMs: 1000, nowMs: 2300, comboGraceMs: 1650, kind: 'boost' }), 7);
assert.equal(nextComboAfterCollect({ currentCombo: 7, lastCollectMs: 1000, nowMs: 3800, comboGraceMs: 1650, kind: 'coin' }), 1);
assert.equal(nextComboAfterMiss({ currentCombo: 12, kind: 'shard' }), 0);
assert.equal(nextComboAfterMiss({ currentCombo: 12, kind: 'boost' }), 12);
assert.deepEqual(comboRhythmProfile(30), { multiplier: 2.2, beat: 8, pitch: 1180, label: 'FEVER 30' });

assert.deepEqual(doubleRewardAdState({ claimed: false, usesToday: 0, dailyLimit: 5, supported: true, inFlight: false }), {
  canShow: true,
  reason: 'ready',
});
assert.deepEqual(doubleRewardAdState({ claimed: true, usesToday: 0, dailyLimit: 5, supported: true, inFlight: false }), {
  canShow: false,
  reason: 'claimed',
});
assert.deepEqual(doubleRewardAdState({ claimed: false, usesToday: 5, dailyLimit: 5, supported: true, inFlight: false }), {
  canShow: false,
  reason: 'limit',
});
assert.deepEqual(doubleRewardAdState({ claimed: false, usesToday: 0, dailyLimit: 5, supported: false, inFlight: false }), {
  canShow: false,
  reason: 'unsupported',
});
assert.deepEqual(doubleRewardAdState({ claimed: false, usesToday: 0, dailyLimit: 5, supported: true, inFlight: true }), {
  canShow: false,
  reason: 'inFlight',
});

assert.equal(frozenHazardSpeed({ baseSpeed: 500, currentFrozenUntil: 0, nowMs: 1000, durationMs: 2100 }).speed, 190);
assert.equal(frozenHazardSpeed({ baseSpeed: 500, currentFrozenUntil: 3100, nowMs: 1200, durationMs: 2100 }).speed, 190);
assert.equal(frozenHazardSpeed({ baseSpeed: 500, currentFrozenUntil: 3100, nowMs: 5300, durationMs: 2100 }).speed, 500);

assert.equal(resolvePerformanceProfile({ deviceMemory: 0.5, hardwareConcurrency: 1, saveQuality: 'auto' }).quality, 'ultra-low');
assert.deepEqual(nextRuntimeQuality('low'), 'ultra-low');
assert.deepEqual(nextRuntimeQuality('ultra-low'), 'ultra-low');
assert.equal(shouldAutoDowngradeQuality({ saveQuality: 'auto', lowFpsSeconds: 2, severeLowFpsSeconds: 2, quality: 'low' }), true);
assert.equal(shouldAutoDowngradeQuality({ saveQuality: 'auto', lowFpsSeconds: 8, severeLowFpsSeconds: 0, quality: 'ultra-low' }), false);

assert.deepEqual(nearMissGrade(10), { grade: 'perfect', label: '말도 안 되는 회피', feverGain: 30, slowMoMs: 220, scoreMultiplier: 1.65 });
assert.deepEqual(nearMissGrade(24), { grade: 'great', label: '초근접 회피', feverGain: 18, slowMoMs: 0, scoreMultiplier: 1.28 });
assert.deepEqual(nearMissGrade(48), { grade: 'normal', label: '가까이 회피', feverGain: 10, slowMoMs: 0, scoreMultiplier: 1 });
assert.equal(nearMissGrade(88).grade, 'none');

assert.equal(resultVerdict({ score: 100000, previousBest: 90000, nearMiss: 2, maxCombo: 4, stageCleared: false }), '신기록! 월급 방어력 폭발');
assert.equal(resultVerdict({ score: 80000, previousBest: 90000, nearMiss: 13, maxCombo: 4, stageCleared: false }), '아슬회피 장인급 플레이');
assert.equal(resultVerdict({ score: 80000, previousBest: 90000, nearMiss: 2, maxCombo: 40, stageCleared: false }), '콤보 루틴 완성');
assert.equal(resultVerdict({ score: 80000, previousBest: 90000, nearMiss: 2, maxCombo: 4, stageCleared: true }), '스테이지 돌파! 다음 구간 해금');

assert.deepEqual(rewardAdTransition('idle', 'load'), { state: 'loading', canReward: false });
assert.deepEqual(rewardAdTransition('loaded', 'show'), { state: 'showing', canReward: false });
assert.deepEqual(rewardAdTransition('showing', 'rewarded'), { state: 'loading', canReward: true });
assert.deepEqual(rewardAdTransition('showing', 'closed'), { state: 'loading', canReward: false });

assert.equal(isHeldPowerItem('magnetItem'), true);
assert.equal(isHeldPowerItem('shard'), false);
assert.deepEqual(addHeldItem([undefined, undefined], 'magnetItem'), { slots: ['magnetItem', undefined], added: true, index: 0, reason: 'stored' });
assert.deepEqual(addHeldItem(['magnetItem', undefined], 'freezeItem'), { slots: ['magnetItem', 'freezeItem'], added: true, index: 1, reason: 'stored' });
assert.deepEqual(addHeldItem(['magnetItem', 'freezeItem'], 'autopilotItem'), { slots: ['magnetItem', 'freezeItem'], added: false, index: -1, reason: 'full' });
assert.deepEqual(consumeHeldItem(['magnetItem', 'freezeItem'], 1), { slots: ['magnetItem', undefined], item: 'freezeItem', consumed: true });
assert.deepEqual(consumeHeldItem(['magnetItem', undefined], 1), { slots: ['magnetItem', undefined], item: undefined, consumed: false });
assert.deepEqual(autopilotCollisionPolicy(3500), { invincible: true, nearMissScoreMultiplier: 0.5, label: 'AI 방어봇 무적' });
assert.deepEqual(autopilotCollisionPolicy(0), { invincible: false, nearMissScoreMultiplier: 1, label: 'manual' });
assert.equal(activePlayScoreMultiplier({ manualInputs: 0, elapsedSeconds: 10 }), 0.34);
assert.equal(activePlayScoreMultiplier({ manualInputs: 1, elapsedSeconds: 10 }), 0.58);
assert.equal(activePlayScoreMultiplier({ manualInputs: 12, elapsedSeconds: 10 }), 1);
assert.equal(runRankLabel({ score: 520000, nearMiss: 0, maxCombo: 0, shards: 0, feverCount: 0, survived: true }), 'RANK A');
assert.equal(runRankLabel({ score: 520000, nearMiss: 8, maxCombo: 32, shards: 220, feverCount: 4, survived: true }), 'RANK SSS');

console.log('progression tests passed');
