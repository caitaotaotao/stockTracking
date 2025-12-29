from pydantic import BaseModel
from typing import Optional, Dict

class Strategy(BaseModel):
    """策略模型"""
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    performance_metrics: Optional[Dict[str, float]] = None

class Stocks(BaseModel):
    """选股结果模型"""
    stock: str
    name: str
    markCap: float  # 最新总市值
    pct20D: float  # 近20交易日涨跌幅
    score: float  # 因子值