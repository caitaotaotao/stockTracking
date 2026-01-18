import { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { KLineData } from '../src/types';

interface KLineChartProps {
  data: KLineData[];
  height?: number;
}

const KLineChart = ({ data, height = 350 }: KLineChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !data || data.length === 0) return;

    // 清理旧图表
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // 容器宽度（避免 0 宽导致异常）
    const width = el.clientWidth || el.getBoundingClientRect().width || 0;
    if (width <= 0) return;

    // 创建图表
    const chart = createChart(el, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'white' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      timeScale: {
        borderColor: '#f0f0f0',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#f0f0f0',
      },
    });

    // v5：使用 addSeries(SeriesDefinition, options)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#ef4444',
      downColor: '#22c55e',
      borderUpColor: '#ef4444',
      borderDownColor: '#22c55e',
      wickUpColor: '#ef4444',
      wickDownColor: '#22c55e',
    });

    // tradeDate 为毫秒时间戳：转为秒（UTCTimestamp）
    const candleData = data
      .map(item => {
        const t = Math.floor(Number((item as any).tradeDate) / 1000) as UTCTimestamp;
        const open = Number((item as any).open);
        const high = Number((item as any).high);
        const low = Number((item as any).low);
        const close = Number((item as any).close);

        return { time: t, open, high, low, close };
      })
      .filter(d =>
        Number.isFinite(d.time) &&
        Number.isFinite(d.open) &&
        Number.isFinite(d.high) &&
        Number.isFinite(d.low) &&
        Number.isFinite(d.close)
      )
      .sort((a, b) => a.time - b.time);

    candleSeries.setData(candleData);

    // 成交量（Histogram）
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    // 单独的成交量轴（使用空字符串 id）
    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    const volumeData = data
      .map(item => {
        const t = Math.floor(Number((item as any).tradeDate) / 1000) as UTCTimestamp;
        const open = Number((item as any).open);
        const close = Number((item as any).close);
        const vol = Number((item as any).vol);

        return {
          time: t,
          value: vol,
          color: close >= open ? '#ef444480' : '#22c55e80',
        };
      })
      .filter(d => Number.isFinite(d.time) && Number.isFinite(d.value))
      .sort((a, b) => a.time - b.time);

    volumeSeries.setData(volumeData);

    // 自适应宽度：window resize + ResizeObserver
    const handleResize = () => {
      const node = containerRef.current;
      if (!node || !chartRef.current) return;

      const nextWidth = node.clientWidth || node.getBoundingClientRect().width || 0;
      if (nextWidth > 0) {
        chartRef.current.applyOptions({ width: nextWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(containerRef.current);
    }

    chartRef.current = chart;

    // 视图适配
    chart.timeScale().fitContent();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();

      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, height]);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
};

export default KLineChart;
