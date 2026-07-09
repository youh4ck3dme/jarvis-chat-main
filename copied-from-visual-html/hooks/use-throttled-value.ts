import { useEffect, useRef, useState } from "react";

/** Returns `value` at most once per `delayMs` while delay is > 0. */
export function useThrottledValue<T>(value: T, delayMs: number): T {
  const [throttled, setThrottled] = useState(value);
  const latestRef = useRef(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  latestRef.current = value;

  useEffect(() => {
    if (delayMs <= 0) {
      setThrottled(value);
      return;
    }

    if (timeoutRef.current) return;

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setThrottled(latestRef.current);
    }, delayMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [value, delayMs]);

  return delayMs <= 0 ? value : throttled;
}
