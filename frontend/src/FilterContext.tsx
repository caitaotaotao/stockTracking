import { createContext, useContext, useState, type ReactNode } from 'react';

interface FilterContextType {
  filterValues: Record<string, any>;
  setFilterValue: (name: string, value: any) => void;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});

  const setFilterValue = (name: string, value: any) => {
    setFilterValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFilters = () => {
    setFilterValues({});
  };

  return (
    <FilterContext.Provider value={{ filterValues, setFilterValue, resetFilters }}>
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