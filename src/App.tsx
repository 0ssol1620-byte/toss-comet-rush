import { useEffect, useRef } from 'react';
import { createFallbackCometRush } from './game/FallbackCanvasRush';
import { createTossBridge } from './lib/tossBridge';

export default function App() {
  const gameRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = gameRootRef.current;

    if (root == null) {
      return;
    }

    const bridge = createTossBridge();
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    let fallbackActive = false;
    root.dataset.cometReady = 'booting';

    const showFallback = (reason: unknown) => {
      if (cancelled || fallbackActive) {
        return;
      }

      fallbackActive = true;
      console.error('Comet Rush Phaser runtime failed. Canvas fallback started.', reason);
      cleanup?.();
      const fallback = createFallbackCometRush(root, bridge);
      root.dataset.cometReady = 'ready';
      cleanup = () => fallback.destroy();
    };

    const onError = (event: ErrorEvent) => {
      showFallback(event.error ?? event.message);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      showFallback(event.reason);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    void import('./game/TossCometRush')
      .then(({ createTossCometRush }) => {
        if (cancelled || fallbackActive) {
          return;
        }

        try {
          const game = createTossCometRush(root, bridge);
          cleanup = () => game.destroy(true);

          window.setTimeout(() => {
            if (!cancelled && !fallbackActive && root.dataset.cometReady !== 'ready') {
              showFallback(new Error('Phaser scene did not become ready.'));
            }
          }, 3500);
        } catch (error) {
          showFallback(error);
        }
      })
      .catch(showFallback);

    return () => {
      cancelled = true;
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      cleanup?.();
    };
  }, []);

  return (
    <main className="app-shell" aria-label="월급 방어전 게임">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div ref={gameRootRef} className="game-root" />
      <noscript>이 게임을 실행하려면 JavaScript가 필요합니다.</noscript>
    </main>
  );
}
