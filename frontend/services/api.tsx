import type { Strategy, Stock } from '../src/types';

const API_BASE_URL = 'http://localhost:8000'


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
  strategy_id: number;
  report_date: string;
}

export const fetchStocksByStrategy = async (
  params: StrategyParams
): Promise<Stock[]> => {
  try {
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