import React from 'react';
import { Download } from 'lucide-react';

export type NavTab = 'workspace' | 'sequence' | 'export' | 'logs';

interface TopBarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onQuickExportGui: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onQuickExportGui,
}) => {
  const navItems: { id: NavTab; label: string }[] = [
    { id: 'workspace', label: '自动化工作台' },
    { id: 'sequence', label: '序列编排' },
    { id: 'export', label: 'Python 脚本导出' },
    { id: 'logs', label: '操作日志' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('workspace')}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
        >
          KeyPulse 键盘自动化
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="主导航">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onQuickExportGui}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:scale-[0.99] transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>导出 Python GUI</span>
          </button>
        </div>
      </div>

      {/* Mobile compact nav */}
      <div className="md:hidden flex items-center gap-4 px-4 py-2 border-t border-slate-100 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`text-xs font-medium py-1 whitespace-nowrap shrink-0 ${
                isActive ? 'text-blue-600 font-semibold' : 'text-slate-600'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
