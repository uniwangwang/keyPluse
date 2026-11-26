import React, { useEffect, useState } from 'react';
import {
  Clock,
  Keyboard,
  Plus,
  Repeat,
  Sliders,
  Zap,
  ArrowRight,
  Check,
} from 'lucide-react';
import { COMMON_KEYS, PRESET_PROFILES, normalizeCustomKey } from '../data/presets';
import { AutomationConfig, HotkeyBindings, KeyOption, PresetProfile } from '../types/automation';

interface KeyConfiguratorProps {
  config: AutomationConfig;
  onChangeConfig: (updater: (prev: AutomationConfig) => AutomationConfig) => void;
  onApplyPreset: (preset: PresetProfile) => void;
  onAddLog: (level: 'info' | 'key' | 'hotkey' | 'warn', source: string, message: string) => void;
  onSwitchToSequenceTab: () => void;
}

export const KeyConfigurator: React.FC<KeyConfiguratorProps> = ({
  config,
  onChangeConfig,
  onApplyPreset,
  onAddLog,
  onSwitchToSequenceTab,
}) => {
  const [customInput, setCustomInput] = useState('');
  const [isCapturingKey, setIsCapturingKey] = useState(false);
  const [rebindingHotkey, setRebindingHotkey] = useState<keyof HotkeyBindings | null>(null);

  useEffect(() => {
    if (!isCapturingKey && !rebindingHotkey) return;

    const handleCapture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (rebindingHotkey) {
        const keyName = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
        onChangeConfig((prev) => ({
          ...prev,
          hotkeys: {
            ...prev.hotkeys,
            [rebindingHotkey]: keyName,
          },
        }));
        onAddLog('hotkey', '热键设置', `已将热键绑定更新为 [${keyName}]`);
        setRebindingHotkey(null);
        return;
      }

      if (isCapturingKey) {
        const parts: string[] = [];
        if (e.ctrlKey && e.key !== 'Control') parts.push('ctrl');
        if (e.altKey && e.key !== 'Alt') parts.push('alt');
        if (e.shiftKey && e.key !== 'Shift') parts.push('shift');

        let rawKey = e.key;
        if (rawKey === ' ') rawKey = 'space';
        if (rawKey === 'ArrowRight') rawKey = 'right';
        if (rawKey === 'ArrowLeft') rawKey = 'left';
        if (rawKey === 'ArrowUp') rawKey = 'up';
        if (rawKey === 'ArrowDown') rawKey = 'down';
        if (rawKey === 'Escape') rawKey = 'esc';

        if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
          parts.push(rawKey.toLowerCase());
          const expr = parts.join('+');
          const normalized = normalizeCustomKey(expr);
          onChangeConfig((prev) => ({
            ...prev,
            primaryKey: normalized,
          }));
          setCustomInput(expr);
          onAddLog('info', '按键捕获', `已捕获自定义按键 [${normalized.label}]`);
          setIsCapturingKey(false);
        }
      }
    };

    window.addEventListener('keydown', handleCapture, true);
    return () => window.removeEventListener('keydown', handleCapture, true);
  }, [isCapturingKey, rebindingHotkey, onChangeConfig, onAddLog]);

  const handleSelectCommonKey = (keyOpt: KeyOption) => {
    onChangeConfig((prev) => ({
      ...prev,
      primaryKey: keyOpt,
    }));
    onAddLog('info', '按键配置', `已切换触发按键为 ${keyOpt.label}`);
  };

  const handleApplyCustomInput = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    const normalized = normalizeCustomKey(trimmed);
    onChangeConfig((prev) => ({
      ...prev,
      primaryKey: normalized,
    }));
    onAddLog('info', '自定义按键', `已设置触发按键为 [${normalized.label}]`);
  };

  const handleAddCurrentToSequence = () => {
    const keyToAdd = customInput.trim()
      ? normalizeCustomKey(customInput.trim())
      : config.primaryKey;

    onChangeConfig((prev) => ({
      ...prev,
      sequence: [
        ...prev.sequence,
        {
          id: `step-${Date.now()}`,
          keyLabel: keyToAdd.label,
          pythonKey: keyToAdd.pythonKey,
          browserKey: keyToAdd.browserKey,
          repeat: 1,
          delayAfterMs: 1000,
        },
      ],
    }));
    onAddLog('info', '序列编排', `已将 [${keyToAdd.label}] 加入自定义序列`);
  };

  const quickIntervals = [
    { label: '0.5秒', ms: 500 },
    { label: '1秒', ms: 1000 },
    { label: '3秒', ms: 3000 },
    { label: '5秒', ms: 5000 },
    { label: '10秒', ms: 10000 },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
      {/* 场景预设选择 */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-900">快捷场景模板</h2>
          </div>
          <span className="text-xs text-slate-500">一键填充推荐参数</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PRESET_PROFILES.map((preset) => {
            const isSelected = config.profileName === preset.config.profileName;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApplyPreset(preset)}
                className={`text-left p-3 rounded-lg border transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-300 text-slate-900'
                    : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{preset.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{preset.summary}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* 触发模式与按键选择 */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-blue-600" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-900">按键与执行模式</h2>
          </div>

          <div className="inline-flex p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => onChangeConfig((p) => ({ ...p, mode: 'single' }))}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                config.mode === 'single'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              单键周期连按
            </button>
            <button
              type="button"
              onClick={() => onChangeConfig((p) => ({ ...p, mode: 'sequence' }))}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                config.mode === 'sequence'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              多键序列 ({config.sequence.length})
            </button>
          </div>
        </div>

        {/* 常用按键矩阵 */}
        <p className="text-xs text-slate-500 mb-2.5">
          常用按键（默认推荐方向右键用于视频快进与翻页）
        </p>
        <div className="grid grid-cols-3 gap-2">
          {COMMON_KEYS.map((item) => {
            const active = config.primaryKey.pythonKey === item.pythonKey;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectCommonKey(item)}
                title={item.description}
                className={`px-3 py-2.5 rounded-lg border text-left transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 ${
                  active
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-semibold truncate">{item.label}</div>
                <div
                  className={`text-[11px] font-mono mt-0.5 truncate ${
                    active ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  key: {item.pythonKey}
                </div>
              </button>
            );
          })}
        </div>

        {/* 自定义按键添加 */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <label
            htmlFor="custom-key-input"
            className="block text-xs font-medium text-slate-700 mb-2"
          >
            自定义按键 / 组合键（例如 ctrl+right、a、f11 或点击捕获）
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="custom-key-input"
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyCustomInput();
                }
              }}
              placeholder={`当前: ${config.primaryKey.pythonKey}`}
              className="flex-1 min-w-[160px] px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white"
            />
            <button
              type="button"
              onClick={() => setIsCapturingKey((v) => !v)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isCapturingKey
                  ? 'bg-amber-50 border-amber-400 text-amber-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {isCapturingKey ? '请按下任意键...' : '按键捕获'}
            </button>
            <button
              type="button"
              onClick={handleApplyCustomInput}
              className="px-3 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              设为当前键
            </button>
            <button
              type="button"
              onClick={handleAddCurrentToSequence}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>加入序列</span>
            </button>
          </div>

          {config.mode === 'sequence' && (
            <div className="mt-3 flex items-center justify-between text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <span>
                当前已编排 <strong className="tabular-nums text-slate-900">{config.sequence.length}</strong> 个序列步骤
              </span>
              <button
                type="button"
                onClick={onSwitchToSequenceTab}
                className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                <span>编辑详细流程</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* 周期与循环设置 */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-900">时间间隔与循环次数</h2>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {(config.intervalMs / 1000).toFixed(2)}s / 次
          </span>
        </div>

        {/* 快捷间隔选项 */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {quickIntervals.map((preset) => {
            const isActive = config.intervalMs === preset.ms;
            return (
              <button
                key={preset.ms}
                type="button"
                onClick={() => onChangeConfig((p) => ({ ...p, intervalMs: preset.ms }))}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors tabular-nums cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="interval-ms"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              间隔周期 (毫秒 ms)
            </label>
            <input
              id="interval-ms"
              type="number"
              min={100}
              step={100}
              value={config.intervalMs}
              onChange={(e) =>
                onChangeConfig((p) => ({
                  ...p,
                  intervalMs: Math.max(100, Number(e.target.value) || 100),
                }))
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div>
            <label
              htmlFor="loop-count"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              循环次数 (0 = 无限循环)
            </label>
            <div className="relative flex items-center">
              <input
                id="loop-count"
                type="number"
                min={0}
                step={1}
                value={config.loopCount}
                onChange={(e) =>
                  onChangeConfig((p) => ({
                    ...p,
                    loopCount: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white"
              />
              <button
                type="button"
                onClick={() =>
                  onChangeConfig((p) => ({
                    ...p,
                    loopCount: p.loopCount === 0 ? 20 : 0,
                  }))
                }
                title="切换无限循环"
                className={`ml-2 px-2.5 py-2 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 cursor-pointer ${
                  config.loopCount === 0
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Repeat className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
                无限
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="hold-duration"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              按住持续时间 (ms)
            </label>
            <input
              id="hold-duration"
              type="number"
              min={10}
              max={2000}
              step={10}
              value={config.holdDurationMs}
              onChange={(e) =>
                onChangeConfig((p) => ({
                  ...p,
                  holdDurationMs: Math.max(10, Number(e.target.value) || 50),
                }))
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div>
            <label
              htmlFor="jitter-ms"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              随机防机械浮动 (±ms)
            </label>
            <input
              id="jitter-ms"
              type="number"
              min={0}
              step={50}
              value={config.jitterMs}
              onChange={(e) =>
                onChangeConfig((p) => ({
                  ...p,
                  jitterMs: Math.max(0, Number(e.target.value) || 0),
                }))
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <label htmlFor="start-delay" className="text-xs font-medium text-slate-600">
            启动前延迟倒计时（便于切回视频或目标窗口）
          </label>
          <div className="flex items-center gap-2">
            <input
              id="start-delay"
              type="number"
              min={0}
              max={30}
              value={config.startDelaySec}
              onChange={(e) =>
                onChangeConfig((p) => ({
                  ...p,
                  startDelaySec: Math.max(0, Number(e.target.value) || 0),
                }))
              }
              className="w-20 px-3 py-1.5 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
            <span className="text-xs text-slate-500">秒</span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* 热键启动/停止配置 */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-900">热键启动与停止</h2>
          </div>
          <span className="text-xs text-slate-500">点击按钮可重新绑定</span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {(
            [
              { field: 'toggleStartPause', title: '启动 / 暂停' },
              { field: 'stop', title: '强制停止' },
              { field: 'singleStep', title: '单步测试' },
            ] as const
          ).map((item) => {
            const isListening = rebindingHotkey === item.field;
            return (
              <button
                key={item.field}
                type="button"
                onClick={() => setRebindingHotkey(isListening ? null : item.field)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isListening
                    ? 'bg-amber-50 border-amber-400 text-amber-900'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-[11px] text-slate-500">{item.title}</div>
                <div className="text-sm font-mono font-semibold text-slate-900 mt-1">
                  {isListening ? '按键中...' : config.hotkeys[item.field]}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
