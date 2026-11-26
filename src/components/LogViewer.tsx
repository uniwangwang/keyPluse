import React, { useMemo, useState } from 'react';
import { Download, Search, Terminal, Trash2 } from 'lucide-react';
import { LogEntry, LogLevel } from '../types/automation';

interface LogViewerProps {
  logs: LogEntry[];
  compact?: boolean;
  onClearLogs: () => void;
  onExportLogs: () => void;
  onOpenFullLogs?: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  compact = false,
  onClearLogs,
  onExportLogs,
  onOpenFullLogs,
}) => {
  const [levelFilter, setLevelFilter] = useState<'all' | LogLevel>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter((entry) => {
      if (levelFilter !== 'all' && entry.level !== levelFilter) return false;
      if (
        q &&
        !entry.message.toLowerCase().includes(q) &&
        !entry.source.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [logs, levelFilter, searchQuery]);

  const displayedLogs = compact ? filteredLogs.slice(0, 12) : filteredLogs;

  const levelStyles: Record<LogLevel, { label: string; cls: string }> = {
    info: { label: '信息', cls: 'text-slate-600' },
    key: { label: '按键', cls: 'text-emerald-700 font-semibold' },
    hotkey: { label: '热键', cls: 'text-blue-700 font-semibold' },
    warn: { label: '警告', cls: 'text-amber-700 font-semibold' },
    error: { label: '错误', cls: 'text-red-700 font-semibold' },
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-600" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900">
            操作历史与调试日志
          </h2>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            共 {logs.length} 条
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 过滤级别 */}
          <div className="inline-flex p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: '全部' },
                { id: 'key', label: '按键' },
                { id: 'hotkey', label: '热键' },
                { id: 'info', label: '系统' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setLevelFilter(tab.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  levelFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {!compact && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="检索日志关键词..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          )}

          <button
            type="button"
            onClick={onExportLogs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>导出日志</span>
          </button>

          <button
            type="button"
            onClick={onClearLogs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:text-red-600 hover:border-red-200 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>清空</span>
          </button>

          {compact && onOpenFullLogs && (
            <button
              type="button"
              onClick={onOpenFullLogs}
              className="px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              查看全部
            </button>
          )}
        </div>
      </div>

      {/* 日志表格 */}
      <div className={`mt-4 border border-slate-200 rounded-lg overflow-hidden ${compact ? 'max-h-72 overflow-y-auto' : 'max-h-[560px] overflow-y-auto'}`}>
        {displayedLogs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            暂无符合条件的执行日志，点击「启动」或「单步」即可记录实时操作轨迹。
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
              <tr>
                <th className="py-2 px-4 w-32">时间戳</th>
                <th className="py-2 px-3 w-20">类型</th>
                <th className="py-2 px-3 w-28">模块</th>
                <th className="py-2 px-4">操作日志内容</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-mono">
              {displayedLogs.map((entry) => {
                const meta = levelStyles[entry.level];
                return (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="py-2 px-4 tabular-nums text-slate-400 whitespace-nowrap">
                      {entry.timestamp}
                    </td>
                    <td className={`py-2 px-3 whitespace-nowrap ${meta.cls}`}>
                      {meta.label}
                    </td>
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                      {entry.source}
                    </td>
                    <td className="py-2 px-4 text-slate-800 font-sans">
                      {entry.message}
                      {entry.detail && (
                        <span className="ml-2 font-mono text-slate-400">{entry.detail}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
