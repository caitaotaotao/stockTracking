from fastapi import APIRouter, HTTPException
from typing import List

from .models import (
    Strategy, StrategyStockItem, StrategyResultRequest, StrategyFilter
)
from .services import StrategyService, StockPriceService

# 创建路由器
strategy_router = APIRouter(prefix="/strategies", tags=["strategies"])

# 策略相关路由
@strategy_router.get("/", response_model=List[Strategy])
async def list_strategies():
    """获取所有策略列表"""
    return StrategyService.get_all_strategies()

@strategy_router.post("/getStrategyResults", response_model=List[StrategyStockItem], 
                      summary="获取策略选股结果", description="根据策略ID、报告日期、日期周期和强势股阶段获取对应的选股结果")
async def get_strategy(request: StrategyResultRequest):
    """获取特定策略详情"""
    strategy = StrategyService.get_portfolio_by_id(request.strategy_id, request.report_date, request.date_period, request.stage)
    if strategy is None:
        raise HTTPException(status_code=400, detail="策略选股结果不存在")
    return strategy

@strategy_router.post("/getStrategyFilters", response_model=List[dict])
async def get_strategy_filters(request: StrategyFilter) -> List[dict]:
    """获取特定策略的筛选条件"""
    filter_options = StrategyService.get_strategy_options(request.strategy_id)
    if filter_options is None:
        raise HTTPException(status_code=400, detail="策略筛选条件不存在")
    return filter_options

@strategy_router.post("/getStockPrice", response_model=List[dict])
async def get_stock_price(stock_code: str):
    """获取股票的最新价格"""
    price = StockPriceService.get_historical_prices(stock_code)
    if price is None:
        raise HTTPException(status_code=400, detail="股票价格不存在")
    return price