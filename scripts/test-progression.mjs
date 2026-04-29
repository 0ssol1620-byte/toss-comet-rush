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

const { buildRetryHook, missionProgress, missionRewardState, evolutionHint, firstRunAssistProfile } = progression;

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

assert.equal(firstRunAssistProfile(0, 4).hazardMultiplier, 0.6);
assert.equal(firstRunAssistProfile(0, 13).guaranteeMagnet, true);
assert.equal(firstRunAssistProfile(1, 4).hazardMultiplier, 1);

console.log('progression tests passed');
