from fastapi import APIRouter, HTTPException
from typing import List

from .models import (
    Strategy, Stocks
)
from .services import StrategyService

# 创建路由器
strategy_router = APIRouter(prefix="/strategies", tags=["strategies"])

# 策略相关路由
@strategy_router.get("/", response_model=List[Strategy])
async def list_strategies():
    """获取所有策略列表"""
    return StrategyService.get_all_strategies()

@strategy_router.post("/getStrategyResults", response_model=Stocks)
async def get_strategy(strategy_id: int, report_date: str, date_period: int):
    """获取特定策略详情"""
    strategy = StrategyService.get_portfolio_by_id(strategy_id, report_date, date_period)
    if strategy is None:
        raise HTTPException(status_code=400, detail="策略选股结果不存在")
    return strategy

@strategy_router.post("/getStrategyFilters", response_model=List[dict])
async def get_strategy_filters(strategy_id: int) -> List[dict]:
    """获取特定策略的筛选条件"""
    filter_options = StrategyService.get_strategy_options(strategy_id)
    if filter_options is None:
        raise HTTPException(status_code=400, detail="策略筛选条件不存在")
    return filter_options
