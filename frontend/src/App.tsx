import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import StrategyHeader from '../components/StrategyHeader';
import StockList from '../components/StockList';
import StockDetail from '../components/StockDetail';
import StrategyReturnModal from '../components/StrategyReturnModal';
import { fetchStocksByStrategy } from '../services/api';
import type { Stock, FilterOption } from './types';
import { Layout } from 'antd';
import { useStrategyData } from '../hooks/dataHooks';

const App = () => {
  const { loading, error, strategies, defaultStrategyId, reload } = useStrategyData(); // 初始化策略集合数据
  const [selectedStrategyId, setSelectedStrategyId] = useState<number>(defaultStrategyId);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isMonitorOpen, setIsMonitorOpen] = useState(false);  // 判断显示策略弹窗
  const [filterOptions, setFilterOptions] = useState<FilterOption[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const { Content } = Layout;

  // 初始化策略数据
  if (loading) {
    return <div>策略选股初始化中...</div>
  }
  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h2>初始化失败: {error}</h2>
        <button onClick={reload}>重试</button>
      </div>
    )
  }

  // 初始化筛选项
  useEffect(() => {
    if (!loading && strategies.length > 0 && defaultStrategyId !== undefined) {
      const defaultStrategy = strategies[defaultStrategyId];
      if (defaultStrategy && defaultStrategy.filterOptions) {
        setFilterOptions(defaultStrategy.filterOptions);
        
        // 同时设置默认策略对应默认筛选值
        const defaultValues: Record<string, any> = {};
        defaultStrategy.filterOptions.forEach(option => {
          if (option.defaultValue !== undefined) {
            defaultValues[option.filterCode] = option.defaultValue;
          } else if (option.type === 'multiSelect') {
            defaultValues[option.filterCode] = [];
          } else {
            defaultValues[option.filterCode] = '';
          }
        });
        setFilterValues(defaultValues);
      } else {
        setFilterOptions([]);
        setFilterValues({});
      }
    }
  }, [loading, strategies, defaultStrategyId]);

  // 初始化股票列表
  useEffect(() => {
    if (!loading && defaultStrategyId !== undefined) {
      const defaultStrategy = strategies[defaultStrategyId];
      if (defaultStrategy && defaultStrategy.stockGroups) {
        setStocks(defaultStrategy.stockGroups);
        if (defaultStrategy.stockGroups.length > 0) setSelectedStock(defaultStrategy.stockGroups[0]);
      } else {
        setStocks([]);
      }
    }
  }, [loading, defaultStrategyId, strategies]);  

  const handleFilterChange = useCallback((name: string, value: any) => {
    setFilterValues(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // 合并这两个 useEffect，避免循环
  useEffect(() => {
    if (selectedStrategyId) {
      const selectedStrategy = strategies.find(s => s.strategyId === selectedStrategyId);
      if (selectedStrategy) {
        // 先设置筛选选项和默认值
        setFilterOptions(selectedStrategy.filterOptions);
        const selectedDefaultValues: Record<string, any> = {};
        selectedStrategy.filterOptions.forEach(option => {
          if (option.defaultValue !== undefined) {
            selectedDefaultValues[option.filterCode] = option.defaultValue;
          } else if (option.type === 'multiSelect') {
            selectedDefaultValues[option.filterCode] = [];
          } else {
            selectedDefaultValues[option.filterCode] = '';
          }
        });
        setFilterValues(selectedDefaultValues);
        
        // 然后获取股票列表（使用默认筛选值）
        const params: any = {
          strategyId: Number(selectedStrategyId)
        };
        Object.entries(selectedDefaultValues).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params[key] = value;
          }
        });

        fetchStocksByStrategy(params).then((data: Stock[]) => {
          setStocks(data);
          if (data.length > 0) setSelectedStock(data[0]);
        }).catch(error => {
          console.error('Failed to fetch stocks:', error);
          setStocks([]);
        });
      } else {
        setStocks([]);
        setFilterOptions([]);
        setFilterValues({});
      }
    }
  }, [selectedStrategyId, strategies]);

  // 只在 filterValues 变化时获取股票（但要排除初始化的情况）
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (selectedStrategyId) {
      const params: any = {
        strategyId: Number(selectedStrategyId)
      };
      Object.entries(filterValues).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params[key] = value;
        }
      });

      fetchStocksByStrategy(params).then((data: Stock[]) => {
        setStocks(data);
        if (data.length > 0) setSelectedStock(data[0]);
      }).catch(error => {
        console.error('Failed to fetch stocks:', error);
        setStocks([]);
      });
    }
  }, [filterValues, selectedStrategyId]);

  const selectedStrategy = strategies.find(s => s.strategyId === selectedStrategyId);


  return (
    <Layout className="h-screen overflow-hidden" style={{ marginLeft: '8px' }}>
      {/* 策略面板 */}
      <Sidebar
        strategies={strategies}
        selectedId={selectedStrategyId}
        onSelect={setSelectedStrategyId}
      />

      {/* 详情面板 */}
      <Layout className="bg-gray-100" style={{ marginLeft: '8px' }}>
        <Content className="flex flex-col min-w-0">
          {/* 策略头部区域 */}
          <div className="bg-white shadow-sm">
            <StrategyHeader
              strategyName={selectedStrategy?.name || '选择策略'}
              filterValues={filterValues}
              handleFilterChange={handleFilterChange}
              filterOptions={filterOptions}
              onOpenMonitor={() => setIsMonitorOpen(true)}
            />
          </div>

          {/* 详情面板 */}
          <div className="flex-1 overflow-hidden p-4">
            <div className="flex h-full" style={{gap: '8px'}}>
              {/* 左侧股票列表 */}
              <div style={{width: '420px', flexShrink: 0}} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <StockList
                  stocks={stocks}
                  selectedSymbol={selectedStock?.code || ''}
                  onSelectStock={setSelectedStock}
                />
              </div>

              {/* K线及AI分析面板 */}
              <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden">
                <StockDetail
                  stock={selectedStock}
                  reportDate={filterValues.reportDate?? new Date().toISOString().slice(0,10)}
                />
              </div>
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