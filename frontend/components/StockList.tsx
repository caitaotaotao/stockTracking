import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { type ReactElement, useMemo, useEffect, useRef, useState } from 'react';
import type { Stock } from '../src/types';
import { 
  OpenAIOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';

interface StockListProps {
  stocks: Stock[];
  selectedSymbol: string;
  onSelectStock: (stock: Stock) => void;
  onAIResearch: (stock: Stock) => void;
  analysisStatus: Record<string, 'idle' | 'analyzing' | 'completed' | 'error'>;
}

const StockList = ({ 
  stocks, 
  selectedSymbol, 
  onSelectStock, 
  onAIResearch, 
  analysisStatus 
}: StockListProps): ReactElement => {
  
  // 自适应滚动高度
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState<number>(500);
  
  // 为每条数据添加唯一 ID
  const dataSourceWithId = useMemo(() => {
    return stocks.map((stock, index) => ({
      ...stock,
      uniqueId: `${stock.code}_${index}`
    }));
  }, [stocks]);
  
  // 高度计算逻辑
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.clientHeight - 55;
        if (height > 0) {
          setScrollY(height);
        }
      }
    };

    // 立即执行
    updateHeight();

    // 使用 ResizeObserver 监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // 额外的延迟执行，确保初始化时能获取到高度
    const timer = setTimeout(updateHeight, 100);

    // 监听窗口大小变化
    window.addEventListener('resize', updateHeight);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []); // 移除 stocks 依赖
  
  // 当 stocks 变化时重新计算高度
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.clientHeight - 55;
        if (height > 0) {
          setScrollY(height);
        }
      }
    };
    
    // 延迟执行，等待 Table 渲染完成
    const timer = setTimeout(updateHeight, 100);
    return () => clearTimeout(timer);
  }, [stocks.length]); // 只依赖 stocks 的长度，而不是整个数组
  
  const getIconByStatus = (stock: Stock) => {
    const status = analysisStatus[stock.code] || 'idle';
    
    switch (status) {
      case 'analyzing':
        return {
          icon: <LoadingOutlined className="w-5 h-5" spin />,
          className: "p-1 rounded-full bg-blue-100 text-blue-600",
          title: "分析中..."
        };
      case 'completed':
        return {
          icon: <CheckCircleOutlined className="w-5 h-5" />,
          className: "p-1 rounded-full bg-green-100 text-green-600",
          title: "分析完成"
        };
      case 'error':
        return {
          icon: <CloseCircleOutlined className="w-5 h-5" />,
          className: "p-1 rounded-full bg-red-100 text-red-600",
          title: "分析失败，点击重试"
        };
      case 'idle':
      default:
        return {
          icon: <OpenAIOutlined className="w-5 h-5" />,
          className: "p-1 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors",
          title: "AI基本面研究"
        };
    }
  };

  const columns: ColumnsType<Stock & { uniqueId: string }> = [
    {
      title: '股票',
      dataIndex: 'shortName',
      key: 'shortName',
      render: (text: string, record) => (
        <div>
          <div className="font-semibold text-gray-900 whitespace-nowrap">{text}</div>
          <div className="text-gray-400 text-xs whitespace-nowrap">{record.code}</div>
        </div>
      ),
    },
    {
      title: '总市值(Bn)',
      dataIndex: 'totalMv',
      key: 'totalMv',
      align: 'right',
      render: (value: number) => (
        <span className="text-gray-600 font-medium whitespace-nowrap">
          {value.toFixed(2)}
        </span>
      ),
    },
    {
      title: '20日%',
      dataIndex: 'change20d',
      key: 'change20d',
      align: 'right',
      render: (value: number) => (
        <span className="text-gray-600 font-medium whitespace-nowrap">
          {value.toFixed(2)}
        </span>
      ),
    },
    {
      title: '信号日',
      dataIndex: 'tradeDate',
      key: 'tradeDate',
      align: 'right',
      render: (value: number) => {
        // 直接从字符串中提取月份和日期，避免时区问题
        const date = new Date(value);
        // 检查日期是否有效
        if (isNaN(date.getTime())) {
          console.error(`Invalid timestamp value: ${value}`);
          return <span className="text-gray-600 font-medium whitespace-nowrap">-</span>;
        }
        
        // 获取月份和日期并格式化为 MM-DD
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const formattedDate = `${month}-${day}`;
        return (
          <span className="text-gray-600 font-medium whitespace-nowrap">
            {formattedDate}
          </span>
        );
      },
    },
    {
      title: 'AI基本面',
      key: 'action',
      width: 90,
      align: 'center',
      render: (_: any, record) => {
        const iconConfig = getIconByStatus(record);
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAIResearch(record);
            }}
            className={iconConfig.className}
            title={iconConfig.title}
            disabled={analysisStatus[record.code] === 'analyzing'}
          >
            {iconConfig.icon}
          </button>
        );
      },
    },
  ];

  return (
    <div 
      ref={containerRef}
      className="flex-shrink-0 border-r bg-white h-full"
    >
      <Table
        columns={columns}
        dataSource={dataSourceWithId}
        rowKey="uniqueId"
        pagination={false}
        scroll={{ 
          y: scrollY,
          x: 'max-content'
        }}
        size="small"
        sticky
        rowClassName={(record) =>
          selectedSymbol === record.code ? 'bg-indigo-50' : ''
        }
        onRow={(record) => ({
          onClick: () => onSelectStock(record),
          className: 'cursor-pointer hover:bg-gray-50 transition-colors'
        })}
      />
    </div>
  );
};

export default StockList;
