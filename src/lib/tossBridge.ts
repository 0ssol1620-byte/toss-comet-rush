export type HapticType =
  | 'tickWeak'
  | 'tap'
  | 'tickMedium'
  | 'softMedium'
  | 'basicWeak'
  | 'basicMedium'
  | 'success'
  | 'error'
  | 'wiggle'
  | 'confetti';

type Primitive = string | number | boolean | null | undefined;

type TossRuntime = {
  eventLog?: (params: {
    log_name: string;
    log_type: 'debug' | 'info' | 'warn' | 'error' | 'event' | 'screen' | 'impression' | 'click' | 'popup';
    params: Record<string, Primitive>;
  }) => Promise<void>;
  generateHapticFeedback?: (options: { type: HapticType }) => Promise<void>;
  getAnonymousKey?: () => Promise<{ type: 'HASH'; hash: string } | 'ERROR' | undefined>;
  getUserKeyForGame?: () => Promise<{ type: 'HASH'; hash: string } | 'INVALID_CATEGORY' | 'ERROR' | undefined>;
  openGameCenterLeaderboard?: () => Promise<void>;
  requestReview?: () => Promise<void>;
  submitGameCenterLeaderBoardScore?: (params: { score: string }) => Promise<{ statusCode: string } | undefined>;
};

export type TossBridge = {
  haptic: (type: HapticType) => void;
  identify: () => Promise<string>;
  log: (name: string, params?: Record<string, Primitive>, type?: 'event' | 'screen' | 'click' | 'info') => void;
  openLeaderboard: () => Promise<void>;
  requestReview: () => Promise<void>;
  submitScore: (score: number) => Promise<string>;
};

declare global {
  interface Window {
    ReactNativeWebView?: unknown;
    __appsInToss?: unknown;
  }
}

let tossRuntimePromise: Promise<TossRuntime | null> | null = null;

async function getTossRuntime(): Promise<TossRuntime | null> {
  if (tossRuntimePromise != null) {
    return tossRuntimePromise;
  }

  tossRuntimePromise = import('@apps-in-toss/web-framework')
    .then((module) => module as TossRuntime)
    .catch(() => null);

  return tossRuntimePromise;
}

function isAppsInTossRuntime() {
  return typeof window !== 'undefined' && (window.ReactNativeWebView != null || window.__appsInToss != null);
}

function vibrateFallback(type: HapticType) {
  if (!('vibrate' in navigator)) {
    return;
  }

  if (navigator.userActivation != null && !navigator.userActivation.hasBeenActive) {
    return;
  }

  const patterns: Partial<Record<HapticType, VibratePattern>> = {
    tap: 8,
    tickWeak: 6,
    tickMedium: 12,
    basicMedium: 18,
    success: [12, 24, 18],
    error: [28, 24, 28],
    confetti: [8, 16, 8, 16, 22],
  };

  navigator.vibrate(patterns[type] ?? 10);
}

function safeLocalUserId() {
  const key = 'comet-rush-user-id';
  const existing = (() => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  })();

  if (existing != null) {
    return existing;
  }

  const generated = `local-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
  try {
    localStorage.setItem(key, generated);
  } catch {
    // File previews or restricted WebViews may block storage.
  }
  return generated;
}

export function createTossBridge(): TossBridge {
  return {
    haptic(type) {
      void getTossRuntime().then((runtime) => {
        if (runtime?.generateHapticFeedback != null && isAppsInTossRuntime()) {
          return runtime.generateHapticFeedback({ type }).catch(() => vibrateFallback(type));
        }

        vibrateFallback(type);
      });
    },

    async identify() {
      const runtime = await getTossRuntime();

      if (runtime?.getUserKeyForGame != null && isAppsInTossRuntime()) {
        const result = await runtime.getUserKeyForGame().catch(() => undefined);

        if (result != null && result !== 'ERROR' && result !== 'INVALID_CATEGORY' && result.type === 'HASH') {
          return result.hash;
        }
      }

      if (runtime?.getAnonymousKey != null && isAppsInTossRuntime()) {
        const result = await runtime.getAnonymousKey().catch(() => undefined);

        if (result != null && result !== 'ERROR' && result.type === 'HASH') {
          return result.hash;
        }
      }

      return safeLocalUserId();
    },

    log(name, params = {}, type = 'event') {
      void getTossRuntime().then((runtime) => {
        if (runtime?.eventLog != null && isAppsInTossRuntime()) {
          return runtime.eventLog({ log_name: name, log_type: type, params }).catch(() => undefined);
        }

        if (import.meta.env.DEV) {
          console.info(`[comet-rush:${type}]`, name, params);
        }

        return undefined;
      });
    },

    async openLeaderboard() {
      const runtime = await getTossRuntime();

      if (runtime?.openGameCenterLeaderboard != null && isAppsInTossRuntime()) {
        await runtime.openGameCenterLeaderboard().catch(() => undefined);
      }
    },

    async requestReview() {
      const runtime = await getTossRuntime();

      if (runtime?.requestReview != null && isAppsInTossRuntime()) {
        await runtime.requestReview().catch(() => undefined);
      }
    },

    async submitScore(score) {
      const runtime = await getTossRuntime();

      if (runtime?.submitGameCenterLeaderBoardScore != null && isAppsInTossRuntime()) {
        const result = await runtime
          .submitGameCenterLeaderBoardScore({ score: String(score) })
          .catch(() => undefined);

        return result?.statusCode ?? 'UNAVAILABLE';
      }

      return 'LOCAL_ONLY';
    },
  };
}
