from fastapi import APIRouter, HTTPException
from typing import List

from .models import (
    Strategy,
)
from .services import StrategyService

# 创建路由器
strategy_router = APIRouter(prefix="/strategies", tags=["strategies"])

# 策略相关路由
@strategy_router.get("/", response_model=List[Strategy])
async def list_strategies():
    """获取所有策略列表"""
    return StrategyService.get_all_strategies()

@strategy_router.get("/{strategy_id}", response_model=Strategy)
async def get_strategy(strategy_id: int):
    """获取特定策略详情"""
    strategy = StrategyService.get_strategy_by_id(strategy_id)
    if not strategy:
        raise HTTPException(status_code=404, detail="策略不存在")
    return strategy
