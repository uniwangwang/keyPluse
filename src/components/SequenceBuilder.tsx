import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { COMMON_KEYS, normalizeCustomKey } from '../data/presets';
import { AutomationConfig, KeyStep } from '../types/automation';

interface SequenceBuilderProps {
  config: AutomationConfig;
  onChangeConfig: (updater: (prev: AutomationConfig) => AutomationConfig) => void;
  onAddLog: (level: 'info' | 'key' | 'hotkey' | 'warn', source: string, message: string) => void;
}

export const SequenceBuilder: React.FC<SequenceBuilderProps> = ({
  config,
  onChangeConfig,
  onAddLog,
}) => {
  const [newKeyInput, setNewKeyInput] = useState('right');
  const [newRepeat, setNewRepeat] = useState(1);
  const [newDelayMs, setNewDelayMs] = useState(1000);

  const addStep = (keyExpr: string) => {
    const cleaned = keyExpr.trim();
    if (!cleaned) return;
    const norm = normalizeCustomKey(cleaned);
    const step: KeyStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      keyLabel: norm.label,
      pythonKey: norm.pythonKey,
      browserKey: norm.browserKey,
      repeat: Math.max(1, newRepeat),
      delayAfterMs: Math.max(50, newDelayMs),
    };
    onChangeConfig((prev) => ({
      ...prev,
      mode: 'sequence',
      sequence: [...prev.sequence, step],
    }));
    onAddLog('info', '序列编排', `新增步骤: [${norm.pythonKey}] x${step.repeat}，延迟 ${step.delayAfterMs}ms`);
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= config.sequence.length) return;
    onChangeConfig((prev) => {
      const next = [...prev.sequence];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return { ...prev, sequence: next };
    });
  };

  const updateStep = (id: string, patch: Partial<KeyStep>) => {
    onChangeConfig((prev) => ({
      ...prev,
      sequence: prev.sequence.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const removeStep = (id: string) => {
    onChangeConfig((prev) => ({
      ...prev,
      sequence: prev.sequence.filter((s) => s.id !== id),
    }));
    onAddLog('info', '序列编排', '已移除序列步骤');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">自定义按键流程编排</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              按顺序组合多个按键与步骤等待时间，用于复杂自动化操作并同步导出到 Python 脚本。
            </p>
          </div>
          <div className="inline-flex p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => onChangeConfig((p) => ({ ...p, mode: 'single' }))}
              className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                config.mode === 'single' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              单键模式
            </button>
            <button
              type="button"
              onClick={() => onChangeConfig((p) => ({ ...p, mode: 'sequence' }))}
              className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                config.mode === 'sequence' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              多键序列模式
            </button>
          </div>
        </div>

        {/* 添加新步骤 */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label htmlFor="seq-key-input" className="block text-xs font-medium text-slate-600 mb-1.5">
              按键名称或组合键
            </label>
            <input
              id="seq-key-input"
              type="text"
              value={newKeyInput}
              onChange={(e) => setNewKeyInput(e.target.value)}
              placeholder="如 right, space, enter, ctrl+c"
              className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="seq-repeat" className="block text-xs font-medium text-slate-600 mb-1.5">
              连按次数
            </label>
            <input
              id="seq-repeat"
              type="number"
              min={1}
              max={50}
              value={newRepeat}
              onChange={(e) => setNewRepeat(Math.max(1, Number(e.target.value) || 1))}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>
          <div className="md:col-span-3">
            <label htmlFor="seq-delay" className="block text-xs font-medium text-slate-600 mb-1.5">
              步骤后等待 (ms)
            </label>
            <input
              id="seq-delay"
              type="number"
              min={50}
              step={100}
              value={newDelayMs}
              onChange={(e) => setNewDelayMs(Math.max(50, Number(e.target.value) || 500))}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => addStep(newKeyInput)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>添加步骤</span>
            </button>
          </div>
        </div>

        {/* 快捷按键填充 */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 mr-1">快捷填充:</span>
          {COMMON_KEYS.slice(0, 7).map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => {
                setNewKeyInput(k.pythonKey);
                addStep(k.pythonKey);
              }}
              className="px-2.5 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded hover:border-blue-300 hover:text-blue-700 cursor-pointer"
            >
              + {k.pythonKey}
            </button>
          ))}
        </div>

        {/* 流程表 */}
        <div className="mt-6 border border-slate-200 rounded-lg overflow-hidden">
          {config.sequence.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-600">当前序列为空，请从上方添加至少一个按键步骤。</p>
              <button
                type="button"
                onClick={() => addStep('right')}
                className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                添加默认方向右键步骤
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4 w-16">顺序</th>
                  <th className="py-2.5 px-4">触发按键</th>
                  <th className="py-2.5 px-4 w-32">连按次数</th>
                  <th className="py-2.5 px-4 w-40">步后等待 (ms)</th>
                  <th className="py-2.5 px-4 text-right w-36">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {config.sequence.map((step, index) => (
                  <tr key={step.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-400">
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900">{step.keyLabel}</div>
                      <div className="text-xs font-mono text-slate-400">{step.pythonKey}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={step.repeat}
                        onChange={(e) =>
                          updateStep(step.id, { repeat: Math.max(1, Number(e.target.value) || 1) })
                        }
                        className="w-20 px-2.5 py-1 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded"
                      />
                    </td>
                    <td className="py-2.5 px-4">
                      <input
                        type="number"
                        min={50}
                        step={100}
                        value={step.delayAfterMs}
                        onChange={(e) =>
                          updateStep(step.id, {
                            delayAfterMs: Math.max(50, Number(e.target.value) || 50),
                          })
                        }
                        className="w-24 px-2.5 py-1 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveStep(index, -1)}
                          disabled={index === 0}
                          aria-label="上移"
                          className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStep(index, 1)}
                          disabled={index === config.sequence.length - 1}
                          aria-label="下移"
                          className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStep(step.id)}
                          aria-label="删除步骤"
                          className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
