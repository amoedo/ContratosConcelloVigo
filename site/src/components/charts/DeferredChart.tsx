import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { EChartsCoreOption } from 'echarts/core';

const LazyEChart = lazy(() => import('./EChart').then((module) => ({ default: module.EChart })));

export function DeferredChart({ option, height = 320, description }: { option: EChartsCoreOption; height?: number; description?: string }) {
  const anchor = useRef<HTMLDivElement | null>(null); const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!anchor.current) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, { rootMargin: '240px' });
    observer.observe(anchor.current); return () => observer.disconnect();
  }, []);
  return <div ref={anchor} style={{ minHeight: height }}>{visible ? <Suspense fallback={<div className="chart-loading">Cargando visualización…</div>}><LazyEChart option={option} height={height} description={description} /></Suspense> : <div className="chart-loading">Visualización disponible al desplazarse</div>}</div>;
}
