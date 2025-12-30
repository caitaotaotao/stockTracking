import { useState, useEffect, type ReactElement } from 'react';

type FilterOption={
  name: string;
  value: string | number;
  type: 'select' | 'multiSelect' | 'number' | 'text';  // 定义筛选项类型
  options?: Array<{label: string, value: string | number}>;
  defaultValue?: string | number;
}

type StrategyHeaderProps={
  strategyName: string;
  strategyId: string | number;
  onOpenMonitor: () => void;
}

const StrategyHeader = ({ 
  strategyName, 
  strategyId, 
  onOpenMonitor
}: StrategyHeaderProps): ReactElement => {
  
  const [filterOptions, setFilterOptions] = useState<FilterOption[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  
  useEffect(() => {
    // 从后端获取筛选项
    const fetchFilterOptions = async () => {
      try {
        const response = await fetch(`/api/strategies/${strategyId}/filters`);
        const data = await response.json();
        setFilterOptions(data.filters || []);
        
        // 遍历配置筛选初始值
        const initialValues: Record<string, any> = {};
        data.filters.forEach((filter: FilterOption) => {
          initialValues[filter.name] = filter.defaultValue;
        });
        setFilterValues(initialValues);
      } catch (error) {
        console.error('获取筛选项失败:', error);
      }
    };
    
    if (strategyId) {
      fetchFilterOptions();
    }
  }, [strategyId]);
  
  const handleFilterChange = (name: string, value: any) => {
    setFilterValues(prev => ({
      ...prev,
      [name]: value
    }));
  };  // 筛选项更新函数

  const handleMultiSelectChange = (name: string, value: string | number, checked: boolean) => {
    setFilterValues(prev => {
      const currentValues = Array.isArray(prev[name]) ? prev[name] : [];
      // 如果选中，添加到数组；如果取消选中，从数组中移除
      let newValues;
      if (checked) {
        newValues = [...currentValues, value];
      } else {
        newValues = currentValues.filter(v => v !== value);
      }
      return {
        ...prev,
        [name]: newValues
      };
    });
  };
  
  const renderFilterOption = (option: FilterOption) => {
    switch (option.type) {
      case 'select':
        return (
          <select 
            className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={filterValues[option.name] || ''}
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
              // 检查当前选项是否被选中
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
            value={filterValues[option.name] || ''}
            onChange={(e) => handleFilterChange(option.name, e.target.value)}
            className="w-16 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        );
      case 'text':
        return (
          <input 
            type="text" 
            value={filterValues[option.name] || ''}
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
          {filterOptions.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">{option.name}:</span>
              {renderFilterOption(option)}
            </div>
          ))}
          
          {/* 如果后端还没返回数据，显示占位筛选项 */}
          {filterOptions.length === 0 && (
            <>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">报告期:</span>
                <select className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option>2025-09-30</option>
                  <option>2025-06-30</option>
                  <option>2024-12-31</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">总市值{'>='}</span>
                <input 
                  type="number" 
                  defaultValue={30} 
                  className="w-16 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}
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