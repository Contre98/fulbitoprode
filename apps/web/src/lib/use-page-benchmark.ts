"use client";

import { useEffect, useRef } from "react";

const BENCHMARK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_PAGE_BENCHMARK === "1";

export function usePageBenchmark(pageName: string, loading: boolean) {
  const startedAtRef = useRef(0);
  const reportedRef = useRef(false);

  useEffect(() => {
    if (!BENCHMARK_ENABLED || typeof performance === "undefined") {
      return;
    }
    startedAtRef.current = performance.now();
    reportedRef.current = false;
  }, [pageName]);

  useEffect(() => {
    if (!BENCHMARK_ENABLED || typeof performance === "undefined") {
      return;
    }
    if (reportedRef.current || loading) {
      return;
    }

    const durationMs = performance.now() - startedAtRef.current;
    console.info(`[bench] ${pageName} ready in ${Math.round(durationMs)}ms`);
    reportedRef.current = true;
  }, [pageName, loading]);
}

