
import { type ReactElement } from 'react';
import type { Stock } from '../src/types';

interface StockListProps {
  stocks: Stock[];
  selectedSymbol: string;
  onSelectStock: (stock: Stock) => void;
  onAIResearch: (stock: Stock) => void;
}

const StockList = ({ stocks, selectedSymbol, onSelectStock, onAIResearch }: StockListProps): ReactElement => {
  return (
    <div className="w-80 border-r bg-white h-full flex flex-col overflow-hidden">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b text-gray-400 uppercase tracking-wider font-semibold">
            <th className="px-4 py-3">股票</th>
            <th className="px-2 py-3">总市值(亿)</th>
            <th className="px-2 py-3">近20天涨跌幅</th>
            <th className="px-2 py-3">AI基本面</th>
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
                <div className="text-gray-400 text-xxs">{stock.symbol}</div>
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
                  {/* <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,12,20ZM12,6a1,1,0,0,0-1,1V11H7a1,1,0,0,0,0,2h4v4a1,1,0,0,0,2,0V13h4a1,1,0,0,0,0-2H13V7A1,1,0,0,0,12,6Z"/>
                  </svg> */}
                  <svg className="w-5 h-5" viewBox="0 0 1024 1024" fill="currentColor" version="1.1" xmlns="http://www.w3.org/2000/svg">
                    <path d="M553.728 204.416c67.136 39.04 135.744 78.208 202.88 115.84 29.888 16.512 44.8 39.04 43.264 75.2-1.472 37.568 0 76.672 0 115.84v120.32c0 31.552-11.904 52.608-40.256 69.12a9303.872 9303.872 0 0 0-207.36 118.848c-26.88 16.576-53.76 16.576-80.64 0l-205.824-117.312c-26.88-15.04-41.792-37.632-41.792-69.184a6470.4 6470.4 0 0 0 0-240.64c0-33.088 11.904-55.68 41.792-70.72L471.68 204.416c28.352-16.576 53.696-16.576 82.048 0zM486.016 341.888H407.168L290.688 652.8h60.48l29.568-82.432h129.92l28.672 82.432H601.6L486.016 341.888z m213.248 0h-58.688V652.8h58.688V341.888z m-250.432 52.416l44.352 126.784H398.208l45.248-126.784h5.376z"></path>
                    <path d="M917.696 663.04c0 13.44 1.472 26.88 0 40.32-4.48 29.888-20.928 52.288-47.808 67.2-101.568 58.304-203.136 116.608-306.24 174.848-34.368 19.456-68.736 19.456-103.04 0-98.56-56.768-195.712-113.536-294.272-168.832-38.848-22.4-59.776-52.288-56.768-97.152 1.472-19.392 0-38.848 0-58.24 0-10.496-1.536-14.976-11.968-20.928-31.36-17.92-41.856-53.76-26.88-85.12 14.912-29.952 49.28-44.864 82.176-34.432 23.872 8.96 40.32 25.408 44.8 50.816 4.48 26.88-4.48 50.816-28.416 65.728a24.768 24.768 0 0 0-11.904 22.4v67.264c0 19.456 7.424 32.896 25.344 43.328 103.04 58.24 206.144 116.544 307.712 174.848 19.456 10.432 35.84 7.488 53.76-3.008 86.656-49.28 173.312-98.56 261.44-149.44 14.976-8.96 29.888-16.384 44.8-25.344 13.44-8.96 20.928-20.928 20.928-37.376v-55.296c0-4.48 0-8.96 1.536-13.44 2.944-11.968 10.432-20.928 23.872-19.456 13.44 0 19.392 10.496 20.928 20.928 1.472 13.44 0 26.88 0 40.32z m1.472-301.888v14.976c-1.472 19.392 1.472 34.368 19.392 46.336 23.936 14.912 26.88 50.752 13.44 77.696-13.44 25.408-44.8 40.32-73.152 34.368-28.416-6.016-50.816-31.36-52.288-58.24-1.472-28.416 8.96-49.344 32.832-64.32 7.488-4.48 10.496-7.488 10.496-16.448v-56.768c0-19.392-7.488-34.368-25.408-44.8-101.568-56.768-203.136-116.544-304.704-174.848-17.92-10.432-34.368-10.432-50.816 0-101.568 58.24-203.136 115.072-304.704 173.312-19.456 10.496-28.416 25.408-26.88 47.872 1.472 16.384 0 31.36 0 47.808 0 17.92-10.496 28.352-25.408 28.352-14.976 0-22.4-10.432-22.4-28.352v-49.28c-1.536-40.384 17.92-68.8 52.288-88.192 88.128-49.28 174.72-100.16 262.848-149.44 14.976-7.488 28.416-16.448 43.328-23.936 32.896-17.92 64.256-17.92 97.088 1.536 101.632 58.24 203.2 115.008 304.768 173.312 25.408 14.912 44.8 35.84 49.28 64.256 1.472 13.44-1.472 29.888 0 44.8z"></path>
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
