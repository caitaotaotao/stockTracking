from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, Dict, Annotated, List
from datetime import datetime

class Strategy(BaseModel):
    """策略模型"""
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    performance_metrics: Optional[Dict[str, float]] = None

class StrategyResultRequest(BaseModel):
    """策略结果查询请求"""
    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,  # 自动去除字符串前后空格
        json_schema_extra={
            "examples": [
                {
                    "strategyId": 1,
                    "reportDate": "2025-01-05",
                    "datePeriod": 1,
                    "stage": 1
                }
            ]
        }
    )
    strategy_id: Annotated[int, Field(alias='strategyId', description="策略ID")]
    report_date: Annotated[Optional[str], Field(alias='reportDate', description="报告日期")] = "2025-09-30"
    date_period: Annotated[Optional[int], Field(alias='datePeriod', description="日期周期")] = 3
    stage: Annotated[Optional[int], Field(description="阶段")] = 1
    
    @field_validator('report_date', mode='before')
    @classmethod
    def parse_and_validate_date(cls, v) -> str:
        """解析并验证日期格式"""
        if isinstance(v, str):
            # 支持多种格式
            for fmt in ['%Y-%m-%d', '%Y/%m/%d', '%Y%m%d']:
                try:
                    dt = datetime.strptime(v, fmt)
                    return dt.strftime('%Y-%m-%d')
                except ValueError:
                    continue
            raise ValueError('日期格式错误，支持格式：YYYY-MM-DD, YYYY/MM/DD, YYYYMMDD')
        raise ValueError('日期必须是字符串')

class StrategyStockItem(BaseModel):
    """策略股票结果"""
    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )
    
    code: str = Field(description="股票代码")
    short_name: str = Field(alias='shortName', description="股票简称")
    industry_name: str = Field(alias='industryName', description="行业名称")
    latest_mv: Optional[float] = Field(None, alias='latestMV', description="最新市值")
    change_20d: Optional[float] = Field(None, alias='change20D', description="20日涨跌幅")
    signal: float = Field(description="信号值")
    themes: List[str] = Field(default_factory=list, description="主题标签")
    stage: str = Field(default="", description="阶段")

class StrategyFilter(BaseModel):
    """策略筛选项请求"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=None
    )
    
    strategy_id: int = Field(alias='strategyId', description="策略ID")