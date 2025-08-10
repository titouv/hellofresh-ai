import { useCallback, useEffect, useRef, useState } from "react";

export type UseWakeLockResult = {
  isActive: boolean;
  error: Error | null;
  request: () => Promise<void>;
  release: () => Promise<void>;
  supported: boolean;
};

/**
 * Keeps the screen awake using the Screen Wake Lock API while `shouldLock` is true.
 * Automatically re-acquires the lock on visibility changes.
 */
export function useWakeLock(shouldLock: boolean): UseWakeLockResult {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const releaseListenerRef = useRef<EventListener | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const supported = typeof navigator !== "undefined" && !!navigator.wakeLock;

  const handleRelease = useCallback(() => {
    setIsActive(false);
  }, []);

  const request = useCallback(async () => {
    if (!supported) return;
    try {
      // Release previous lock if any
      if (sentinelRef.current && !sentinelRef.current.released) {
        if (releaseListenerRef.current) {
          sentinelRef.current.removeEventListener(
            "release",
            releaseListenerRef.current
          );
        }
        await sentinelRef.current.release();
      }

      const sentinel = await navigator.wakeLock!.request("screen");
      // Create a properly typed listener for EventTarget API
      const onRelease: EventListener = () => handleRelease();
      releaseListenerRef.current = onRelease;
      sentinel.addEventListener("release", onRelease);
      sentinelRef.current = sentinel;
      setIsActive(true);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setIsActive(false);
    }
  }, [supported, handleRelease]);

  const release = useCallback(async () => {
    try {
      if (sentinelRef.current) {
        if (releaseListenerRef.current) {
          sentinelRef.current.removeEventListener(
            "release",
            releaseListenerRef.current
          );
        }
        await sentinelRef.current.release();
      }
    } catch (err) {
      // Ignore release errors
    } finally {
      sentinelRef.current = null;
      releaseListenerRef.current = null;
      setIsActive(false);
    }
  }, [handleRelease]);

  // Acquire/release based on shouldLock
  useEffect(() => {
    if (!supported) return;
    if (shouldLock) {
      // Best-effort: request on next tick to remain close to user interaction
      void request();
    } else {
      void release();
    }
    // Cleanup on unmount
    return () => {
      void release();
    };
  }, [shouldLock, supported, request, release]);

  // Re-acquire on visibility changes (some browsers auto-release on tab hidden)
  useEffect(() => {
    if (!supported) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && shouldLock) {
        void request();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [supported, shouldLock, request]);

  return { isActive, error, request, release, supported };
}
