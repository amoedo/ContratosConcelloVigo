import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, HeatmapChart, LineChart, PieChart, ScatterChart } from 'echarts/charts';
import { DatasetComponent, GridComponent, LegendComponent, TitleComponent, TooltipComponent, TransformComponent } from 'echarts/components';
import { LabelLayout, UniversalTransition } from 'echarts/features';
import { SVGRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';

echarts.use([
  BarChart, HeatmapChart, LineChart, PieChart, ScatterChart,
  DatasetComponent, GridComponent, LegendComponent, TitleComponent, TooltipComponent, TransformComponent,
  LabelLayout, UniversalTransition, SVGRenderer,
]);

interface EChartProps {
  option: EChartsCoreOption;
  height?: number;
  description?: string;
}

export function EChart({ option, height = 320, description = 'Visualización de datos interactiva' }: EChartProps) {
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

  return <div ref={ref} role="img" aria-label={description} style={{ width: '100%', height }} />;
}
