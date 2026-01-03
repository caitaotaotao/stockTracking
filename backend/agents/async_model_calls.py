"""
    异步封装大模型的同步stream返回，以支持异步并行多智能体调用
"""
import asyncio
import threading
import os
import json
from typing import Any, AsyncGenerator, Dict, Optional
from volcenginesdkarkruntime import Ark
from dotenv import load_dotenv
from openai import OpenAI
from openai.types.chat import ChatCompletionChunk
from fastapi import Request

load_dotenv()  # 加载环境变量


class DoubaoAsyncStreamer:
    """
    将豆包（火山Ark）的同步流封装为异步流式输出。
    可直接在 FastAPI 或 LangGraph 中使用。

    用法示例：
        streamer = DoubaoAsyncStreamer(api_key="sk-xxx")
        async for event in streamer.stream(params):
            yield event
    """

    def __init__(self):
        self.client = Ark(
            base_url='https://ark.cn-beijing.volces.com/api/v3',
            api_key=os.getenv("ARK_API_KEY")
        )

    async def stream(self, create_params: Dict[str, Any],
                     timeout: Optional[float] = 60.0) -> AsyncGenerator[Dict[str, Any], None]:
        """
        异步生成器：实时yield豆包事件
        :create_params: {"model": model_id, "input": messages, "stream": True, "tools": ["type" : "web_search", "limit": 15]}
        """
        queue: asyncio.Queue = asyncio.Queue()
        loop = asyncio.get_running_loop()
        done_flag = threading.Event()

        def _blocking_stream():
            """在后台线程运行豆包同步流"""
            try:
                with self.client.responses.create(**create_params) as stream: # type: ignore
                    for event in stream:
                        asyncio.run_coroutine_threadsafe(queue.put(event), loop)
                asyncio.run_coroutine_threadsafe(queue.put({"event": "done"}), loop)
            except Exception as e:
                asyncio.run_coroutine_threadsafe(queue.put({"event": "error", "message": str(e)}), loop)
            finally:
                done_flag.set()  # 标记线程完成

        thread = threading.Thread(target=_blocking_stream, daemon=True)
        thread.start()

        # 异步消费队列
        while not done_flag.is_set() or not queue.empty():
            try:
                item = await asyncio.wait_for(queue.get(), timeout=timeout)
                if isinstance(item, dict) and item.get("event") == "done":
                    break
                yield item
            except asyncio.TimeoutError:
                yield {"event": "error", "message": "stream timeout"}
                break

        thread.join(timeout=0.1)

    async def streaming_out(self, create_params: Dict[str, Any]):
        """解析豆包原始流式输出结果"""

        streamer = self.stream(create_params)
        steps = 0
        model = ''
        response_id = ''
        async for event in streamer:
            try:
                if isinstance(event, dict) and event.get("event") == "error":
                    yield {"phase": "error", "content": event['message'], "annotation": {}, "model": '',
                           "id": '', "index": steps}
                if event.type == 'response.created': # type: ignore
                    model = event.response.model # type: ignore
                    response_id = event.response.id # type: ignore
                if event.type == 'response.reasoning_summary_text.delta': # type: ignore
                    yield {"phase": "thinking", "content": event.delta, "annotation": {}, "model": model, # type: ignore
                           "id": response_id, "index": steps}
                if event.type == 'response.output_text.delta': # type: ignore
                    yield {"phase": "output", "content": event.delta, "annotation": {}, "model": model, # type: ignore
                           "id": response_id, "index": steps}
                if event.type == 'response.output_text.annotation.added': # type: ignore
                    # 检索引用结果输出
                    _annotation = {
                        "title": event.annotation.title, # type: ignore
                        "type": event.annotation.type, # type: ignore
                        "url": event.annotation.url, # type: ignore
                        "site_name": event.annotation.site_name, # type: ignore
                        "publish_time": event.annotation.publish_time, # type: ignore
                        "summary": event.annotation.summary, # type: ignore
                    }
                    yield {"phase": "annotation", "content": "", "annotation": _annotation, "model": model,
                           "id": response_id, "index": steps}
                if event.type == 'response.completed': # pyright: ignore[reportAttributeAccessIssue]
                    yield {"phase": "completed", "content": "", "annotation": {}, "model": model, "id": response_id, "index": steps}
                if event.type == 'error': # pyright: ignore[reportAttributeAccessIssue]
                    yield {"phase": "error", "content": f"错误码：{event.code}, 错误提示: {event.message}", "annotation": {}, # type: ignore
                           "model": model, "id": response_id, "index": steps}

                steps += 1
            except Exception as e:
                yield {"phase": "error", "content": f"错误信息：{e}", "annotation": {}, "model": model, "id": response_id}


class KimiAsyncStreamer:
    """
    将KIMI的同步流封装为异步流式输出。
    可直接在 FastAPI 或 LangGraph 中使用。

    用法示例：
        streamer = DoubaoAsyncStreamer(api_key="sk-xxx")
        async for event in streamer.stream(params):
            yield event
    """

    def __init__(self):
        self.client = OpenAI(base_url="https://api.moonshot.cn/v1", api_key=os.getenv("KIMI_API_KEY"))

    def kimi_model_call(self, create_params: Dict[str, Any]):
        # noinspection PyTypeChecker
        resp = self.client.chat.completions.create(**create_params)
        return resp.choices[0]

    def search_impl(self, arguments: Dict[str, Any]) -> Any:
        """
        对于 Moonshot 的内置联网功能，只需原样返回 arguments。
        模型内部会完成联网逻辑。
        """
        return arguments

    async def stream(self, create_params: Dict[str, Any],
                     timeout: Optional[float] = 60.0):
        """
        异步生成器：实时yield KIMI事件 :create_params: {"model": model_id, "messages": messages, "stream": True,
        "tools": ["type" : "builtin_function", "function": {"name": "$web_search"}]}
        """
        queue: asyncio.Queue = asyncio.Queue()
        loop = asyncio.get_running_loop()
        done_flag = threading.Event()

        def _blocking_stream():
            # 在后台运行KIMI同步流
            _messages = create_params['messages']
            try:
                create_params['stream'] = False
                resp = self.kimi_model_call(create_params)  # 首先使用同步函数获取检索结果
                if resp.finish_reason == "tool_calls":
                    _messages.append(resp.message)
                    _choice = resp
                    for tool_call in _choice.message.tool_calls:
                        tool_call_id = tool_call.id
                        tool_call_name = tool_call.function.name
                        tool_call_arguments = json.loads(tool_call.function.arguments)

                        if tool_call_name == "$web_search":
                            tool_result = self.search_impl(tool_call_arguments)
                        else:
                            tool_result = f"Error: unknown tool '{tool_call_name}'"

                        # 把联网结果添加至上下文
                        _messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call_id,
                            "name": tool_call_name,
                            "content": json.dumps(tool_result),
                        })
                    create_params['stream'] = True
                    create_params['messages'] = _messages
                    print("KIMI....检索完成")
                # 将一轮检索结果，返回给大模型进行流式输出
                with self.client.chat.completions.create(**create_params) as stream:
                    for event in stream:
                        asyncio.run_coroutine_threadsafe(queue.put(event), loop)
                asyncio.run_coroutine_threadsafe(queue.put({"event": "done"}), loop)
            except Exception as e:
                asyncio.run_coroutine_threadsafe(queue.put({"event": "error", "message": str(e)}), loop)
            finally:
                done_flag.set()  # 标记线程完成

        thread = threading.Thread(target=_blocking_stream, daemon=True)
        thread.start()

        # 异步消费队列
        while not done_flag.is_set() or not queue.empty():
            try:
                item = await asyncio.wait_for(queue.get(), timeout=timeout)
                if isinstance(item, dict) and item.get("event") == "done":
                    break
                yield item

            except asyncio.TimeoutError:
                yield {"event": "error", "message": "stream timeout"}
                break

        thread.join(timeout=0.1)

    async def streaming_out(self, create_params: Dict[str, Any]):
        """解析KIMI原始流式输出结果"""
        streamer = self.stream(create_params)
        step = 0
        async for event in streamer:

            if isinstance(event, dict) and event.get("event") == "error":
                yield {"phase": "error", "content": event['message'], "annotation": {}, "model": '',
                       "id": '', "index": step}

            if isinstance(event, ChatCompletionChunk) and getattr(event, "choices", None):
                choice = event.choices[0]
                response_id = event.id
                model = event.model

                if choice.delta and hasattr(choice.delta, "reasoning_content"):
                    yield {"phase": "thinking", "content": getattr(choice.delta, "reasoning_content"), "annotation": {},
                           "model": model, "id": response_id, "index": step}

                if choice.delta and choice.delta.content:
                    yield {"phase": "output", "content": choice.delta.content, "annotation": {}, "model": model,
                           "id": response_id, "index": step}

                if choice.finish_reason == "stop":
                    yield {"phase": "done", "content": "", "annotation": {}, "model": model,
                           "id": response_id, "index": step}
            step += 1


class GPTAsyncStreamer:
    """
    将GPT5的同步流封装为异步流式输出。
    可直接在 FastAPI 或 LangGraph 中使用。

    用法示例：
        streamer = DoubaoAsyncStreamer(api_key="sk-xxx")
        async for event in streamer.stream(params):
            yield event
    """
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("AIONLY_API_KEY"), base_url="https://api.aiionly.com/v1")

    async def stream(self, create_params: Dict[str, Any],
                     timeout: Optional[float] = 180.0) -> AsyncGenerator[Dict[str, Any], None]:
        """
        异步生成器：实时yield豆包事件
        :create_params: {"model": model_id, "input": messages, "stream": True, "reasoning": {"effort": "medium"}}
        """
        queue: asyncio.Queue = asyncio.Queue()
        loop = asyncio.get_running_loop()
        done_flag = threading.Event()

        def _blocking_stream():
            """在后台线程运行GPT同步流"""
            try:
                with self.client.responses.create(**create_params) as stream:
                    print(f"GPT5请求开始，请求参数{create_params}")
                    for event in stream:
                        asyncio.run_coroutine_threadsafe(queue.put(event), loop)
                asyncio.run_coroutine_threadsafe(queue.put({"event": "done"}), loop)
            except Exception as e:
                asyncio.run_coroutine_threadsafe(queue.put({"event": "error", "message": str(e)}), loop)
            finally:
                done_flag.set()  # 标记线程完成

        thread = threading.Thread(target=_blocking_stream, daemon=True)
        thread.start()

        # 异步消费队列
        while not done_flag.is_set() or not queue.empty():
            try:
                item = await asyncio.wait_for(queue.get(), timeout=timeout)
                if isinstance(item, dict) and item.get("event") == "done":
                    break
                yield item
            except asyncio.TimeoutError:
                yield {"event": "error", "message": "stream timeout"}
                break

        thread.join(timeout=0.1)

    async def streaming_out(self, create_params: Dict[str, Any]):
        """解析GPT5原始流式输出结果"""
        streamer = self.stream(create_params)
        step = 0
        model = ''
        response_id = ''
        async for event in streamer:
            try:
                if isinstance(event, dict) and event.get("event") == "error":
                    yield {"phase": "error", "content": event['message'], "annotation": {}, "model": '',
                           "id": '', "index": step}
                    continue

                if event.type == "response.created": # type: ignore
                    model = event.response.model # type: ignore
                    response_id = event.response.id # type: ignore
                if event.type == "response.reasoning_summary_text.delta": # type: ignore
                    yield {"phase": "thinking", "content": event.delta, "annotation": {}, # type: ignore
                           "model": model, "id": response_id, "index": step}
                if event.type == "response.output_text.delta": # type: ignore
                    yield {"phase": "output", "content": event.delta, "annotation": {}, # type: ignore
                           "model": model, "id": response_id, "index": step}
                if event.type == "response.completed": # type: ignore
                    yield {"phase": "done", "content": "", "annotation": {},
                           "model": model, "id": response_id, "index": step}
                step += 1
            except Exception as e:
                yield {"phase": "error", "content": f"错误信息：{e}", "annotation": {}, "model": model, "id": response_id}


class MultiAgents:
    """并行接收、拼流基类"""
    def __init__(self):
        pass

    async def reader_task(self, task_name: str, stream, queue: asyncio.Queue):
        """从单个节点读数据放入队列"""
        try:
            async for chunk in stream:
                await queue.put({"type": "data", "node": task_name, "text": chunk})
            await queue.put({"type": "end", "node": task_name})
        except Exception as e:
            await queue.put({"type": "error", "node": task_name, "error": str(e)})

    async def merge_stream(self, request: Request, queue: asyncio.Queue, nodes_total: int):
        ended = set()
        while True:
            if await request.is_disconnected():
                print("Client disconnected")
                break
            item = await queue.get()
            if item["type"] == "data":
                yield item["text"]
            elif item["type"] == "end":
                ended.add(item["node"])
                if len(ended) == nodes_total:
                    break
            elif item["type"] == "error":
                print(f"Error from node {item['node']}: {item['error']}")

            await asyncio.sleep(0.01)  # 每秒最多 100 条事件
