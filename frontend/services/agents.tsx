

// 基本面研究流式接口对象
const FundamentalAgentAPI = {
  streamAnalysis: (
    userInput: string,
    stockCode: string,
    reportDate: string,
  ): EventSource => {
    const params = new URLSearchParams({
      userInput,
      stockCode,
      reportDate,
    });

    const url = `http://localhost:8000/agents_sse/multiagents/fundamental?${params.toString()}`;

    // 创建 SSE
    const eventSource = new EventSource(url, { withCredentials: false });
    return eventSource;
  },
};

export default FundamentalAgentAPI;