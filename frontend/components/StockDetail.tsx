
import { useState, useEffect } from 'react';
import type { Stock, TimeFrame, KLineData } from '../src/types';
import KLineChart from './KLineChart';
import AIAnalysisSection from './AIAnalysisSection';
import { fetchKLineData } from '../services/api';
import { Spin } from 'antd';

interface StockDetailProps {
  stock: Stock | null;
  aiTriggerKey: number;
  onAnalysisState?: (status: 'idle' | 'analyzing' | 'completed' | 'error', stock: Stock) => void;  // 分析状态回调
}

const StockDetail = ({ stock, aiTriggerKey, onAnalysisState }: StockDetailProps) => {
  const [timeframe, setTimeframe] = useState<TimeFrame>('day');
  const [klineData, setKlineData] = useState<KLineData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 只有当有选中的股票时才获取数据
    if (!stock) return;
    
    const loadKLineData = async () => {
      setIsLoading(true);
      try {
        // 使用API服务获取K线数据
        const data = await fetchKLineData(stock.code);
        setKlineData(data);
      } catch (error) {
        console.error('Error fetching K-line data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadKLineData();
  }, [timeframe, stock]);

  if (!stock) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 h-full bg-white">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>请在左侧列表中选择一只股票查看详情</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            {stock.shortName}
            <span className="ml-3 text-sm font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded">{stock.code}</span>
          </h1>
          {stock.themes && stock.themes.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {stock.themes.map((theme, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                  {theme}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          {(['day', 'week', 'month', 'year'] as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-1 text-xs font-medium rounded-md transition-all ${
                timeframe === tf ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tf === 'day' ? '日K' : tf === 'week' ? '周K' : tf === 'month' ? '月K' : '年K'}
            </button>
          ))}
        </div>
      </div>

      <div className="border rounded-xl p-4 mb-6 shadow-sm relative">
        <Spin
          spinning={isLoading}
          tip="K线数据加载中..."
          size="large"
          className="w-full h-full"
        >
          <KLineChart data={klineData} height={350} />
        </Spin>
      </div>

      <AIAnalysisSection stock={stock} triggerKey={aiTriggerKey} report_date='2025-09-30' onAnalysisState={onAnalysisState} />
    </div>
  );
};

export default StockDetail;
