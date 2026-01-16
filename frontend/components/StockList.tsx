
import { type ReactElement } from 'react';
import type { Stock } from '../src/types';
import { 
  OpenAIOutlined,      // idle - 默认AI图标
  LoadingOutlined,    // analyzing - 加载中
  CheckCircleOutlined, // completed - 完成
  CloseCircleOutlined  // error - 错误
} from '@ant-design/icons';


interface StockListProps {
  stocks: Stock[];
  selectedSymbol: string;
  onSelectStock: (stock: Stock) => void;
  onAIResearch: (stock: Stock) => void;
  analysisStatus: Record<string, 'idle' | 'analyzing' | 'completed' | 'error'>;  // 股票分析状态
}

const StockList = ({ stocks, selectedSymbol, onSelectStock, onAIResearch, analysisStatus }: StockListProps): ReactElement => {
  // 根据状态获取图标和样式
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
    
  return (
    <div className="w-80 border-r bg-white h-full flex flex-col overflow-hidden">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b text-gray-400 uppercase tracking-wider font-semibold">
            <th className="px-4 py-3">股票</th>
            <th className="px-2 py-3">总市值(亿)</th>
            {/* <th className="px-2 py-3">近20天涨跌幅</th> */}
            <th className="px-2 py-3">AI基本面</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 overflow-y-auto">
          {stocks.map((stock, index) => {
            const iconConfig = getIconByStatus(stock);
            
            return (
              <tr 
                key={index}
                onClick={() => onSelectStock(stock)}
                className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedSymbol === stock.code ? 'bg-indigo-50' : ''
                }`}
              >
                <td className="px-4 py-4">
                  <div className="font-semibold text-gray-900">{stock.shortName}</div>
                  <div className="text-gray-400 text-xxs">{stock.code}</div>
                </td>
                <td className="px-2 py-4 text-gray-600 font-medium">
                  {stock.totalMv.toFixed(2)}
                </td>
                {/* <td className={`px-2 py-4 font-bold ${
                  stock.change20d >= 0 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {stock.change20d >= 0 ? '+' : ''}{stock.change20d.toFixed(2)}%
                </td> */}
                <td className="px-2 py-4">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();  // 阻止行点击事件冒泡
                      onAIResearch(stock);
                    }}
                    className={iconConfig.className}
                    title={iconConfig.title}
                    disabled={analysisStatus[stock.code] === 'analyzing'}
                  >
                    {iconConfig.icon}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default StockList;
