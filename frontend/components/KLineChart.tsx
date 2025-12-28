
import React, { useEffect, useRef } from 'react';
import { Stock as G2Stock } from '@antv/g2plot';
import { KLineData } from '../src/types';

interface KLineChartProps {
  data: KLineData[];
  height?: number;
}

const KLineChart: React.FC<KLineChartProps> = ({ data, height = 350 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<G2Stock | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    if (!chartRef.current) {
      chartRef.current = new G2Stock(containerRef.current, {
        data,
        xField: 'time',
        yField: ['open', 'close', 'high', 'low'],
        stockStyle: {
          stroke: '#f0f0f0',
          lineWidth: 0.5,
        },
        fallingFill: '#22c55e', // Green for fall in some markets, but we use typical Red/Green
        risingFill: '#ef4444', 
        tooltip: {
          showMarkers: false,
          crosshairs: {
            type: 'xy',
          },
        },
        yAxis: {
          label: {
            formatter: (v) => Number(v).toFixed(2),
          },
          grid: {
            line: {
              style: {
                stroke: '#f1f5f9',
                lineDash: [4, 5],
              },
            },
          },
        },
      });
      chartRef.current.render();
    } else {
      chartRef.current.changeData(data);
    }

    return () => {
      // We don't necessarily want to destroy on every data update, 
      // but if the component unmounts, we should.
    };
  }, [data]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
};

export default KLineChart;
