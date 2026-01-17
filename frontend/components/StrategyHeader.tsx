import { type ReactElement } from 'react';
import type { FilterOption } from '../src/types';
import { Space, Typography } from 'antd';


type StrategyHeaderProps = {
  strategyName: string;
  filterValues: Record<string, any>;
  handleFilterChange: (name: string, value: any) => void;
  filterOptions: FilterOption[];
  onOpenMonitor: () => void;
}

const StrategyHeader = ({ 
  strategyName, 
  filterValues,
  handleFilterChange, 
  filterOptions = [],
  onOpenMonitor,
}: StrategyHeaderProps): ReactElement => {
  const handleMultiSelectChange = (filterCode: string, label: string, value: string | number, checked: boolean) => {
    const currentValues = Array.isArray(filterValues[label]) ? filterValues[label] : [];
    let newValues;
    if (checked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues.filter((v: any) => v !== value);
    }
    handleFilterChange(filterCode, newValues);
  };
  
  const renderFilterOption = (option: FilterOption) => {
    switch (option.type) {
      case 'select':
        return (
          <select 
            className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={option.defaultValue || ''}
            onChange={(e) => handleFilterChange(option.filterCode, e.target.value)}
          >
            {option.options?.map(opt => (
              <option key={opt.label} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      case 'multiSelect':
        return (
          <div className="flex flex-col bg-gray-50 border border-gray-200 rounded p-2 max-h-32 overflow-y-auto">
            {option.options?.map(opt => {
              const values = Array.isArray(filterValues[option.defaultValue]) ? filterValues[option.defaultValue] : [];
              const isChecked = values.includes(opt.value);
              return (
                <label key={opt.value} className="flex items-center space-x-2 text-sm py-1">
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={(e) => handleMultiSelectChange(option.filterCode, option.name, opt.value, e.target.checked)}
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
            value={option.defaultValue ?? ''}
            onChange={(e) => handleFilterChange(option.filterCode, Number(e.target.value))}
            className="w-16 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        );
    }
  };
  const { Title } = Typography;

  return (
    <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
      <Space size={32} align="baseline">
        <Space size={16} align="baseline">
          <Title level={3}>{strategyName}</Title>
          {filterOptions.map((option, index) => (
            <Space key={index} size={8} align="baseline">
              <span className="text-sm text-gray-500">{option.name}:</span>
              {renderFilterOption(option)}
            </Space>
          ))}
        </Space>
      </Space>

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