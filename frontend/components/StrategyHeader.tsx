
import React from 'react';

interface StrategyHeaderProps {
  strategyName: string;
  onOpenMonitor: () => void;
}

const StrategyHeader: React.FC<StrategyHeaderProps> = ({ strategyName, onOpenMonitor }) => {
  return (
    <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-8">
        <h2 className="text-lg font-bold text-gray-800">{strategyName}</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">报告期:</span>
            <select className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>2025-09-30</option>
              <option>2025-06-30</option>
              <option>2024-12-31</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">总市值>=:</span>
            <input 
              type="number" 
              defaultValue={30} 
              className="w-16 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>
      
      <button 
        onClick={onOpenMonitor}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
      >
        策略收益监控
      </button>
    </div>
  );
};

export default StrategyHeader;
