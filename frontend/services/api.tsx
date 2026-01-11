import type { Strategy, Stock, KLineData, StrategyAggregation  } from '../src/types';
import type { FilterOption } from '../contexts/FilterContext';

const API_BASE_URL = 'http://localhost:8000'

// 获取策略聚合接口
export const fetchStrategyAggregations = async (): Promise<StrategyAggregation[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/strategies/strategyAggregation`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10秒超时
    });

    if (!response.ok) {
      console.error('获取策略列表失败：', response.statusText);
    }

    const data: StrategyAggregation[] = await response.json();
    return data;
  } catch (error) {
      console.error('获取策略聚合接口失败：', error);
      return [];
    }
};

// 获取策略列表
export const fetchStrategies = async (): Promise<Strategy[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/strategies/`);
        if (!response.ok) {
            throw new Error(`获取策略列表请求失败！${response.status}`)
        }
        const data = await response.json()
        return data.map((strategy: any) => ({
            id: String(strategy.id),
            name: strategy.name,
            description: strategy.description || '',
        }));
    } catch (error) {
        console.error('获取策略列表失败：', error);
        return [];
    }
};

// 获取策略选股结果
interface StrategyParams {
  strategyId: number;
  reportDate?: string;
  datePeriod?: number;
  stage?: number;
}

export const fetchStocksByStrategy = async (
  params: StrategyParams
): Promise<Stock[]> => {
  try {
    console.log("获取策略结果传参：", params)
    const response = await fetch(`${API_BASE_URL}/strategies/getStrategyResults`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('获取策略选股结果失败：', errorData.detail || '接口请求失败');
      return [];
    }

    const result = await response.json();
    return result.map((stock: any) => ({
        symbol: stock.code,
        name: stock.shortName,
        marketCap: stock.latestMV,
        change20d: stock.change20D,
        themes: stock.themes,
        industry: stock.industryName,
        score: stock.signal,
    }));
  } catch (error) {
    console.error('获取策略选股结果失败：', error);
    return [];
  }
};

// 获取股票K线数据
export const fetchKLineData = async (
  symbol: string,
): Promise<KLineData[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/strategies/getStockPrice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stock_code: symbol }),
    });
    
    if (!response.ok) {
      throw new Error(`获取K线数据请求失败！${response.status}`);
    }
    const data = await response.json();
    return data.map((item: any) => ({
      tradeDate: item.tradeDate,
      open: item.open,
      close: item.close,
      high: item.high,
      low: item.low,
      volume: item.volume,
    }));
  } catch (error) {
    console.error('获取K线数据失败：', error);
    return [];
  }
};

// 获取策略回测收益数据
export const fetchStrategyReturns = async (strategyId: number): Promise<any[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/strategies/${strategyId}/returns`);
    if (!response.ok) {
      throw new Error(`获取策略回测收益数据请求失败！${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取策略回测收益数据失败：', error);
    return [];
  }
};

/**
 * 筛选项配置
 */

export const fetchStrategyFilters = async (strategyId: number): Promise<FilterOption[]> => {
  const response = await fetch(`${API_BASE_URL}/strategies/getStrategyFilters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "strategyId": strategyId
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: FilterOption[] = await response.json();
  return data;
};

