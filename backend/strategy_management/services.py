import pandas as pd
import concurrent.futures
from datetime import datetime, time
from typing import List, Optional, Dict
from strategy_management.models import Strategy
from databases.databases_connection import Session, engine
from databases.data_models import StrategyDivquality, BasicInfoStock, StrategyGrowthmomentum, StockIndicators, TechStrongWatchlist, TechStrongSignals, MarketPriceDaily, StockLatestIndicator
from utilities.basic_funcs import stock_market
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
        assert date_period in [3,5,10,20]
        with Session() as session:
            if strategy_id == 1:  # 红利质量策略
                r = session.query(
                    StrategyDivquality.trading.label('trade_date'),
                    StrategyDivquality.code,
                    StockLatestIndicator.short_name,
                    StockLatestIndicator.industry_name,
                    StrategyDivquality.signal,
                    StockLatestIndicator.total_mv,
                    StockLatestIndicator.change_pct.label('change20d')
                ).join(
                    StockLatestIndicator,
                    StrategyDivquality.code == StockLatestIndicator.code
                ).filter(
                    StrategyDivquality.end_date == report_date
                ).order_by(StrategyDivquality.signal.desc())
                r = pd.DataFrame(r)
                r['stage'] = ''
            
            elif strategy_id == 0:  # 成长动量策略
                r = session.query(
                    StrategyGrowthmomentum.trading.label('trade_date'),
                    StrategyGrowthmomentum.code,
                    StockLatestIndicator.short_name,
                    StockLatestIndicator.industry_name,
                    StrategyGrowthmomentum.signal_growth.label('signal'),
                    StockLatestIndicator.total_mv,
                    StockLatestIndicator.change_pct.label('change20d')
                ).join(
                    StockLatestIndicator,
                    StrategyGrowthmomentum.code == StockLatestIndicator.code
                ).filter(
                    StrategyGrowthmomentum.end_date == report_date
                ).order_by(StrategyGrowthmomentum.signal_growth.desc()).all()
                r = pd.DataFrame(r)
                r['stage'] = ''

            elif strategy_id == 3:  # 强势股跟踪策略
                if stage == 1:
                    watchlist_dates_sq = (
                        select(TechStrongWatchlist.trade_date)
                        .distinct()
                        .order_by(TechStrongWatchlist.trade_date.desc())
                        .limit(date_period)
                        .subquery()
                    )
                    r1 = (
                        select(
                            TechStrongWatchlist.trade_date, 
                            TechStrongWatchlist.ticker.label('code'), 
                            TechStrongWatchlist.board,
                            TechStrongWatchlist.score.label('signal'),
                            StockLatestIndicator.short_name,
                            StockLatestIndicator.industry_name,
                            StockLatestIndicator.total_mv,
                            StockLatestIndicator.change_pct.label('change20d')
                            )
                        .join(watchlist_dates_sq, TechStrongWatchlist.trade_date == watchlist_dates_sq.c.trade_date)
                        .join(StockLatestIndicator, TechStrongWatchlist.ticker == StockLatestIndicator.code)
                        .order_by(TechStrongWatchlist.trade_date.desc(), TechStrongWatchlist.score.desc())
                    )
                    r = pd.DataFrame(session.execute(r1).all())
                elif stage == 2:
                    signals_dates_sq = (
                        select(TechStrongSignals.trade_date)
                        .distinct()
                        .order_by(TechStrongSignals.trade_date.desc())
                        .limit(date_period)
                        .subquery()
                    )
                    r2 = (
                        select(
                            TechStrongSignals.trade_date, 
                            TechStrongSignals.ticker.label('code'), 
                            TechStrongSignals.board, 
                            TechStrongSignals.score.label('signal'),
                            StockLatestIndicator.short_name,
                            StockLatestIndicator.industry_name,
                            StockLatestIndicator.total_mv,
                            StockLatestIndicator.change_pct.label('change20d')
                            )
                        .join(signals_dates_sq, TechStrongSignals.trade_date == signals_dates_sq.c.trade_date)
                        .join(StockLatestIndicator, TechStrongSignals.ticker == StockLatestIndicator.code)
                        .order_by(TechStrongSignals.trade_date.desc(), TechStrongSignals.score.desc())
                    )
                    r = pd.DataFrame(session.execute(r2).all())
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
                'tradeDate': int(datetime.combine(r.iloc[i]['trade_date'], time.min).timestamp() * 1000),
                'shortName': r.iloc[i]['short_name'],
                'industryName': r.iloc[i]['industry_name'],
                'totalMv': r.iloc[i]['total_mv']/100000,
                'score': r.iloc[i]['signal'],
                'themes': [],  # 主题数据暂未添加
                'change20d': r.iloc[i]['change20d'],
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
                {"name": "报告期", "filterCode": "reportDate", "value": "2025-09-30", "type": "select", "options": date_options, "defaultValue": date_options[0]['value'] if date_options else None},
                {"name": "总市值", "filterCode": "marketCap", "value": "30", "type": "number", "options": [], "defaultValue": 30},
            ]
        elif strategy_id == 1:  # 红利质量策略
            # 获取成长动量的报告期
            with Session() as session:
                dates = session.query(StrategyDivquality.end_date).distinct().order_by(StrategyDivquality.end_date.desc()).all()
                date_options = [{"label": date[0].strftime("%Y-%m-%d"), "value": date[0].strftime("%Y-%m-%d")} for date in dates]

            filter_options=[
                {"name": "报告期", "filterCode": "reportDate", "value": "2025-09-30", "type": "select", "options": date_options, "defaultValue": date_options[0]['value'] if date_options else None},
                {"name": "总市值", "filterCode": "marketCap", "value": "30", "type": "number", "options": [], "defaultValue": 30},
            ]
        elif strategy_id == 3:  # 强势股跟踪策略
            filter_options=[
                {"name": "信号池", "filterCode": "stage", "type": "select", "options": [
                        {"label": "跟踪池", "value": "1"}, {"label": "触发池", "value": "2"}
                    ], "defaultValue": "1"},
                {"name": "交易日区间", "filterCode": "datePeriod", "value": "3", "type": "number", "options": [
                    {"label": "近3天", "value": 3}, {"label": "近5天", "value": 5}, {"label": "近10天", "value": 10},
                    {"label": "近20天", "value": 20},
                    ], "defaultValue": 3},
                {"name": "总市值", "filterCode": "marketCap", "value": "30", "type": "number", "options": [], "defaultValue": 30},
            ]
        else:
            filter_options = None
        return filter_options
    
    @staticmethod
    def strategy_aggregation():
        """策略聚合接口"""
        
        with Session() as session:
            dates_momentum = session.query(StrategyGrowthmomentum.end_date).distinct().order_by(StrategyGrowthmomentum.end_date.desc()).all()
            dates_divquality = session.query(StrategyDivquality.end_date).distinct().order_by(StrategyDivquality.end_date.desc()).all()
        
        date_momentum_options = [{"label": date[0].strftime("%Y-%m-%d"), "value": date[0].strftime("%Y-%m-%d")} for date in dates_momentum]
        date_divquality_options = [{"label": date[0].strftime("%Y-%m-%d"), "value": date[0].strftime("%Y-%m-%d")} for date in dates_divquality]

        # 定义查询函数
        def query_growth_momentum():
            sql = """
                SELECT a.code, b.short_name, a.end_date, a.trading, b.industry_name, a.signal_growth as score, b.total_mv, b.change_pct
                FROM quant_research.strategy_growth_momentum as a
                left join quant_research.platform_stock_daily as b on a.code = b.code
                WHERE a.end_date = (
                    SELECT MAX(end_date)
                    FROM quant_research.strategy_growth_momentum
                )
                ORDER BY a.signal_growth desc;
            """
            return pd.read_sql(sql, engine)
            
        def query_divquality():
            sql = """
                SELECT a.code, b.short_name, a.end_date, a.trading, b.industry_name, a.signal as score, b.total_mv, b.change_pct
                FROM quant_research.strategy_divquality as a
                left join quant_research.platform_stock_daily as b on a.code = b.code
                WHERE a.end_date = (
                    SELECT MAX(end_date)
                    FROM quant_research.strategy_divquality
                )
                ORDER BY a.signal desc;
            """
            return pd.read_sql(sql, engine)
        
        def query_strong_watchlist():
            sql = """
                SELECT a.ticker as code, b.short_name, a.trade_date, b.industry_name, a.score, b.total_mv, b.change_pct
                FROM quant_research."technicals_strongStocks_watchlist" as a
                left join quant_research.platform_stock_daily as b on a.ticker = b.code
                WHERE a.trade_date in (
                    SELECT trade_date
                    FROM quant_research."technicals_strongStocks_watchlist"
                    order BY trade_date DESC LIMIT 3
                    )
                ORDER BY a.trade_date desc, a.score desc;
            """            
            return pd.read_sql(sql, engine)
        
        # 并行执行查询
        results = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            future_to_query = {
                executor.submit(query_growth_momentum): "growth_momentum",
                executor.submit(query_divquality): "divquality",
                executor.submit(query_strong_watchlist): "strong_watchlist",
            }
            
            for future in concurrent.futures.as_completed(future_to_query):
                query_name = future_to_query[future]
                try:
                    results[query_name] = future.result()
                except Exception as exc:
                    print(f'{query_name} generated an exception: {exc}')
                    results[query_name] = pd.DataFrame()

        # 处理结果
        growth_momentum_stocks = []
        if 'growth_momentum' in results and not results['growth_momentum'].empty:
            for _, row in results['growth_momentum'].iterrows():
                growth_momentum_stocks.append({
                    'code': stock_market(row['code']),
                    'shortName': row['short_name'],
                    'industryName': row['industry_name'],
                    'score': float(row['score']) if row['score'] is not None else None,
                    'totalMv': float(row['total_mv'])/100000 if row['total_mv'] is not None else None,
                    'tradeDate': int(datetime.combine(row['trading'], time.min).timestamp()*1000),
                    'themes': [],
                    'change20d': float(row['change_pct']) if row['change_pct'] is not None else None
                })
                
        divquality_stocks = []
        if 'divquality' in results and not results['divquality'].empty:
            for _, row in results['divquality'].iterrows():
                divquality_stocks.append({
                    'code': stock_market(row['code']),
                    'shortName': row['short_name'],
                    'industryName': row['industry_name'],
                    'score': float(row['score']) if row['score'] is not None else None,
                    'totalMv': float(row['total_mv'])/100000 if row['total_mv'] is not None else None,
                    'tradeDate': int(datetime.combine(row['trading'], time.min).timestamp()*1000),
                    'themes': [],
                    'change20d': float(row['change_pct']) if row['change_pct'] is not None else None
                })
        
        strong_watchlist_stocks = []
        if 'strong_watchlist' in results and not results['strong_watchlist'].empty:
            for _, row in results['strong_watchlist'].iterrows():
                strong_watchlist_stocks.append({
                    'code': stock_market(row['code']),
                    'shortName': row['short_name'],
                    'industryName': row['industry_name'],
                    'score': float(row['score']) if row['score'] is not None else None,
                    'totalMv': float(row['total_mv'])/100000 if row['total_mv'] is not None else None,
                    'tradeDate': int(datetime.combine(row['trade_date'], time.min).timestamp()*1000),
                    'themes': [],
                    'change20d': float(row['change_pct']) if row['change_pct'] is not None else None
                })

        return [
            {
                "strategyId": 0,
                "name": "成长动量策略",
                "filterOptions": [
                    {"name": "报告期", "filterCode": "reportDate", "type": "select", "options": date_momentum_options, "defaultValue": date_momentum_options[0]['value'] if date_momentum_options else None},
                    # {"name": "总市值", "filterCode": "marketCap", "type": "number", "options": [], "defaultValue": 30},
                ],
                "stockGroups": growth_momentum_stocks,
                "stage": "",
            },
            {
                "strategyId": 1,
                "name": "红利质量策略",
                "filterOptions": [
                    {"name": "报告期", "filterCode": "reportDate", "type": "select", "options": date_divquality_options, "defaultValue": date_divquality_options[0]['value'] if date_divquality_options else None},
                    # {"name": "总市值", "filterCode": "marketCap", "type": "number", "options": [], "defaultValue": 30},
                ],
                "stockGroups": divquality_stocks,
                "stage": "",
            },
            {
                "strategyId": 3,
                "name": "强势股跟踪",
                "filterOptions": [
                    {"name": "信号池", "filterCode": "stage", "type": "select", "options": [
                            {"label": "跟踪池", "value": "1"}, {"label": "触发池", "value": "2"}
                        ], "defaultValue": "1"},
                    {"name": "交易日区间", "filterCode": "datePeriod", "type": "select", "options": [
                            {"label": "近3天", "value": 3}, {"label": "近5天", "value": 5}, {"label": "近10天", "value": 10},
                            {"label": "近20天", "value": 20},
                        ], "defaultValue": 3},
                    # {"name": "总市值", "filterCode": "marketCap", "type": "number", "options": [], "defaultValue": 30},
                ],
                "stockGroups": strong_watchlist_stocks,
                "stage": "1",
            },
        ]


class StockPriceService:
    """股票价格服务层，处理股票业务逻辑"""
    @staticmethod
    def get_historical_prices(stock_code: str) -> Optional[List[Dict]]:
        """获取股票的历史价格数据"""
        if len(stock_code) > 6:
            stock_code = stock_code.split('.')[0]
        with Session() as session:
            r = session.query(
                MarketPriceDaily.trade_date,
                MarketPriceDaily.open,
                MarketPriceDaily.close,
                MarketPriceDaily.high,
                MarketPriceDaily.low,
                MarketPriceDaily.vol
            ).filter(
                MarketPriceDaily.ticker == stock_code,
            ).order_by(MarketPriceDaily.trade_date.asc())
            r = pd.DataFrame(r)
            r['trade_date'] = pd.to_datetime(r['trade_date'])
        if r.empty:
            return None
        else:
            # 按trade_date去重
            r = r.drop_duplicates(subset=['trade_date'], keep='last')
            # 剔除null数据
            r.dropna(inplace=True)
            result = []
            for i in range(len(r)):
                _r = {
                    'tradeDate': r.iloc[i]['trade_date'].timestamp() * 1000,
                    'open': r.iloc[i]['open'],
                    'close': r.iloc[i]['close'],
                    'high': r.iloc[i]['high'],
                    'low': r.iloc[i]['low'],
                    'volume': r.iloc[i]['vol'],
                }
                result.append(_r)
        return result