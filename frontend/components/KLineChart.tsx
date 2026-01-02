import { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries,HistogramSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';
import type { KLineData } from '../src/types';
import type { HistogramData, Time } from 'lightweight-charts';

interface KLineChartProps {
  data: KLineData[];
  height?: number;
}

const KLineChart = ({ data, height = 350 }: KLineChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    if (!chartRef.current) {
      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: height,
        layout: {
          background: { type: ColorType.Solid, color: 'white' },
          textColor: '#333',
        },
        grid: {
          vertLines: { color: '#f0f0f0' },
          horzLines: { color: '#f0f0f0' },
        },
        crosshair: {
          mode: 0,
          vertLine: {
            width: 1,
            color: '#758696',
            style: 3,
          },
          horzLine: {
            width: 1,
            color: '#758696',
            style: 3,
          },
        },
        timeScale: {
          borderColor: '#f0f0f0',
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: '#f0f0f0',
        },
        handleScroll: {
          vertTouchDrag: false,
        },
      });

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#ef4444',
        downColor: '#22c55e',
        borderUpColor: '#ef4444',
        borderDownColor: '#22c55e',
        wickUpColor: '#ef4444',
        wickDownColor: '#22c55e',
      });

      const formattedData = data.map(item => ({
        time: new Date(item.tradeDate).getTime() / 1000,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      })) as CandlestickData[];

      candleSeries.setData(formattedData);

      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '', // 使用独立的价格轴
      });

      chart.priceScale('').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });


      const volumeData: HistogramData<Time>[] = data.map(item => ({
        time: Math.floor(new Date(item.tradeDate).getTime() / 1000) as Time,  // 要求为毫秒级时间戳
        value: item.vol,
        color: item.close > item.open ? '#ef4444' : '#22c55e',
      }));

      volumeSeries.setData(volumeData);

      const handleResize = () => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ 
            width: containerRef.current.clientWidth 
          });
        }
      };

      window.addEventListener('resize', handleResize);

      chartRef.current = chart;
      seriesRef.current = candleSeries;

      chart.timeScale().fitContent();

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    } else if (seriesRef.current) {
      const formattedData = data.map(item => ({
        time: new Date(item.tradeDate).getTime() / 1000,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      })) as CandlestickData[];

      seriesRef.current.setData(formattedData);
      chartRef.current.timeScale().fitContent();
    }
  }, [data, height]);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
};

export default KLineChart;
