from typing import List, Optional, Dict
from .models import Strategy

# 模拟数据存储
strategies_db = []
portfolios_db = []
stratigies = [
    Strategy(id=0, name="成长动量", description="综合成长因子+2个月涨跌幅动量选股", ),
    Strategy(id=1, name="红利质量", description="红利+roe+估值选股", ),
    Strategy(id=2, name="深度学习", description="多因子深度学习因子", ),
    Strategy(id=3, name="", description="多因子深度学习因子", ),
]

class StrategyService:
    """策略服务层，处理策略的业务逻辑"""    
    @staticmethod
    def get_all_strategies() -> List[Strategy]:
        """获取所有策略"""
        return stratigies
    
    @staticmethod
    def get_portfolio_by_id(strategy_id: int) -> Optional[Strategy]:
        if strategy_id <= 0 or strategy_id > len(stratigies):
            return None
        # 获取组合股票列表
        return stratigies[strategy_id]
    
    @staticmethod
    def get_portfolio_performance(strategy_id: int) -> Optional[Dict]:
        """获取策略组合的性能指标"""
        if strategy_id <= 0 or strategy_id > len(stratigies):
            return None
        return {}
