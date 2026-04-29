import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const css = await readFile(join(dist, 'assets', 'main.css'), 'utf8');
const js = await readFile(join(dist, 'assets', 'main.js'), 'utf8');
const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"
    />
    <meta name="theme-color" content="#07131f" />
    <meta name="description" content="60초 아케이드 생존 러너, 월급 지키기" />
    <title>월급 지키기</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">${js.replaceAll('</script', '<\\/script')}</script>
  </body>
</html>
`;

function desktopCandidates() {
  const home = homedir();
  const direct = join(home, 'Desktop');
  const onedrive = join(home, 'OneDrive', '바탕 화면');
  const candidates = [direct, onedrive].filter((dir, index, list) => list.indexOf(dir) === index);
  return candidates.filter((dir) => existsSync(dir));
}

const targets = [
  join(root, 'play-direct.html'),
  ...desktopCandidates().flatMap((dir) => [
    join(dir, '코멧러시_실행.html'),
    join(dir, 'comet-rush.html'),
    join(dir, 'Toss-Comet-Rush-Test.html'),
  ]),
];

for (const target of targets) {
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html);
}

const testBgm = join(root, 'public', 'ncs-test.mp3');
if (existsSync(testBgm)) {
  await Promise.all(
    desktopCandidates().map((dir) => copyFile(testBgm, join(dir, 'ncs-test.mp3')).catch(() => undefined)),
  );
}

console.log(`Exported direct play HTML to ${targets.length} locations.`);
