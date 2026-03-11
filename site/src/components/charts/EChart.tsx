import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { EChartsCoreOption } from 'echarts';

interface EChartProps {
  option: EChartsCoreOption;
  height?: number;
}

export function EChart({ option, height = 320 }: EChartProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: 'svg' });
    chart.setOption(option);

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(ref.current);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [option]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}
