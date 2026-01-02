import pandas as pd
from typing import List, Optional, Dict
from backend.strategy_management.models import Strategy
from backend.databases.databases_connection import Session, engine
from backend.databases.data_models import StrategyDivquality, BasicInfoStock, StrategyGrowthmomentum, StockIndicators, TechStrongWatchlist, TechStrongSignals
from backend.utilities.basic_funcs import stock_market
from sqlalchemy import func, select, text

# 目前支持的策略汇总
stratigies = [
    Strategy(id=0, name="成长动量", description="综合成长因子+2个月涨跌幅动量选股", ),
    Strategy(id=1, name="红利质量", description="红利+roe+估值选股", ),
    # Strategy(id=2, name="深度学习", description="多因子深度学习因子", ),
    Strategy(id=3, name="强势股跟踪", description="前高放量突破+换手率过滤+龙虎榜机构净买入", ),
]

class StrategyService:
    """策略服务层，处理策略的业务逻辑"""    
    @staticmethod
    def get_all_strategies() -> List[Strategy]:
        """获取所有策略"""
        return stratigies
    
    @staticmethod
    def get_portfolio_by_id(strategy_id: int, report_date: str="2025-09-30", date_period: int=3, stage=1) -> Optional[List[Dict]]:
        """根据策略ID和报告日期、交易日区间获取策略组合的股票列表"""
        assert stage in [1,2]
        with Session() as session:
            # 子查询获取最新市值
            latest_mv_subquery = session.query(
                StockIndicators.code,
                StockIndicators.total_mv,
                func.max(StockIndicators.trade_date).label('latest_date')
            ).group_by(StockIndicators.code).subquery()
            # 计算个股近20日涨跌幅
            change_20d_subquery = text("""
                with price_data as (
                    select ticker, close, trade_date,
                        ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY trade_date DESC) as rn
                    from quant_research.market_daily_ts
                ),
                latest_price as (
                    select ticker, close as latest_close from price_data where rn = 1
                ),
                price_20d_ago as (
                    select ticker, close as close_20d_ago from price_data where rn = 21
                )
                select latest_price.ticker, 
                    latest_price.latest_close, 
                    price_20d_ago.close_20d_ago,
                    case
                        when price_20d_ago.close_20d_ago>0
                        then (latest_price.latest_close - price_20d_ago.close_20d_ago) / price_20d_ago.close_20d_ago
                        else null
                    end as change_20d
                from latest_price
                left join price_20d_ago on latest_price.ticker = price_20d_ago.ticker
            """)
            change_20d_df = pd.read_sql(change_20d_subquery, engine)
            change_20d_dict = dict(zip(change_20d_df['ticker'], change_20d_df['change_20d']))

            if strategy_id == 1:  # 红利质量策略
                r = session.query(
                    StrategyDivquality.code,
                    BasicInfoStock.short_name,
                    StrategyDivquality.industry_name,
                    StrategyDivquality.signal,
                    latest_mv_subquery.c.total_mv
                ).join(
                    BasicInfoStock,
                    StrategyDivquality.code == BasicInfoStock.ticker
                ).join(
                    latest_mv_subquery,
                    StrategyDivquality.code == latest_mv_subquery.c.code,
                    isouter=True
                ).filter(
                    StrategyDivquality.end_date == report_date
                ).order_by(StrategyDivquality.signal.desc())
                r = pd.DataFrame(r)
                r['stage'] = ''
            
            elif strategy_id == 0:  # 成长动量策略
                r = session.query(
                    StrategyGrowthmomentum.code,
                    BasicInfoStock.short_name,
                    StrategyGrowthmomentum.industry_code.label('industry_name'),
                    StrategyGrowthmomentum.signal_growth.label('signal'),
                    latest_mv_subquery.c.total_mv
                ).join(
                    BasicInfoStock,
                    StrategyGrowthmomentum.code == BasicInfoStock.ticker
                ).join(
                    latest_mv_subquery,
                    StrategyGrowthmomentum.code == latest_mv_subquery.c.code,
                    isouter=True
                ).filter(
                    StrategyGrowthmomentum.end_date == report_date
                ).order_by(StrategyGrowthmomentum.signal_growth.desc())
                r = pd.DataFrame(r)
                r['stage'] = ''

            elif strategy_id == 3:  # 强势股跟踪策略
                if stage == 1:
                    watchlist_dates_sq = (
                        select(TechStrongWatchlist.trade_date.label('trade_date'))
                        .distinct()
                        .order_by(TechStrongWatchlist.trade_date.desc())
                        .limit(date_period)
                        .subquery()
                    )
                    r1 = (
                        select(TechStrongWatchlist.trade_date, TechStrongWatchlist.ticker, TechStrongWatchlist.board, TechStrongWatchlist.score)
                        .join(watchlist_dates_sq, TechStrongWatchlist.trade_date == watchlist_dates_sq.c.trade_date)
                        .order_by(TechStrongWatchlist.trade_date.desc(), TechStrongWatchlist.score.desc())
                    )
                    r = pd.DataFrame(session.execute(r1).scalars().all())
                elif stage == 2:
                    signals_dates_sq = (
                        select(TechStrongSignals.trade_date.label('trade_date'))
                        .distinct()
                        .order_by(TechStrongSignals.trade_date.desc())
                        .limit(date_period)
                        .subquery()
                    )
                    r2 = (
                        select(TechStrongSignals.trade_date, TechStrongSignals.ticker, TechStrongSignals.board, TechStrongSignals.score)
                        .join(signals_dates_sq, TechStrongSignals.trade_date == signals_dates_sq.c.trade_date)
                        .order_by(TechStrongSignals.trade_date.desc(), TechStrongSignals.score.desc())
                    )
                    r = pd.DataFrame(session.execute(r2).scalars().all())
                else:
                    raise ValueError("Invalid stage value. Must be 1 or 2.")
            else:
                return None # type: ignore
        # 整理查询数据结果
        r.reset_index(drop=True, inplace=True)
        r['code'] = r['code'].apply(lambda x: stock_market(x))
        result = []
        for i in range(len(r)):
            original_code = r.iloc[i]['code'].split('.')[-1] if '.' in r.iloc[i]['code'] else r.iloc[i]['code']
            _r = {
                'code': r.iloc[i]['code'],
                'shortName': r.iloc[i]['short_name'],
                'industryName': r.iloc[i]['industry_name'],
                'latestMV': r.iloc[i]['total_mv'],
                'change20D': round(float(change_20d_dict.get(original_code)), 2) if original_code in change_20d_dict and change_20d_dict.get(original_code) is not None else None, # type: ignore
                'signal': r.iloc[i]['signal'],
                'themes': [],  # 主题数据暂未添加
            }
            result.append(_r)
        return result # type: ignore
    
    @staticmethod
    def get_portfolio_performance(strategy_id: int) -> Optional[Dict]:
        """获取策略组合的性能指标"""
        if strategy_id <= 0 or strategy_id > len(stratigies):
            return None
        return {}
    
    @staticmethod
    def get_strategy_options(strategy_id: int) -> Optional[List[Dict]]:
        """获取策略的可选参数"""

        if strategy_id == 0:  # 成长动量策略
            with Session() as session:
                dates = session.query(StrategyGrowthmomentum.end_date).distinct().order_by(StrategyGrowthmomentum.end_date.desc()).all()
                date_options = [{"label": date[0].strftime("%Y-%m-%d"), "value": date[0].strftime("%Y-%m-%d")} for date in dates]

            filter_options=[
                {"name": "报告期", "value": "2025-09-30", "type": "select", "options": date_options, "defaultValue": date_options[0]['value'] if date_options else None},
                {"name": "总市值", "value": "30", "type": "number", "options": [], "defaultValue": 30},
            ]
        elif strategy_id == 1:  # 红利质量策略
            # 获取成长动量的报告期
            with Session() as session:
                dates = session.query(StrategyDivquality.end_date).distinct().order_by(StrategyDivquality.end_date.desc()).all()
                date_options = [{"label": date[0].strftime("%Y-%m-%d"), "value": date[0].strftime("%Y-%m-%d")} for date in dates]

            filter_options=[
                {"name": "报告期", "value": "2025-09-30", "type": "select", "options": date_options, "defaultValue": date_options[0]['value'] if date_options else None},
                {"name": "总市值", "value": "30", "type": "number", "options": [], "defaultValue": 30},
            ]
        elif strategy_id == 3:  # 强势股跟踪策略
            filter_options=[
                {"name": "交易日区间", "value": "3", "type": "number", "options": [
                    {"label": "近3天", "value": 3}, {"label": "近5天", "value": 5}, {"label": "近10天", "value": 10},
                    {"label": "近20天", "value": 20},
                    ], "defaultValue": 3},
                {"name": "总市值", "value": "30", "type": "number", "options": [], "defaultValue": 30},
            ]
        else:
            filter_options = None
        return filter_options
