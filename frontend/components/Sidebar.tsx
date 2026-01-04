import { type ReactElement } from 'react';
import { Layout, Menu } from 'antd';
import type { Strategy } from '../src/types';

const { Sider } = Layout;

interface SidebarProps {
  strategies: Strategy[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const Sidebar = ({ strategies, selectedId, onSelect }: SidebarProps): ReactElement => {
  const menuItems = strategies.map((strategy) => ({
    key: strategy.id,
    label: strategy.name,
  }));

  const handleMenuClick = (e: { key: string }) => {
    onSelect(e.key);
  };

  return (
    <Sider
      width={250}
      className="bg-gray-50"
      collapsedWidth={0}
      style={{ background: '#fafafa' }}
    >
      <div className="py-5 border-b border-gray-200 bg-white">
        <h3 className="text-lg font-semibold text-gray-900">策略面板</h3>
      </div>
      <div className="px-4 py-2">
        <Menu
          mode="inline"
          selectedKeys={[selectedId]}
          items={menuItems}
          onClick={handleMenuClick}
          className="border-0 bg-transparent"
          style={{ background: 'transparent' }}
        />
      </div>
    </Sider>
  );
};

export default Sidebar;
