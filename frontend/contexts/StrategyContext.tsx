// src/contexts/StrategyContext.tsx - Context状态管理（极简版）
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { StrategyAggregation } from '../src/types';

interface StrategyContextValue {
  // 数据
  strategies: StrategyAggregation[];
  loading: boolean;
  error: string | null;
  defaultStrategyId: number;
  
  // 方法
  initializeStrategies: (data: StrategyAggregation[]) => void;
  getStrategyById: (id: number) => StrategyAggregation | undefined;
}

const StrategyContext = createContext<StrategyContextValue | undefined>(undefined);

export const StrategyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [strategies, setStrategies] = useState<StrategyAggregation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultStrategyId, setDefaultStrategyId] = useState<number>(0);

  // 构建索引缓存
  const strategiesById = useMemo(() => {
    const map = new Map<number, StrategyAggregation>();
    strategies.forEach(strategy => map.set(strategy.strategyId, strategy));
    return map;
  }, [strategies]);

  // 初始化
  const initializeStrategies = useCallback((data: StrategyAggregation[]) => {
    setLoading(true);
    setError(null);
    try {
      setStrategies(data);
      setDefaultStrategyId(data[0].strategyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '数据初始化失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 根据 ID 获取策略
  const getStrategyById = useCallback(
    (id: number) => strategiesById.get(id),
    [strategiesById]
  );

  const value: StrategyContextValue = {
    strategies,
    loading,
    error,
    defaultStrategyId,
    initializeStrategies,
    getStrategyById,
  };

  return <StrategyContext.Provider value={value}>{children}</StrategyContext.Provider>;
};

export const useStrategy = () => {
  const context = useContext(StrategyContext);
  if (!context) {
    throw new Error('useStrategy must be used within StrategyProvider');
  }
  return context;
};
