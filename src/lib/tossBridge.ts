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

export type AdReason = 'revive' | 'doubleReward' | 'headStart';

export type RewardAdState = 'unsupported' | 'idle' | 'loading' | 'loaded' | 'showing' | 'failed';

export type RewardAdResult = {
  supported: boolean;
  loaded: boolean;
  rewarded: boolean;
  status: 'rewarded' | 'closed' | 'failed' | 'unsupported';
};

type FullScreenAdRequest = { adUnitId?: string; placement?: string; adGroupId?: string };
type FullScreenAdFunction = ((args: {
  options?: FullScreenAdRequest;
  onEvent: (data: unknown) => void;
  onError: (error: Error) => void;
}) => () => void) & { isSupported?: () => boolean };

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
  loadRewardedAd?: (params?: { adUnitId?: string; placement?: string }) => Promise<unknown>;
  preloadRewardedAd?: (params?: { adUnitId?: string; placement?: string }) => Promise<unknown>;
  showRewardedAd?: (params?: { adUnitId?: string; placement?: string }) => Promise<unknown>;
  loadFullScreenAd?: FullScreenAdFunction;
  showFullScreenAd?: FullScreenAdFunction;
};

export type TossBridge = {
  haptic: (type: HapticType) => void;
  identify: () => Promise<string>;
  log: (name: string, params?: Record<string, Primitive>, type?: 'event' | 'screen' | 'click' | 'info') => void;
  openLeaderboard: () => Promise<void>;
  requestReview: () => Promise<void>;
  submitScore: (score: number) => Promise<string>;
  preloadRewardAd: (reason: AdReason) => Promise<{ supported: boolean; state: RewardAdState }>;
  showRewardAd: (reason: AdReason) => Promise<RewardAdResult>;
  getRewardAdState: (reason: AdReason) => RewardAdState;
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
    .then((module) => module as unknown as TossRuntime)
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
    softMedium: [8, 18, 10],
    basicWeak: 9,
    basicMedium: 18,
    success: [12, 24, 18],
    error: [28, 24, 28],
    wiggle: [10, 18, 10, 18, 10],
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

function adPlacement(reason: AdReason) {
  const envKey = `VITE_TOSS_REWARD_AD_${reason.toUpperCase()}`;
  return String(import.meta.env[envKey] ?? import.meta.env.VITE_TOSS_REWARD_AD_TEST_ID ?? `test-${reason}`);
}

function parseRewardResult(raw: unknown): RewardAdResult {
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    const rewarded = record.rewarded === true || record.status === 'rewarded' || record.type === 'rewarded' || record.result === 'rewarded';
    const closed = record.status === 'closed' || record.type === 'closed' || record.result === 'closed' || record.type === 'dismissed';
    return {
      supported: true,
      loaded: true,
      rewarded,
      status: rewarded ? 'rewarded' : closed ? 'closed' : 'failed',
    };
  }

  return { supported: true, loaded: true, rewarded: raw === true, status: raw === true ? 'rewarded' : 'closed' };
}

function waitFullScreenAd(fn: FullScreenAdFunction, params: FullScreenAdRequest, mode: 'load' | 'show') {
  return new Promise<unknown>((resolve, reject) => {
    let unsubscribe: (() => void) | undefined;
    const done = (value: unknown, failed = false) => {
      try {
        unsubscribe?.();
      } catch {
        // noop
      }
      if (failed) reject(value instanceof Error ? value : new Error(String(value)));
      else resolve(value);
    };

    try {
      unsubscribe = fn({
        options: params,
        onEvent: (event) => {
          const record = (event && typeof event === 'object' ? event : {}) as Record<string, unknown>;
          const type = String(record.type ?? record.status ?? record.eventType ?? '').toLowerCase();
          if (mode === 'load' && ['loaded', 'load', 'success', 'completed'].some((token) => type.includes(token))) {
            done(event);
          }
          if (mode === 'show' && ['reward', 'close', 'dismiss', 'fail', 'error', 'completed'].some((token) => type.includes(token))) {
            done(event);
          }
        },
        onError: (error) => done(error, true),
      });
    } catch (error) {
      done(error, true);
      return;
    }

    window.setTimeout(() => {
      if (mode === 'load') done({ type: 'loaded_timeout' });
    }, 2500);
  });
}

function isFullScreenAdSupported(fn?: FullScreenAdFunction) {
  try {
    return fn != null && (fn.isSupported?.() ?? true);
  } catch {
    return false;
  }
}

function isRewardAdSupported(runtime: TossRuntime | null) {
  if (!isAppsInTossRuntime() || runtime == null) return false;
  return isFullScreenAdSupported(runtime.loadFullScreenAd) && isFullScreenAdSupported(runtime.showFullScreenAd)
    ? true
    : runtime.showRewardedAd != null || runtime.loadRewardedAd != null || runtime.preloadRewardedAd != null;
}

function adParams(reason: AdReason): FullScreenAdRequest {
  const adUnitId = adPlacement(reason);
  return { adUnitId, adGroupId: adUnitId, placement: reason };
}

export function createTossBridge(): TossBridge {
  const rewardAdStates: Record<AdReason, RewardAdState> = {
    revive: 'idle',
    doubleReward: 'idle',
    headStart: 'idle',
  };

  const setRewardState = (reason: AdReason, state: RewardAdState) => {
    rewardAdStates[reason] = state;
  };

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

    async preloadRewardAd(reason) {
      const runtime = await getTossRuntime();
      if (!isRewardAdSupported(runtime)) {
        setRewardState(reason, 'unsupported');
        return { supported: false, state: 'unsupported' };
      }

      setRewardState(reason, 'loading');
      const params = adParams(reason);
      const toss = runtime as TossRuntime;
      try {
        if (isFullScreenAdSupported(toss.loadFullScreenAd) && toss.loadFullScreenAd != null) {
          await waitFullScreenAd(toss.loadFullScreenAd, params, 'load');
        } else if (toss.preloadRewardedAd != null) {
          await toss.preloadRewardedAd(params);
        } else if (toss.loadRewardedAd != null) {
          await toss.loadRewardedAd(params);
        }
        setRewardState(reason, 'loaded');
        return { supported: true, state: 'loaded' };
      } catch {
        setRewardState(reason, 'failed');
        return { supported: true, state: 'failed' };
      }
    },

    async showRewardAd(reason) {
      const runtime = await getTossRuntime();
      if (!isRewardAdSupported(runtime)) {
        setRewardState(reason, 'unsupported');
        return { supported: false, loaded: false, rewarded: false, status: 'unsupported' };
      }

      const params = adParams(reason);
      const toss = runtime as TossRuntime;
      setRewardState(reason, 'showing');
      try {
        const raw = isFullScreenAdSupported(toss.showFullScreenAd) && toss.showFullScreenAd != null
          ? await waitFullScreenAd(toss.showFullScreenAd, params, 'show')
          : await toss.showRewardedAd?.(params);
        const parsed = parseRewardResult(raw);
        setRewardState(reason, 'loading');
        void this.preloadRewardAd(reason);
        return parsed;
      } catch {
        setRewardState(reason, 'failed');
        void this.preloadRewardAd(reason);
        return { supported: true, loaded: true, rewarded: false, status: 'failed' };
      }
    },

    getRewardAdState(reason) {
      return rewardAdStates[reason];
    },
  };
}
