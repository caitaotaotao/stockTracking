
import React from 'react';
import { Stock } from '../src/types';

interface StockListProps {
  stocks: Stock[];
  selectedSymbol: string;
  onSelectStock: (stock: Stock) => void;
  onAIResearch: (stock: Stock) => void;
}

const StockList: React.FC<StockListProps> = ({ stocks, selectedSymbol, onSelectStock, onAIResearch }) => {
  return (
    <div className="w-80 border-r bg-white h-full flex flex-col overflow-hidden">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b text-gray-400 uppercase tracking-wider font-semibold">
            <th className="px-4 py-3">股票</th>
            <th className="px-2 py-3">总市值(亿)</th>
            <th className="px-2 py-3">近20天涨跌幅</th>
            <th className="px-2 py-3">AI</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 overflow-y-auto">
          {stocks.map((stock) => (
            <tr 
              key={stock.symbol}
              onClick={() => onSelectStock(stock)}
              className={`cursor-pointer transition-colors hover:bg-gray-50 ${selectedSymbol === stock.symbol ? 'bg-indigo-50' : ''}`}
            >
              <td className="px-4 py-4">
                <div className="font-semibold text-gray-900">{stock.name}</div>
                <div className="text-gray-400">{stock.symbol}</div>
              </td>
              <td className="px-2 py-4 text-gray-600 font-medium">{stock.marketCap.toFixed(2)}</td>
              <td className={`px-2 py-4 font-bold ${stock.change20d >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {stock.change20d >= 0 ? '+' : ''}{stock.change20d.toFixed(2)}%
              </td>
              <td className="px-2 py-4">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onAIResearch(stock);
                  }}
                  className="p-1 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
                  title="AI基本面研究"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,12,20ZM12,6a1,1,0,0,0-1,1V11H7a1,1,0,0,0,0,2h4v4a1,1,0,0,0,2,0V13h4a1,1,0,0,0,0-2H13V7A1,1,0,0,0,12,6Z"/>
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StockList;
