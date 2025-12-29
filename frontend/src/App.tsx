import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import StrategyHeader from '../components/StrategyHeader';
import StockList from '../components/StockList';
import StockDetail from '../components/StockDetail';
import StrategyReturnModal from '../components/StrategyReturnModal';
import { fetchStrategies, fetchStocksByStrategy } from '../services/api';
import type { Strategy, Stock } from './types';

const App: React.FC = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isMonitorOpen, setIsMonitorOpen] = useState(false);
  const [aiTriggerKey, setAiTriggerKey] = useState(0);

  useEffect(() => {
    fetchStrategies().then((data: Strategy[]) => {
      setStrategies(data);
      if (data.length > 0) setSelectedStrategyId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedStrategyId) {
      fetchStocksByStrategy({
        strategy_id: Number(selectedStrategyId),
        report_date: '20250930',
      }).then((data: Stock[]) => {
        setStocks(data);
        if (data.length > 0) setSelectedStock(data[0]);
      });
    }
  }, [selectedStrategyId]);

  const selectedStrategy = strategies.find(s => s.id === selectedStrategyId);

  const handleAIResearch = (stock: Stock) => {
    setSelectedStock(stock);
    setAiTriggerKey(prev => prev + 1);
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900 overflow-hidden">
      {/* Sidebar - Strategy Selector */}
      <Sidebar 
        strategies={strategies} 
        selectedId={selectedStrategyId} 
        onSelect={setSelectedStrategyId} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header - Strategy Filters */}
        <StrategyHeader 
          strategyName={selectedStrategy?.name || '选择策略'} 
          onOpenMonitor={() => setIsMonitorOpen(true)}
        />

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Middle Pane - Stock List */}
          <StockList 
            stocks={stocks} 
            selectedSymbol={selectedStock?.symbol || ''} 
            onSelectStock={setSelectedStock}
            onAIResearch={handleAIResearch}
          />

          {/* Right Pane - Stock Detail & AI Analysis */}
          <StockDetail 
            stock={selectedStock} 
            aiTriggerKey={aiTriggerKey}
          />
        </div>
      </div>

      {/* Strategy Performance Monitor Modal */}
      <StrategyReturnModal 
        isOpen={isMonitorOpen} 
        onClose={() => setIsMonitorOpen(false)} 
        strategyName={selectedStrategy?.name || ''}
      />
    </div>
  );
};

export default App;
