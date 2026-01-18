import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { type ReactElement, useMemo, useEffect, useRef, useState, useCallback } from 'react';
import type { Stock } from '../src/types';

interface StockListProps {
  stocks: Stock[];
  selectedSymbol: string;
  onSelectStock: (stock: Stock) => void;
}

const StockList = ({ 
  stocks, 
  selectedSymbol, 
  onSelectStock, 
}: StockListProps): ReactElement => {
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState<number>(500);
  
  const dataSourceWithId = useMemo(() => {
    return stocks.map((stock, index) => ({
      ...stock,
      uniqueId: `${stock.code}_${index}`
    }));
  }, [stocks]);
  
  // 加载时根据视窗渲染滚动高度
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.clientHeight - 55;
        if (height > 0) {
          setScrollY(height);
        }
      }
    };
    updateHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const timer = setTimeout(updateHeight, 100);
    window.addEventListener('resize', updateHeight);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);
  
  // 股票列表变化时，计算滚动高度
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.clientHeight - 55;
        if (height > 0) {
          setScrollY(height);
        }
      }
    };
    
    const timer = setTimeout(updateHeight, 100);
    return () => clearTimeout(timer);
  }, [stocks.length]);
  
  // 使用 useMemo 缓存 columns
  const columns: ColumnsType<Stock & { uniqueId: string }> = useMemo(() => [
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
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          console.error(`Invalid timestamp value: ${value}`);
          return <span className="text-gray-600 font-medium whitespace-nowrap">-</span>;
        }
        
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
  ], []);

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
