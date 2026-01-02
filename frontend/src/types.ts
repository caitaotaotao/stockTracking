
export interface Strategy {
  id: string;
  name: string;
  description: string;
}

export interface Stock {
  symbol: string;
  name: string;
  marketCap: number; // 亿元
  change20d: number; // 百分比
  themes: string[];
  industry: string;
  score: number;
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
