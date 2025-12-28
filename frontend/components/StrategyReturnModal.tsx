
import React, { useEffect, useRef, useState } from 'react';
import { Line } from '@antv/g2plot';
import { fetchStrategyReturns } from '../services/api';

interface StrategyReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategyName: string;
}

const StrategyReturnModal: React.FC<StrategyReturnModalProps> = ({ isOpen, onClose, strategyName }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Line | null>(null);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchStrategyReturns().then((res: any) => setData(res));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!containerRef.current || data.length === 0 || !isOpen) return;

    // Transform flat data for multi-line G2Plot
    const plotData: any[] = [];
    data.forEach(item => {
      plotData.push({ date: item.date, value: item.strategy, type: '本策略' });
      plotData.push({ date: item.date, value: item.benchmark, type: '基准' });
    });

    if (chartRef.current) {
      chartRef.current.changeData(plotData);
    } else {
      chartRef.current = new Line(containerRef.current, {
        data: plotData,
        xField: 'date',
        yField: 'value',
        seriesField: 'type',
        smooth: true,
        legend: { position: 'top' },
        color: ['#4f46e5', '#94a3b8'],
        tooltip: {
          shared: true,
          showMarkers: true,
        },
        point: {
          size: 2,
          shape: 'circle',
        },
        interactions: [{ type: 'marker-active' }],
      });
      chartRef.current.render();
    }
  }, [data, isOpen]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-8 relative z-10 animate-in fade-in zoom-in duration-300">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <header className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{strategyName} - 策略监控详情</h2>
          <p className="text-slate-500 mt-1">实时回测与基准收益对照 (最近60个交易日)</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: '年化收益', value: '+32.45%', color: 'text-rose-500', bg: 'bg-rose-50' },
            { label: '最大回撤', value: '-12.80%', color: 'text-emerald-500', bg: 'bg-emerald-50' },
            { label: '夏普比率', value: '1.85', color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: '胜率', value: '62.5%', color: 'text-blue-600', bg: 'bg-blue-50' }
          ].map((item, idx) => (
            <div key={idx} className={`${item.bg} p-5 rounded-xl border border-white shadow-sm`}>
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">{item.label}</div>
              <div className={`text-2xl font-black ${item.color}`}>{item.value}</div>
            </div>
          ))}
        </div>

        <div className="h-[400px] w-full bg-slate-50/50 rounded-xl p-4 border border-slate-100" ref={containerRef}></div>
        
        <footer className="mt-6 flex justify-between items-center text-xs text-slate-400">
          <div>* 历史收益不代表未来表现</div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-indigo-600 rounded-full mr-1"></span> 本策略
            <span className="w-3 h-3 bg-slate-400 rounded-full ml-4 mr-1"></span> 基准指数
          </div>
        </footer>
      </div>
    </div>
  );
};

export default StrategyReturnModal;
