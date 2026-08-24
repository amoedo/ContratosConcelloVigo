import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { EChartsCoreOption } from 'echarts/core';

import { useLanguage } from '@/lib/i18n';

const LazyEChart = lazy(() => import('./EChart').then((module) => ({ default: module.EChart })));

const COPY = {
  es: { loading: 'Cargando visualización…', idle: 'Visualización disponible al desplazarse' },
  gl: { loading: 'Cargando visualización…', idle: 'Visualización dispoñible ao desprazarse' },
} as const;

export function DeferredChart({ option, height = 320, description }: { option: EChartsCoreOption; height?: number; description?: string }) {
  const language = useLanguage();
  const copy = COPY[language];
  const anchor = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!anchor.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px' },
    );
    observer.observe(anchor.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={anchor} style={{ minHeight: height }}>
      {visible ? (
        <Suspense fallback={<div className="chart-loading">{copy.loading}</div>}>
          <LazyEChart option={option} height={height} description={description} />
        </Suspense>
      ) : (
        <div className="chart-loading">{copy.idle}</div>
      )}
    </div>
  );
}
