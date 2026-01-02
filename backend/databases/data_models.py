from sqlalchemy import Column, Integer, Date, VARCHAR, FLOAT
from .databases_connection import Base


class MarketPriceDaily(Base):
    __tablename__ = 'market_daily_ts'
    __table_args__ = {'schema': 'quant_research'}
    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(VARCHAR)
    trade_date = Column(Date)

    open = Column(FLOAT)
    high = Column(FLOAT)
    low = Column(FLOAT)
    close = Column(FLOAT)
    pre_close = Column(FLOAT)
    change = Column(FLOAT)
    pct_chg = Column(FLOAT)
    vol = Column(FLOAT)
    amount = Column(FLOAT)


class BasicInfoStock(Base):
    __tablename__ = 'basic_info_stock'
    __table_args__ = {'schema': 'quant_research'}
    ticker = Column(VARCHAR, primary_key=True)
    short_name = Column(VARCHAR)
    area = Column(VARCHAR)
    industry = Column(VARCHAR)
    market = Column(VARCHAR)
    list_date = Column(Date)
    act_name = Column(VARCHAR)
    act_ent_type = Column(VARCHAR)
    status = Column(VARCHAR)


class StrategyDivquality(Base):
    __tablename__ = 'strategy_divquality'
    __table_args__ = {'schema': 'quant_research'}
    code = Column(VARCHAR, primary_key=True)
    industry_name = Column(VARCHAR)
    end_date = Column(Date)
    roe_q = Column(FLOAT)
    roe_growth = Column(FLOAT)
    dv_ratio = Column(FLOAT)
    bp = Column(FLOAT)
    bp_pivot_1y = Column(FLOAT)
    ep = Column(FLOAT)
    ep_pivot_1y = Column(FLOAT)
    signal = Column(FLOAT)


class StrategyGrowthmomentum(Base):
    __tablename__ = 'strategy_growth_momentum'
    __table_args__ = {'schema': 'quant_research'}
    code = Column(VARCHAR, primary_key=True)
    trading = Column(Date)
    close = Column(FLOAT)
    open = Column(FLOAT)
    industry_code = Column(VARCHAR)
    circ_mv = Column(FLOAT)
    momentum_3M = Column(FLOAT)
    signal_growth = Column(FLOAT)
    end_date = Column(Date)


class StockIndicators(Base):
    __tablename__ = 'indicator_daily'
    __table_args__ = {'schema': 'quant_research'}
    id = Column(Integer, primary_key=True, autoincrement=True)
    trade_date = Column(Date)
    code = Column(VARCHAR)
    close = Column(FLOAT)
    turnover_rate = Column(FLOAT)
    turnover_rate_f = Column(FLOAT)
    volume_ratio = Column(FLOAT)
    pe = Column(FLOAT)
    pe_ttm = Column(FLOAT)
    pb = Column(FLOAT)
    ps = Column(FLOAT)
    ps_ttm = Column(FLOAT)
    dv_ratio = Column(FLOAT)
    dv_ttm = Column(FLOAT)
    total_share = Column(FLOAT)
    float_share = Column(FLOAT)
    free_share = Column(FLOAT)
    total_mv = Column(FLOAT)
    circ_mv = Column(FLOAT)


# 强势股模型
class TechStrongWatchlist(Base):
    __tablename__ = 'technicals_strongStocks_watchlist'
    __table_args__ = {'schema': 'quant_research'}
    id = Column(Integer, primary_key=True, autoincrement=True)
    trade_date = Column(Date)
    ticker = Column(VARCHAR)
    board = Column(VARCHAR)
    score = Column(FLOAT)

    def __repr__(self):
        return "<TechStrongWatchlist(name=technicals_strongStocks_watchlist, comment= 技术流派-强势股观察名单)>"


class TechStrongSignals(Base):
    __tablename__ = 'technicals_strongStocks_signals'
    __table_args__ = {'schema': 'quant_research'}
    id = Column(Integer, primary_key=True, autoincrement=True)
    trade_date = Column(Date)
    ticker = Column(VARCHAR)
    board = Column(VARCHAR)
    score = Column(FLOAT)

    def __repr__(self):
        return "<TechStrongWatchlist(name=technicals_strongStocks_watchlist, comment= 技术流派-强势股观察名单)>"