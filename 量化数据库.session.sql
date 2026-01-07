-- 获取最新 end_date 的股票记录
            SELECT a.code, b.short_name, a.end_date, a.industry_code as industry_name, a.signal_growth as score
            FROM quant_research.strategy_growth_momentum as a
            left join quant_research.basic_info_stock as b on a.code = b.ticker
            WHERE end_date = (
                SELECT MAX(end_date)
                FROM quant_research.strategy_growth_momentum
            )
            ORDER BY signal_growth desc;



            SELECT a.code, b.short_name, a.end_date, a.industry_name, a.signal as score
            FROM quant_research.strategy_divquality as a
            left join quant_research.basic_info_stock as b on a.code = b.ticker
            WHERE a.end_date = (
                SELECT MAX(end_date)
                FROM quant_research.strategy_divquality
            )
            ORDER BY a.signal desc;


with sw_contituent as (
            select l1_name, ts_code
            from (
                select *, row_number() over (PARTITION BY ts_code order by in_date DESC) AS rn
                from quant_research.sw_industry_constituent
            ) as ranked
            where rn=1
        ),
    latest_mv as (
        select code, trade_date, total_mv
        from quant_research.indicator_daily
        where trade_date = (
            select MAX(trade_date)
            from quant_research.indicator_daily
        )
    )
SELECT a.ticker as code, b.short_name, a.trade_date, c.l1_name as industry_name, a.score, d.total_mv
FROM quant_research."technicals_strongStocks_watchlist" as a
left join quant_research.basic_info_stock as b on a.ticker = b.ticker
left join sw_contituent as c on a.ticker = c.ts_code
left join latest_mv as d on a.ticker = d.code
WHERE a.trade_date in (
    SELECT trade_date
    FROM quant_research."technicals_strongStocks_watchlist"
    order BY trade_date DESC LIMIT 3
    )
ORDER BY a.trade_date desc, a.score desc;


select * from quant_research."technicals_strongStocks_watchlist"