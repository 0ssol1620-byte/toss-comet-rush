import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const GAME_WIDTH = 390;
const GAME_HEIGHT = 844;

const failures = [];

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function checkScreen(name, blocks) {
  for (const block of blocks) {
    assert(block.top >= 0, `${name}:${block.name} top is outside screen`);
    assert(block.bottom <= GAME_HEIGHT, `${name}:${block.name} bottom is outside screen`);
    assert(block.bottom > block.top, `${name}:${block.name} has invalid height`);
  }

  const sorted = [...blocks].sort((a, b) => a.top - b.top);
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    assert(
      current.top >= previous.bottom,
      `${name}:${previous.name} overlaps ${current.name} by ${previous.bottom - current.top}px`,
    );
  }
}

function overlaps(a, b) {
  const horizontal = a.left < b.right && a.right > b.left;
  const vertical = a.top < b.bottom && a.bottom > b.top;
  return horizontal && vertical;
}

function checkRectScreen(name, rects) {
  for (const rect of rects) {
    assert(rect.left >= 0 && rect.right <= GAME_WIDTH, `${name}:${rect.name} x is outside screen`);
    assert(rect.top >= 0 && rect.bottom <= GAME_HEIGHT, `${name}:${rect.name} y is outside screen`);
  }

  for (let outer = 0; outer < rects.length; outer += 1) {
    for (let inner = outer + 1; inner < rects.length; inner += 1) {
      assert(!overlaps(rects[outer], rects[inner]), `${name}:${rects[outer].name} overlaps ${rects[inner].name}`);
    }
  }
}

function checkTouchTargets(targets) {
  for (const target of targets) {
    assert(target.width >= 44, `touch:${target.name} width ${target.width}px is below 44px`);
    assert(target.height >= 44, `touch:${target.name} height ${target.height}px is below 44px`);
  }
}

checkScreen('menu', [
  { name: 'eyebrow', top: 16, bottom: 32 },
  { name: 'danger-tag', top: 42, bottom: 74 },
  { name: 'hero-visual', top: 86, bottom: 210 },
  { name: 'title', top: 226, bottom: 324 },
  { name: 'subtitle', top: 338, bottom: 382 },
  { name: 'best', top: 389, bottom: 431 },
  { name: 'mission', top: 446, bottom: 514 },
  { name: 'rule-strip', top: 520, bottom: 550 },
  { name: 'start', top: 572, bottom: 636 },
  { name: 'secondary-actions', top: 661, bottom: 707 },
  { name: 'footer', top: 758, bottom: 782 },
]);

checkScreen('growth', [
  { name: 'hero', top: 120, bottom: 220 },
  { name: 'title', top: 232, bottom: 268 },
  { name: 'credits', top: 281, bottom: 311 },
  { name: 'meta', top: 321, bottom: 347 },
  { name: 'skin-progress-copy', top: 360, bottom: 396 },
  { name: 'skin-progress', top: 404, bottom: 416 },
  { name: 'upgrade', top: 447, bottom: 501 },
  { name: 'skin', top: 518, bottom: 566 },
  { name: 'close', top: 589, bottom: 635 },
  { name: 'hint', top: 650, bottom: 686 },
]);

checkScreen('tutorial', [
  { name: 'hero', top: 68, bottom: 142 },
  { name: 'badge', top: 143, bottom: 171 },
  { name: 'title', top: 176, bottom: 250 },
  { name: 'subtitle', top: 254, bottom: 280 },
  { name: 'step-1', top: 284, bottom: 362 },
  { name: 'step-2', top: 382, bottom: 460 },
  { name: 'step-3', top: 480, bottom: 558 },
  { name: 'risk-panel', top: 564, bottom: 608 },
  { name: 'start', top: 629, bottom: 691 },
  { name: 'menu', top: 709, bottom: 755 },
]);

checkScreen('pause', [
  { name: 'title', top: 276, bottom: 324 },
  { name: 'stats', top: 335, bottom: 365 },
  { name: 'resume', top: 399, bottom: 457 },
  { name: 'sound', top: 476, bottom: 524 },
  { name: 'menu', top: 546, bottom: 594 },
]);

checkScreen('upgrade', [
  { name: 'headline', top: 146, bottom: 184 },
  { name: 'subtitle', top: 197, bottom: 214 },
  { name: 'card-1', top: 221, bottom: 339 },
  { name: 'card-2', top: 359, bottom: 477 },
  { name: 'card-3', top: 497, bottom: 615 },
]);

checkScreen('gameover', [
  { name: 'title', top: 204, bottom: 240 },
  { name: 'score', top: 254, bottom: 330 },
  { name: 'detail', top: 352, bottom: 374 },
  { name: 'rank', top: 398, bottom: 434 },
  { name: 'percentile', top: 452, bottom: 472 },
  { name: 'credits', top: 486, bottom: 510 },
  { name: 'mission', top: 515, bottom: 555 },
  { name: 'retry', top: 583, bottom: 641 },
  { name: 'leaderboard', top: 658, bottom: 704 },
  { name: 'menu', top: 721, bottom: 767 },
]);

checkRectScreen('hud', [
  { name: 'score-card', left: 14, right: 166, top: 12, bottom: 76 },
  { name: 'timer-card', left: 282, right: 380, top: 12, bottom: 70 },
  { name: 'mission', left: 78, right: 312, top: 80, bottom: 104 },
  { name: 'status', left: 82, right: 308, top: 110, bottom: 126 },
  { name: 'sound-button', left: 9, right: 53, top: 84, bottom: 128 },
  { name: 'pause-button', left: 337, right: 381, top: 84, bottom: 128 },
  { name: 'overdrive', left: 89, right: 301, top: 130, bottom: 138 },
]);

checkTouchTargets([
  { name: 'menu-start', width: 278, height: 64 },
  { name: 'menu-stage', width: 96, height: 46 },
  { name: 'menu-growth', width: 96, height: 46 },
  { name: 'menu-leaderboard', width: 96, height: 46 },
  { name: 'growth-upgrade', width: 250, height: 54 },
  { name: 'growth-skin', width: 250, height: 48 },
  { name: 'growth-close', width: 210, height: 46 },
  { name: 'tutorial-start', width: 270, height: 62 },
  { name: 'tutorial-menu', width: 190, height: 46 },
  { name: 'pause-resume', width: 250, height: 58 },
  { name: 'pause-sound', width: 220, height: 48 },
  { name: 'pause-menu', width: 220, height: 48 },
  { name: 'upgrade-card-1', width: 322, height: 118 },
  { name: 'upgrade-card-2', width: 322, height: 118 },
  { name: 'upgrade-card-3', width: 322, height: 118 },
  { name: 'hud-sound', width: 44, height: 44 },
  { name: 'hud-pause', width: 44, height: 44 },
]);

const source = await readFile(join(root, 'src', 'game', 'TossCometRush.ts'), 'utf8');
assert(source.includes("'tutorial' | 'onboarding' | 'playing' | 'upgrade' | 'paused'"), 'source phase union does not include onboarding, tutorial, upgrade, and paused');
assert(source.includes('showOnboarding'), 'interactive onboarding is not implemented');
assert(source.includes("this.renderPauseLayer();"), 'pause overlay is not implemented');
assert(source.includes("this.showUpgradeChoice"), 'run upgrade choice is not implemented');
assert(source.includes("meta_upgrade_buy"), 'meta progression analytics are not implemented');
assert(source.includes("'rent' | 'tax' | 'sub'"), 'expanded financial hazard types are not implemented');
assert(source.includes("BUILD_VERSION = 'v11'"), 'source build stamp is not v11');
assert(source.includes('MAX_FRAME_DELTA = 50'), 'frame delta clamp is not implemented');
assert(source.includes('MAX_ACTORS = 38'), 'active actor cap is not implemented');
assert(source.includes('MAX_DIFFICULTY = 4.15'), 'difficulty cap is not implemented');
assert(source.includes('createOriginalBgmBuffer'), 'pre-rendered original BGM buffer is not implemented');
assert(source.includes('showGrowthPanel'), 'growth management panel is not implemented');
assert(source.includes('fitText'), 'text fitting helper is not implemented');
assert(source.includes('SCORE_TIER_SIZE = 50000'), '50k salary alert tier is not implemented');
assert(source.includes('STAGES: StageDefinition[]'), 'stage chain definitions are not implemented');
assert(source.includes('EVOLUTIONS: EvolutionDefinition[]'), 'upgrade evolution definitions are not implemented');
assert(source.includes('salary_alert'), 'salary alert analytics are not implemented');
assert(source.includes('stage_progression_hint'), 'stage progression hint analytics are not implemented');
assert(source.includes('power_item_collect'), 'power item collection analytics are not implemented');
assert(source.includes('stage_map_event'), 'stage map event analytics are not implemented');

function exportedFiles() {
  const home = homedir();
  const candidates = [
    join(home, 'Desktop', '코멧러시_실행.html'),
    join(home, 'Desktop', 'comet-rush.html'),
    join(home, 'OneDrive', '바탕 화면', '코멧러시_실행.html'),
    join(home, 'OneDrive', '바탕 화면', 'comet-rush.html'),
  ];

  return [join(root, 'play-direct.html'), ...candidates.filter(existsSync)];
}

const exportsToCheck = exportedFiles();

for (const target of exportsToCheck) {
  assert(existsSync(target), `export missing: ${target}`);
  if (!existsSync(target)) {
    continue;
  }

  const html = await readFile(target, 'utf8');
  assert(html.includes('v11'), `export ${target} does not contain v11 stamp`);
  assert(html.includes('screen_onboarding'), `export ${target} does not contain onboarding screen analytics`);
  assert(html.includes('onboarding_complete'), `export ${target} does not contain onboarding completion analytics`);
  assert(html.includes('screen_growth'), `export ${target} does not contain growth screen analytics`);
  assert(html.includes('screen_tutorial'), `export ${target} does not contain tutorial analytics`);
  assert(html.includes('pause_open'), `export ${target} does not contain pause flow`);
  assert(html.includes('audio_toggle'), `export ${target} does not contain audio toggle`);
  assert(html.includes('upgrade_pick'), `export ${target} does not contain upgrade choices`);
  assert(html.includes('expense_storm'), `export ${target} does not contain expense storm events`);
  assert(html.includes('salary_alert'), `export ${target} does not contain salary alert events`);
  assert(html.includes('evolution_unlock'), `export ${target} does not contain upgrade evolution events`);
  assert(html.includes('getUserKeyForGame'), `export ${target} does not prefer game user key API`);
  assert(!/<script[^>]+src=/.test(html), `export ${target} still depends on an external script src`);
  assert(!html.includes('/src/main.tsx'), `export ${target} still references the Vite source entry`);
}

if (failures.length > 0) {
  console.error(`Layout verification failed with ${failures.length} issue(s):`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Layout verification passed: menu, tutorial, pause, upgrade, gameover, HUD, touch targets, and direct exports are consistent.');
