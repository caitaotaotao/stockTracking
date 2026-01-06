import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// 导入或定义 FilterOption 类型
export interface FilterSelectOption {
  label: string;
  value: string | number;
}

export interface FilterOption {
  name: string;
  value: string | number;
  type: 'select' | 'number' | 'text' | 'date' | 'multiSelect'; 
  options: FilterSelectOption[];
  defaultValue: string | number;
}

interface FilterContextType {
  filterValues: Record<string, any>;
  filterOptions: FilterOption[];
  setFilterValue: (name: string, value: any) => void;
  setFilterOptions: (options: FilterOption[]) => void;
  initializeFilters: (options: FilterOption[]) => void;
  resetFilters: () => void;
  getFilterValue: (name: string) => any;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [filterOptions, setFilterOptions] = useState<FilterOption[]>([]);

  const setFilterValue = useCallback((name: string, value: any) => {
    setFilterValues(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // 初始化筛选项并设置默认值
  const initializeFilters = useCallback((options: FilterOption[]) => {
    setFilterOptions(options);
    
    const defaultValues: Record<string, any> = {};
    options.forEach(option => {
      if (option.defaultValue !== undefined) {
        defaultValues[option.name] = option.defaultValue;
      }
    });
    
    setFilterValues(defaultValues);
  }, []);

  // 重置为默认值
  const resetFilters = useCallback(() => {
    const defaultValues: Record<string, any> = {};
    filterOptions.forEach(option => {
      if (option.defaultValue !== undefined) {
        defaultValues[option.name] = option.defaultValue;
      }
    });
    setFilterValues(defaultValues);
  }, [filterOptions]);

  // 获取单个筛选值
  const getFilterValue = useCallback((name: string) => {
    return filterValues[name];
  }, [filterValues]);

  return (
    <FilterContext.Provider 
      value={{ 
        filterValues, 
        filterOptions,
        setFilterValue, 
        setFilterOptions,
        initializeFilters,
        resetFilters,
        getFilterValue
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
};
