import pandas as pd
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from strategy_management.routes import strategy_router
from agents.multiagents import agents_router
from fastapi.middleware.cors import CORSMiddleware
import os

# 创建FastAPI应用
app = FastAPI(title="每日选股复盘系统", description="提供策略和个股研究的管理功能")

# 注册路由
app.include_router(strategy_router)
app.include_router(agents_router)

@app.get("/")
async def root():
    """API根路径，返回欢迎信息"""
    return {
        "message": "欢迎使用交易策略管理系统",
        "endpoints": {
            "strategies": "/strategies/",
            "agents": "/agents_sse/"
        }
    }

origins = [
    "http://localhost",
    "http://localhost:3000",  # React默认端口
    "http://127.0.0.1",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
]

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许的源列表
    allow_credentials=True,  # 允许cookies
    allow_methods=["*"],    # 允许所有方法
    allow_headers=["*"],    # 允许所有头信息
)


if __name__ == '__main__':
    print(os.getcwd())
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True, log_level='debug')