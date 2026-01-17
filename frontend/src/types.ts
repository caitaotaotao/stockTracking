
export interface Strategy {
  id: number;
  name: string;
  description: string;
}

export interface Stock {
  code: string;
  shortName: string;
  industryName: string;
  score: number;
  totalMv: number; // 十亿
  tradeDate: number;  // 信号生成日期，毫秒时间戳
  endDate?: string;  // 报告期
  change20d?: number; // 百分比
  themes?: string[];
}

export interface KLineData {
  tradeDate: string;  // 秒级时间戳
  open: number;
  close: number;
  high: number;
  low: number;
  vol: number;
}

export type TimeFrame = 'day' | 'week' | 'month' | 'year';

export interface StrategyMetrics {
  annualReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
}

export interface AIAnalysisResult {
  doubao: string;
  kimiFundamental: string;
  kimiSentiment: string;
  gptDecision: string;
}

export interface FilterOption {
  name: string;
  filterCode: string;
  type: 'select' | 'number' | 'multiSelect';
  options: Array<{
    label: string;
    value: string | number;
  }>;
  defaultValue: string | number;
}

export interface StrategyAggregation {
  strategyId: number;
  name: string;
  filterOptions: FilterOption[];
  stockGroups: Stock[];
  stage: string;
}

// 股票在策略中的信息
export interface StockInStrategy {
  stock: Stock;
  strategyId: number;
  strategyName: string;
}