import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import StrategyHeader from '../components/StrategyHeader';
import StockList from '../components/StockList';
import StockDetail from '../components/StockDetail';
import StrategyReturnModal from '../components/StrategyReturnModal';
import { fetchStrategies, fetchStocksByStrategy } from '../services/api';
import type { Strategy, Stock } from './types';
import { useFilter } from './FilterContext';
import { Layout } from 'antd';

const App = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<number>(0);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isMonitorOpen, setIsMonitorOpen] = useState(false);
  const [aiTriggerKey, setAiTriggerKey] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState<Record<string, 'idle' | 'analyzing' | 'completed'| 'error'>>({});
  const { filterValues } = useFilter();
  const { resetFilters } = useFilter();
  const { Content } = Layout;

  // 股票AI分析状态记录
  const handleAIResearch = (stock: Stock) => {
    setSelectedStock(stock);
    setAnalysisStatus(prev => ({
      ...prev,
      [stock.symbol]: 'analyzing'
    }));
    setAiTriggerKey(prev => prev + 1);
  };

  const handleAnalysisStatusChange = (status: 'idle' | 'analyzing' | 'completed' | 'error', stock: Stock) => {
    setAnalysisStatus(prev => ({
      ...prev,
      [stock.symbol]: status
    }));
  };

  // 初始化策略列表
  useEffect(() => {
    fetchStrategies().then((data: Strategy[]) => {
      // console.log('策略列表：', data);
      setStrategies(data);
      if (data.length > 0) setSelectedStrategyId(data[0].id);
    });
  }, []);

  // 策略ID变化后，重置筛选配置
  useEffect(() => {
    if (selectedStrategyId) {
      resetFilters();
    }
  }, [selectedStrategyId, resetFilters]);

  // 根据策略ID和筛选条件获取股票列表
  useEffect(() => {
    if (selectedStrategyId) {
      // 从筛选值中提取参数
      const reportDate = filterValues['报告期'] || '';
      const datePeriod = filterValues['date_period'] || 3;
      const stage = filterValues['stage'] || 1;

      fetchStocksByStrategy({
        strategy_id: Number(selectedStrategyId),
        report_date: reportDate,
        date_period: datePeriod,
        stage: stage,
      }).then((data: Stock[]) => {
        // 直接使用返回的数组数据
        setStocks(data);
        if (data.length > 0) setSelectedStock(data[0]);
      });
    }
  }, [selectedStrategyId, filterValues]);

  const selectedStrategy = strategies.find(s => s.id === selectedStrategyId);

  return (
    <Layout className="h-screen overflow-hidden">
      {/* 策略面板 */}
      <Sidebar 
        strategies={strategies} 
        selectedId={selectedStrategyId} 
        onSelect={setSelectedStrategyId} 
      />

      {/* 详情面板 */}
      <Layout className="bg-gray-100">
        <Content className="flex flex-col min-w-0">
          {/* 策略头部区域 */}
          <div className="bg-white shadow-sm">
            <StrategyHeader 
              strategyName={selectedStrategy?.name || '选择策略'}
              strategyId={selectedStrategyId}
              onOpenMonitor={() => setIsMonitorOpen(true)}
            />
          </div>

          {/* 详情面板 */}
          <div className="flex-1 flex overflow-hidden p-4 gap-4">
            {/* 左侧股票列表 */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <StockList 
                stocks={stocks} 
                selectedSymbol={selectedStock?.symbol || ''} 
                onSelectStock={setSelectedStock}
                onAIResearch={handleAIResearch}
                analysisStatus={analysisStatus}
              />
            </div>

            {/* K线及AI分析面板 */}
            <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden">
              <StockDetail 
                stock={selectedStock} 
                aiTriggerKey={aiTriggerKey}
                onAnalysisState={handleAnalysisStatusChange}
              />
            </div>
          </div>
        </Content>
      </Layout>

      {/* 策略回测弹窗 */}
      <StrategyReturnModal 
        isOpen={isMonitorOpen} 
        onClose={() => setIsMonitorOpen(false)} 
        strategyName={selectedStrategy?.name || ''}
        strategyId={selectedStrategyId}
      />
    </Layout>
  );
};

export default App;
