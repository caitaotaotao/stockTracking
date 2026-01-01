
import { type ReactElement } from 'react';
import type { Strategy } from '../src/types';

interface SidebarProps {
  strategies: Strategy[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const Sidebar = ({ strategies, selectedId, onSelect }: SidebarProps): ReactElement => {
  return (
    <div className="w-64 border-r bg-white h-screen flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-gray-800">策略面板</h1>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        {strategies.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`px-6 py-4 cursor-pointer transition-colors flex items-center justify-between ${
              selectedId === s.id
                ? 'bg-indigo-50 text-indigo-700 border-r-4 border-indigo-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="font-medium">{s.name}</span>
            {selectedId === s.id && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
