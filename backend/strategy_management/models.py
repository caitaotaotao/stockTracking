from pydantic import BaseModel
from typing import Optional, Dict

class Strategy(BaseModel):
    """策略模型"""
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    performance_metrics: Optional[Dict[str, float]] = None
