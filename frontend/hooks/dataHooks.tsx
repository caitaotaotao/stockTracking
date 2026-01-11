import { useEffect } from 'react';
import { useStrategy } from '../contexts/StrategyContext';
import { fetchStrategyAggregations } from '../services/api';

// 策略聚合初始化数据加载
export const useStrategyData = () => {
  const { initializeStrategies, loading, error, strategies, defaultStrategyId } = useStrategy();

  useEffect(() => {
    if (strategies.length === 0 && !loading) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const data = await fetchStrategyAggregations();
      initializeStrategies(data);
    } catch (err) {
      console.error('加载策略数据失败:', err);
    }
  };

  return { loading, error, strategies, defaultStrategyId, reload: loadData };
};
