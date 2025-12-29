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
async def get_strategy(strategy_id: int, report_date: str):
    """获取特定策略详情"""
    strategy = StrategyService.get_portfolio_by_id(strategy_id, report_date)
    if len(strategy) == 0:
        raise HTTPException(status_code=400, detail="策略选股结果不存在")
    return strategy
