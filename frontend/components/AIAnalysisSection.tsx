import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Collapse, Tag, Space, Spin, Typography, Button } from 'antd';
import { 
  LoadingOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  RobotOutlined,
  SearchOutlined,
  HeartOutlined,
  BulbOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import FundamentalAgentAPI from '../services/agents';
import type { Stock } from '../src/types';

const { Text } = Typography;

interface AIAnalysisSectionProps {
  stock: Stock | null;
  report_date: string;
  triggerKey: number;
  onAnalysisState?: (status: 'idle' | 'analyzing' | 'completed' | 'error', stock: Stock) => void;  // 分析状态回调
}

type Phase = "thinking" | "output" | "error";

interface NodeEvent {
  node: string;
  state: "idle" | "in_progress" | "done" | "error";
  data: {
    phase: Phase;
    content: string;
    annotations?: any;
    model?: string;
    id?: string;
    index?: number;
  };
}

type NodeState = {
  thinking: string;
  output: string;
  phase: Phase | null;
  state: "idle" | "in_progress" | "done" | "error";
};

const NODE_CONFIG = [
  { 
    id: "fundamental_A", 
    label: "豆包基本面", 
    color: "blue", 
    icon: <RobotOutlined />,
    key: "1"
  },
  { 
    id: "fundamental_B", 
    label: "KIMI 基本面", 
    color: "purple", 
    icon: <SearchOutlined />,
    key: "2"
  },
  { 
    id: "emotional_A", 
    label: "KIMI 情绪面", 
    color: "magenta", 
    icon: <HeartOutlined />,
    key: "3"
  },
  { 
    id: "conclusion", 
    label: "GPT 总结", 
    color: "gold", 
    icon: <BulbOutlined />,
    key: "4"
  }
];

const AIAnalysisSection = ({ stock, report_date, triggerKey, onAnalysisState }: AIAnalysisSectionProps) => {
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'completed' | 'error'>('idle');
  const [nodes, setNodes] = useState<Record<string, NodeState>>(() =>
    NODE_CONFIG.reduce((acc, n) => {
      acc[n.id] = { thinking: "", output: "", phase: null, state: "idle" };
      return acc;
    }, {} as Record<string, NodeState>)
  );
  
  const [activeNode, setActiveNode] = useState<string>("");
  
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const bufferRef = useRef<Record<string, Partial<NodeState>>>({});
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const phaseKeyMap: Record<Phase, "thinking" | "output" | null> = {
    thinking: "thinking",
    output: "output",
    error: null,
  };

  // 自动滚动至尾部
  useEffect(() => {
    if (status === 'completed' && bottomRef.current && containerRef.current) {
      const container = containerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [status]);

  // 更新个股分析状态回调
  useEffect(() => {
  if (status !== 'idle' && stock && onAnalysisState) {
    onAnalysisState(status, stock);
  }
}, [status, stock, onAnalysisState]);

  // 页面滚动监听
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            setActiveNode(entry.target.id);
          }
        });
      },
      { 
        root: containerRef.current,
        threshold: [0.5],
        rootMargin: '-20% 0px -20% 0px'
      }
    );

    NODE_CONFIG.forEach(({ id }) => {
      const element = nodeRefs.current[id];
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const parseStreamData = useCallback((jsonStr: string) => {
    try {
      const event: NodeEvent = JSON.parse(jsonStr);
      const { phase, content } = event.data;
      const { node, state } = event;

      if (!node || !phase) return;

      if (!bufferRef.current[node]) bufferRef.current[node] = {};
      const phaseKey = phaseKeyMap[phase];
      
      // 过滤无意义返回
      const isMeaningfulContent =
        content !== undefined &&
        (content.length > 1 || content === "\n");
      
      if (isMeaningfulContent && phaseKey) {
        const current = bufferRef.current[node][phaseKey] || "";
        bufferRef.current[node][phaseKey] = current + content;  // 返回的增量内容拼接到对应的节点、阶段
      }
      // 更新节点状态和阶段
      bufferRef.current[node].phase = phase;
      bufferRef.current[node].state =
        state === "done" ? "done" : state === "error" ? "error" : "in_progress";

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          const snapshot = { ...bufferRef.current };
          bufferRef.current = {};

          setNodes(prev => {
            const updated = { ...prev };
            for (const key in snapshot) {
              const patch = snapshot[key] || {};
              updated[key] = {
                thinking: patch.thinking ?? prev[key].thinking,
                output: patch.output ?? prev[key].output,
                phase: patch.phase ?? prev[key].phase,
                state: patch.state ?? prev[key].state,
              };
            }
            return updated;
          });

          rafRef.current = null;
        });
      }
    } catch (err) {
      console.warn("SSE JSON 解析失败:", jsonStr, err);
    }
  }, []);

  const startAnalysis = useCallback(() => {
    if (!stock) return;
    
    setStatus('analyzing');
    setNodes(NODE_CONFIG.reduce((acc, n) => {
      acc[n.id] = { thinking: "", output: "", phase: null, state: "idle" };
      return acc;
    }, {} as Record<string, NodeState>));
    
    // 调用真实的流式接口
    const eventSource = FundamentalAgentAPI.streamAnalysis(
      `请分析${stock.name}(${stock.symbol})的基本面情况`,
      stock.symbol,
      report_date
    );
    
    eventSourceRef.current = eventSource;

    // 监听消息事件
    eventSource.onmessage = (event) => {
      parseStreamData(event.data);
    };

    // 监听错误事件
    eventSource.onerror = (error) => {
      console.error('SSE 连接错误:', error);
      setStatus('error');
      eventSource.close();
    };

    // 监听自定义事件（如果后端发送了自定义事件类型）
    eventSource.addEventListener('done', () => {
      setStatus('completed');
      eventSource.close();
    });

    eventSource.addEventListener('error', (event: any) => {
      console.error('分析错误:', event.data);
      setStatus('error');
      eventSource.close();
    });

  }, [stock, report_date, parseStreamData]);

  useEffect(() => {
    if (triggerKey > 0) {
      startAnalysis();
    }
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [triggerKey, startAnalysis]);

  const scrollToNode = (nodeId: string) => {
    const element = nodeRefs.current[nodeId];
    const container = containerRef.current;
    
    if (element && container) {
      const elementTop = element.offsetTop;
      const offset = 20; // 顶部偏移量
      
      container.scrollTo({
        top: elementTop - offset,
        behavior: 'smooth'
      });
    }
  };

  const getStateIcon = (state: NodeState['state']) => {
    switch (state) {
      case 'done':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'in_progress':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const getStatusTag = () => {
    switch (status) {
      case 'analyzing':
        return <Tag icon={<LoadingOutlined />} color="processing">分析中...</Tag>;
      case 'completed':
        return <Tag icon={<CheckCircleOutlined />} color="success">分析完成</Tag>;
      default:
        return <Tag icon={<ClockCircleOutlined />} color="default">待分析</Tag>;
    }
  };

  if (!stock) return null;

  return (
    <div className="mt-4">
      <Card
        title={
          <Space>
            <BulbOutlined style={{ fontSize: '20px' }} />
            <span>AI 基本面深度研究</span>
          </Space>
        }
        extra={getStatusTag()}
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
      >
        {/* Anchor Navigation Buttons */}
        <div style={{ 
          marginBottom: '16px', 
          padding: '12px',
          backgroundColor: '#fafafa',
          borderRadius: '8px',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {NODE_CONFIG.map(({ id, label, icon }) => (
            <Button
              key={id}
              type={activeNode === id ? 'primary' : 'default'}
              size="small"
              icon={icon}
              onClick={() => scrollToNode(id)}
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {label}
              <span style={{ marginLeft: '4px' }}>
                {getStateIcon(nodes[id]?.state)}
              </span>
            </Button>
          ))}
        </div>

        {/* Content Area */}
        <div 
          ref={containerRef}
          style={{ 
            maxHeight: '70vh', 
            overflowY: 'auto',
            paddingRight: '8px'
          }}
        >
          <Space size="large" style={{ width: '100%' }}>
            {NODE_CONFIG.map(({ id, label, color, icon }) => {
              const node = nodes[id];
              const hasThinking = node?.thinking && node.thinking.length > 0;
              const hasOutput = node?.output && node.output.length > 0;
              
              return (
                <div 
                  key={id} 
                  id={id}
                  ref={(el) => { nodeRefs.current[id] = el; }}
                >
                  <Card
                    size="small"
                    title={
                      <Space>
                        {icon}
                        <Text strong>{label}</Text>
                        {getStateIcon(node?.state)}
                      </Space>
                    }
                    
                    style={{ 
                      borderLeft: `4px solid var(--ant-${color}-6)`,
                      backgroundColor: `var(--ant-${color}-1)`
                    }}
                  >
                    {/* Thinking Section (Collapsible) */}
                    {hasThinking && (
                      <Collapse 
                        ghost 
                        size="small"
                        style={{ marginBottom: '16px' }}
                        items={[
                          {
                            key: '1',
                            label: <Text type="secondary">💭 思考过程</Text>,
                            children: (
                              <Card 
                                size="small" 
                                style={{ 
                                  backgroundColor: '#f0f0f0',
                                  fontStyle: 'italic'
                                }}
                              >
                                <ReactMarkdown>{node.thinking}</ReactMarkdown>
                              </Card>
                            )
                          }
                        ]}
                      />
                    )}

                    {/* Output Section */}
                    <div style={{ minHeight: '100px' }}>
                      {hasOutput ? (
                        <div style={{ 
                          backgroundColor: 'white',
                          padding: '16px',
                          borderRadius: '8px'
                        }}>
                          <ReactMarkdown>{node.output}</ReactMarkdown>
                        </div>
                      ) : node?.state === 'in_progress' ? (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          minHeight: '100px'
                        }}>
                          <Space>
                            <Spin />
                            <Text type="secondary">正在生成内容...</Text>
                          </Space>
                        </div>
                      ) : (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          minHeight: '100px'
                        }}>
                          <Text type="secondary">等待分析...</Text>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              );
            })}
            
            <div ref={bottomRef} />
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default AIAnalysisSection;
