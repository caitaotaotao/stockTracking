import { useState, useEffect, type ReactElement } from 'react';
import { useFilter } from '../src/FilterContext';
import type { FilterOption } from '../src/FilterContext';
import { fetchStrategyFilters } from '../services/api';

type StrategyHeaderProps = {
  strategyName: string;
  strategyId: number;
  onOpenMonitor: () => void;
}

const StrategyHeader = ({ 
  strategyName, 
  strategyId, 
  onOpenMonitor
}: StrategyHeaderProps): ReactElement => {
  
  const { filterOptions, initializeFilters, setFilterOptions } = useFilter();
  const { filterValues, setFilterValue } = useFilter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
      const fetchFilterOptions = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
          const filters = await fetchStrategyFilters(strategyId);
          // 使用 initializeFilters 一次性设置选项和默认值
          initializeFilters(filters);
        } catch (error) {
          console.error('获取筛选项失败:', error);
          setError('加载筛选项失败');
          
          // 设置后备默认值
          const fallbackFilters: FilterOption[] = [
            {
              name: '报告期',
              value: '2025-09-30',
              type: 'select',
              options: [],
              defaultValue: '2025-09-30'
            },
            {
              name: 'date_period',
              value: 3,
              type: 'number',
              options: [],
              defaultValue: 3
            },
            {
              name: 'stage',
              value: 1,
              type: 'select',
              options: [],
              defaultValue: 1
            }
          ];
          initializeFilters(fallbackFilters);
        } finally {
          setIsLoading(false);
        }
      };

      fetchFilterOptions();
    }, [strategyId, initializeFilters]);
  
  const handleFilterChange = (name: string, value: any) => {
    setFilterValue(name, value);
  };

  const handleMultiSelectChange = (name: string, value: string | number, checked: boolean) => {
    const currentValues = Array.isArray(filterValues[name]) ? filterValues[name] : [];
    let newValues;
    if (checked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues.filter(v => v !== value);
    }
    setFilterValue(name, newValues);
  };
  
  const renderFilterOption = (option: FilterOption) => {
    switch (option.type) {
      case 'select':
        return (
          <select 
            className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={filterValues[option.name] || option.defaultValue || ''}
            onChange={(e) => handleFilterChange(option.name, e.target.value)}
          >
            {option.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      case 'multiSelect':
        return (
          <div className="flex flex-col bg-gray-50 border border-gray-200 rounded p-2 max-h-32 overflow-y-auto">
            {option.options?.map(opt => {
              const values = Array.isArray(filterValues[option.name]) ? filterValues[option.name] : [];
              const isChecked = values.includes(opt.value);
              return (
                <label key={opt.value} className="flex items-center space-x-2 text-sm py-1">
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={(e) => handleMultiSelectChange(option.name, opt.value, e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        );
      case 'number':
        return (
          <input 
            type="number" 
            value={filterValues[option.name] ?? option.defaultValue ?? ''}
            onChange={(e) => handleFilterChange(option.name, Number(e.target.value))}
            className="w-16 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        );
      case 'text':
        return (
          <input 
            type="text" 
            value={filterValues[option.name] ?? option.defaultValue ?? ''}
            onChange={(e) => handleFilterChange(option.name, e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-8">
        <h2 className="text-lg font-bold text-gray-800">{strategyName}</h2>
        <div className="flex items-center space-x-4">
          {filterOptions?.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">{option.name}:</span>
              {renderFilterOption(option)}
            </div>
          ))}
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