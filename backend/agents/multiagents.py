"""
    基本面研究多角色智能体：(基本面A、基本面B、情绪面C) --> 决策角色
    feature: 支持流式输出
    feature: 持久化校验
"""

import asyncio
import datetime
import json
import logging
import pandas as pd
import yaml
import asyncpg
from fastapi import Request
from fastapi.responses import StreamingResponse
from typing import Dict, Any
from databases.databases_connection import Session
from databases.data_models import MarketPriceDaily
from fastapi import APIRouter
from agents.async_model_calls import DoubaoAsyncStreamer, KimiAsyncStreamer, GPTAsyncStreamer, \
    MultiAgents

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("./logs/fundamental_agents.txt", mode="a", encoding="utf-8"),
        logging.StreamHandler()  # 控制台输出
    ],
)
logger = logging.getLogger(__name__)


def prompt_price_data(stock_code: str):
    """
        获取股票行情数据
        :param stock_code: 股票代码
        :return:
    """
    if len(stock_code) > 6:
        stock_code = stock_code[:6]

    with Session() as session:
        _data = session.query(MarketPriceDaily.trade_date, MarketPriceDaily.open, MarketPriceDaily.high,
                              MarketPriceDaily.low, MarketPriceDaily.close, MarketPriceDaily.vol,
                              MarketPriceDaily.amount
                              ).filter(
            MarketPriceDaily.ticker == stock_code
        ).order_by(MarketPriceDaily.trade_date.desc()).limit(20)
        _data = pd.DataFrame(_data)
        _data.sort_values(by="trade_date", ascending=False, inplace=True)
        # 计算涨跌幅、成交量变化
        _data["pct_change"] = _data["close"].pct_change() * 100
        _data["vol_change"] = _data["vol"].pct_change() * 100

    # 合成量价提示词
    lines = []
    for i, row in _data.iterrows():
        date = row["trade_date"].strftime("%Y-%m-%d")
        open_p, high_p, low_p, close_p = row["open"], row["high"], row["low"], row["close"]
        vol, amount = row["vol"], row["amount"]
        pct = row["pct_change"]
        volchg = row["vol_change"]

        # 跳过首行（无对比基准）
        if pd.isna(pct):
            desc = f"{date}：开盘 {open_p:.2f}，最高 {high_p:.2f}，最低 {low_p:.2f}，收盘 {close_p:.2f}，成交量 {vol:.2f}万，成交额 {amount:.0f}万。"
            lines.append(f"0. {desc}（首个交易日数据，用于基准）")
            continue

        # 涨跌描述
        direction = "上涨" if pct > 0 else "下跌" if pct < 0 else "持平"
        vol_desc = ""
        if pd.notna(volchg):
            if volchg > 150:
                vol_desc = "放量"
            elif volchg < -60:
                vol_desc = "缩量"
            else:
                vol_desc = "量能平稳"

        # K线形态粗略识别
        body = abs(close_p - open_p)
        candle_range = high_p - low_p
        if candle_range == 0:
            shape = "十字星"
        else:
            body_ratio = body / candle_range
            if body_ratio > 0.7:
                shape = "长实体K线"
            elif body_ratio < 0.2:
                shape = "十字星"
            else:
                shape = "中等实体K线"

        desc = (
            f"{date}：开盘 {open_p:.2f}，最高 {high_p:.2f}，最低 {low_p:.2f}，收盘 {close_p:.2f}，"
            f"{direction} {pct:+.2f}%，{vol_desc}（成交量 {vol:.2f}万，成交额 {amount:.0f}万），"
            f"形成{shape}。"
        )
        lines.append(f"{i}. {desc}")
    _prompt = "\n".join(lines)
    return _data, _prompt


"""封装模型异步输出"""


class Node_doubao(DoubaoAsyncStreamer):
    """基本面节点A，采用豆包流式输出"""

    def __init__(self, model_id: str = "doubao-seed-1-6-251015"):
        super().__init__()
        self.model_id = model_id
        self.thinking_content = ""
        self.content_out = ""

        # 读取提示词文件
        with open("./agents/prompts/fundamental_analysis.yaml", "r", encoding="utf-8") as f:
            prompt = yaml.safe_load(f)
            self.fundamental_prompt = prompt.get("fundamental_systems").replace(
                "{{ today }}", datetime.datetime.today().strftime("%Y-%m-%d"))  # 基本面分析提示词

    async def agent_output(self, user_input: str):
        # 构建模型入参
        create_params = {
            "model": self.model_id,
            "input": [
                {"role": "system",
                 "content": [{"type": "input_text", "text": self.fundamental_prompt}]},
                {"role": "user", "content": [{"type": "input_text", "text": user_input}], }
            ],
            "tools": [{"type": "web_search", "limit": 15, }],
            "stream": True,
        }
        thinking_out = []
        content_out = []
        async for event in self.streaming_out(create_params):

            if event['phase'] == 'thinking':
                thinking_out.append(event['content'])
            if event['phase'] == 'output':
                content_out.append(event['content'])

            if event['phase'] == 'done':
                yield f"{json.dumps({"node": "fundamental_A", "state": "done", "data": event},
                                    ensure_ascii=False)}\n\n"
            else:
                yield f"{json.dumps({"node": "fundamental_A", "state": "in_progress", "data": event},
                                    ensure_ascii=False)}\n\n"
        logger.info("fundamental_A DOUBAO节点输出完成")
        self.thinking_content = "".join(thinking_out)
        self.thinking_content = self.thinking_content.replace(r"\n", "<br>")
        self.content_out = "".join(content_out)
        self.content_out = self.content_out.replace(r"\n", "<br>")


class Node_kimi(KimiAsyncStreamer):
    """基本面节点B, 情绪面节点B，采用Kimi流式输出"""

    def __init__(self, model_id: str = "kimi-k2-0711-preview"):
        super().__init__()
        self.model_id = model_id
        # 读取提示词文件
        with open("./agents/prompts/fundamental_analysis.yaml", "r", encoding="utf-8") as f:
            prompt = yaml.safe_load(f)
            self.fundamental_prompt = prompt.get("fundamental_systems").replace(
                "{{ today }}", datetime.datetime.today().strftime("%Y-%m-%d"))  # 基本面分析提示词
            self.emotional_systems = prompt.get("emotional_systems").replace(
                "{{ today }}", datetime.datetime.today().strftime("%Y-%m-%d"))  # 情绪面分析提示词

        self.fundamental_thinking_content = ""
        self.fundamental_content_out = ""
        self.emotional_thinking_content = ""
        self.emotional_content_out = ""

    async def agent_fundamental_output(self, user_input: str):
        create_params = {
            "model": self.model_id,
            "messages": [
                {"role": "system", "content": self.fundamental_prompt},
                {"role": "user", "content": user_input}
            ],
            "stream": False,
            "tools": [{"type": "builtin_function", "function": {"name": "$web_search"}}],
        }
        thinking_out = []
        content_out = []
        async for event in self.streaming_out(create_params):

            if event['phase'] == 'thinking':
                thinking_out.append(event['content'])
            if event['phase'] == 'output':
                content_out.append(event['content'])

            if event['phase'] == 'done':
                yield f"{json.dumps({"node": "fundamental_B", "state": "done", "data": event},
                                    ensure_ascii=False)}\n\n"
            else:
                yield f"{json.dumps({"node": "fundamental_B", "state": "in_progress", "data": event},
                                    ensure_ascii=False)}\n\n"
        logger.info("fundamental_B kimi节点输出完成")
        self.fundamental_thinking_content = "".join(thinking_out)
        self.fundamental_content_out = "".join(content_out)
        self.fundamental_thinking_content = self.fundamental_thinking_content.replace(r"\n", "<br>")
        self.fundamental_content_out = self.fundamental_content_out.replace(r"\n", "<br>")

    async def agent_emotional_output(self, user_input: str):
        create_params = {
            "model": self.model_id,
            "messages": [
                {"role": "system", "content": self.emotional_systems},
                {"role": "user", "content": user_input}
            ],
            "stream": False,
            "tools": [{"type": "builtin_function", "function": {"name": "$web_search"}}],
        }
        thinking_out = []
        content_out = []
        async for event in self.streaming_out(create_params):

            if event['phase'] == 'thinking':
                thinking_out.append(event['content'])
            if event['phase'] == 'output':
                content_out.append(event['content'])

            if event['phase'] == 'done':
                yield f"{json.dumps({"node": "emotional_A", "state": "done", "data": event},
                                    ensure_ascii=False)}\n\n"
            else:
                yield f"{json.dumps({"node": "emotional_A", "state": "in_progress", "data": event},
                                    ensure_ascii=False)}\n\n"
        logger.info("emotional_A kimi节点输出完成")
        self.emotional_thinking_content = "".join(thinking_out)
        self.emotional_content_out = "".join(content_out)
        self.emotional_thinking_content = self.emotional_thinking_content.replace(r"\n", "<br>")
        self.emotional_content_out = self.emotional_content_out.replace(r"\n", "<br>")


class Node_gpt5(GPTAsyncStreamer):
    """推理节点，异步封装GPT5输出"""

    def __init__(self, model_id: str = "gpt-5"):
        super().__init__()
        self.model_id = model_id
        self.thinking_content = ""
        self.output_content = ""

        # 读取提示词文件
        with open("./agents/prompts/fundamental_analysis.yaml", "r", encoding="utf-8") as f:
            prompt = yaml.safe_load(f)
            self.conclusion_systems = prompt.get("conclusion_systems")  # 决策分析提示词

    async def agent_fundamental_output(self, stock_code: str, node_output: dict):
        """
        聚合前置节点输出，GPT5推理最后结果
        :param stock_code:
        :param node_output: {"node_i": "output_text"}
        :return:
        """
        if len(stock_code) > 6:
            stock_code = stock_code[:6]
        try:
            _, technical_prompt = prompt_price_data(stock_code)
            logger.info(f"{stock_code} 获取技术指标数据成功")
        except Exception as e:
            logger.error(e)
            technical_prompt = ""

        technical_prompt = technical_prompt + "\n"
        _system_prompt = self.conclusion_systems.replace("{{ price_data }}", technical_prompt)

        # 根据前置节点情况，添加上下文
        _messages = [{"role": "system", "content": _system_prompt}, ]
        for i in node_output.keys():
            _content = node_output[i]
            if len(_content) == 0:
                logger.info(f"{i} 无输出内容")
                continue
            else:
                _text = str(i) + ": " + _content
                _messages.append({"role": "user", "content": _text})

        create_params = {
            "model": self.model_id,
            "input": _messages,
            "stream": True,
        }
        thinking_out = []
        content_out = []
        logger.info(f"GPT5推理开始")
        async for event in self.streaming_out(create_params):

            if event['phase'] == 'thinking':
                thinking_out.append(event['content'])
            if event['phase'] == 'output':
                content_out.append(event['content'])

            if event['phase'] == 'done':
                yield f"{json.dumps({"node": "conclusion", "state": "done", "data": event},
                                    ensure_ascii=False)}\n\n"
            else:
                yield f"{json.dumps({"node": "conclusion", "state": "in_progress", "data": event},
                                    ensure_ascii=False)}\n\n"
        logger.info(f"gpt5节点输出完成")
        self.thinking_content = "".join(thinking_out)
        self.output_content = "".join(content_out)
        self.thinking_content = self.thinking_content.replace(r"\n", "<br>")
        self.output_content = self.output_content.replace(r"\n", "<br>")


"""封装智能体，异步完成A,B,C -> D节点输出"""


class FundamentalAgent(MultiAgents):
    def __init__(self, node_doubao: Node_doubao, node_kimi: Node_kimi, node_gpt: Node_gpt5):
        super().__init__()
        # 创建节点
        self.node_doubao = node_doubao
        self.node_kimi = node_kimi
        self.node_gpt = node_gpt


"""异步写入pgsql"""
pg_pool: asyncpg.Pool | None = None


async def init_agent_db_pool():
    global pg_pool
    pg_pool = await asyncpg.create_pool(
        'postgresql://postgres:941010@localhost:5432/quant_analysis',
        min_size=5,
        max_size=20
    )


def state_to_jsonable(state: Any) -> Dict:
    """
    把 state 转成可以存入 JSONB 的 dict。
    这里尝试几种常见方法以兼容 TypedDict / dataclass / simple dict。
    """
    if state is None:
        return {}
    # 如果本身就是 dict-like
    try:
        if isinstance(state, dict):
            # 深拷贝确保可序列化
            return json.loads(json.dumps(state, ensure_ascii=False))
    except Exception:
        pass

    # dataclass 或 普通对象
    try:
        return json.loads(json.dumps(state.__dict__, ensure_ascii=False))
    except Exception:
        pass

    # fallback: 尝试直接 json.dumps（如果失败会抛异常）
    return json.loads(json.dumps(state, default=str, ensure_ascii=False))


async def save_state_to_pgsql(state: Any, stock_code: str | None, user_input: str | None, report_date,
                              business_type: int = 1):
    """
    将整个 state 写入 Postgres 的 agent_states 表（jsonb）
    该函数会被 create_task 调用（即后台执行，不阻塞 SSE）
    """
    global pg_pool
    if len(stock_code) > 6: # type: ignore
        stock_code = stock_code[:6] # type: ignore
    try:
        payload = state_to_jsonable(state)
        if pg_pool is None:
            logger.error("pg_pool is None, cannot save state")
            return

        # 若想记录更多字段可以扩展 INSERT 语句
        await pg_pool.execute(
            """
            INSERT INTO ai_agents.fundamental_agents_state (stock_code, user_input, report_date, state, business_type)
            VALUES ($1, $2, $3, $4, $5)
            """,
            stock_code,
            user_input,
            report_date,
            json.dumps(payload, ensure_ascii=False),
            business_type
        )
        logger.info("Saved agent state to Postgres")
    except Exception as e:
        logger.exception("Error saving state to Postgres: %s", e)


async def get_history_output(stock_code: str, report_date: datetime.date, business_type: int = 1):
    global pg_pool
    if len(stock_code) > 6:
        stock_code = stock_code[:6]
    try:
        if pg_pool is None:
            logger.error("pg_pool is None, cannot save state")
            return
        return await pg_pool.fetch(
            """
            SELECT * FROM ai_agents.fundamental_agents_state
            WHERE stock_code = $1 AND report_date = $2 AND business_type = $3
            ORDER BY created_at DESC
            limit 1
            """,
            stock_code,
            report_date,
            business_type
        )
    except Exception as e:
        logger.exception("Error saving state to Postgres: %s", e)

agents_router = APIRouter(prefix="/agents_sse")


@agents_router.get("/multiagents/fundamental")
async def multiagents_fundamental(
        userInput: str,
        stockCode: str,
        reportDate: str,
        request: Request,
):
    report_date = pd.to_datetime(reportDate).date()

    temp = False

    # 校验是否存在持久化信息
    output_db = await get_history_output(stockCode, report_date)
    if len(output_db) > 0: # type: ignore
        temp = True
        output = json.loads(output_db[0].get("state")) # type: ignore
    else:
        agent = FundamentalAgent(
            node_doubao=Node_doubao(),
            node_kimi=Node_kimi(),
            node_gpt=Node_gpt5(),
        )
        queue = asyncio.Queue()

        # 启动任务
        tasks = [
            asyncio.create_task(agent.reader_task(task_name="fundamental_A",
                                                  stream=agent.node_doubao.agent_output(userInput),
                                                  queue=queue)),
            asyncio.create_task(agent.reader_task(task_name="fundamental_B",
                                                  stream=agent.node_kimi.agent_fundamental_output(userInput),
                                                  queue=queue)),
            asyncio.create_task(agent.reader_task(task_name="emotional_A",
                                                  stream=agent.node_kimi.agent_emotional_output(userInput),
                                                  queue=queue)),
        ]

    async def event_gen():
        if temp:
            logger.info("开始读取持久化信息")
            index = 0
            for key in ["fundamental_A", "fundamental_B", "emotional_A", "conclusion"]:
                _content = output.get(key) # type: ignore
                yield f"data: {json.dumps({'node': key, 'state': 'in_progress', 
                                           'data': {"phase": "output", "content": _content, 
                                                    "annotation": {}, "model": "", "id": "",
                                                    "index": index}},  ensure_ascii=False)}\n\n"
                index += 1

            yield f"data: {json.dumps({'node': '', 'state': 'done', 'data': {
                "phase": "", "content": "", "annotation": {}, "model": "", "id": "", "index": index
            }}, ensure_ascii=False)}\n\n"
            logger.info(f"持久化信息读取完毕, 共输出{index}条数据")
        else:
            logger.info(f"无持久化信息，查询参数：{stockCode}、{report_date}")
            logger.info("开始基本面、情绪面节点并行输出")
            async for event in agent.merge_stream(request, queue, len(tasks)): # type: ignore
                yield f"data: {event}\n\n"

            # 聚合输出
            prev_output = {
                'fundamental_A': agent.node_doubao.content_out, # type: ignore
                'fundamental_B': agent.node_kimi.fundamental_content_out, # type: ignore
                'emotional_A': agent.node_kimi.emotional_content_out # type: ignore
            }
            logger.info(
                f"各节点聚合完成, fundamantal_A: {len(prev_output['fundamental_A'])}, fundamental_B: {len(prev_output['fundamental_B'])}, emotional: {len(prev_output['emotional_A'])}"
            )
            async for event in agent.node_gpt.agent_fundamental_output(stockCode, prev_output): # type: ignore
                yield f"data: {event}\n\n"

            yield f"data: {json.dumps({'node': '', 'state': 'done', 'content': ''})}\n\n"

            prev_output['conclusion'] = agent.node_gpt.output_content # type: ignore
            # 清理任务
            for t in tasks: # type: ignore
                t.cancel()
            await asyncio.gather(*tasks, return_exceptions=True) # type: ignore

            # 持久化智能体输出结果
            await save_state_to_pgsql(prev_output, stockCode, userInput, report_date, 1)

    return StreamingResponse(event_gen(), media_type="text/event-stream")
