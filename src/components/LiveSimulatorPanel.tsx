import React from 'react';
import {
  FastForward,
  FileText,
  Keyboard,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Square,
  StepForward,
  Video,
} from 'lucide-react';
import { AutomationConfig, RunState } from '../types/automation';

interface LiveSimulatorPanelProps {
  config: AutomationConfig;
  runState: RunState;
  countdownRemaining: number;
  cyclesCompleted: number;
  lastPressedKey: string | null;
  keyPulseActive: boolean;
  videoSeconds: number;
  videoPlaying: boolean;
  slideIndex: number;
  totalKeystrokes: number;
  onToggleStartPause: () => void;
  onStop: () => void;
  onSingleStep: () => void;
  onResetSimulator: () => void;
  onChangeTarget: (target: AutomationConfig['simulatorTarget']) => void;
}

function formatVideoTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const LiveSimulatorPanel: React.FC<LiveSimulatorPanelProps> = ({
  config,
  runState,
  countdownRemaining,
  cyclesCompleted,
  lastPressedKey,
  keyPulseActive,
  videoSeconds,
  videoPlaying,
  slideIndex,
  totalKeystrokes,
  onToggleStartPause,
  onStop,
  onSingleStep,
  onResetSimulator,
  onChangeTarget,
}) => {
  const totalVideoSeconds = 1800; // 30:00 sample timeline
  const totalSlides = 24;
  const progressPct =
    config.loopCount > 0 ? Math.min(100, Math.round((cyclesCompleted / config.loopCount) * 100)) : 100;

  const statusMeta: Record<RunState, { label: string; colorClass: string }> = {
    idle: { label: '已就绪', colorClass: 'text-slate-700 bg-slate-100 border-slate-200' },
    countdown: {
      label: `倒计时 ${countdownRemaining}s`,
      colorClass: 'text-amber-800 bg-amber-50 border-amber-200',
    },
    running: { label: '运行中', colorClass: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
    paused: { label: '已暂停', colorClass: 'text-amber-800 bg-amber-50 border-amber-200' },
  };

  const currentStatus = statusMeta[runState];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-6">
      {/* 控制顶栏 */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-slate-900">实时运行与预览沙盒</h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded border ${currentStatus.colorClass}`}
              >
                {runState === 'running' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" aria-hidden="true" />
                )}
                {currentStatus.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              可直接使用键盘热键：<span className="font-mono font-semibold text-slate-700">{config.hotkeys.toggleStartPause}</span> 启动/暂停，
              <span className="font-mono font-semibold text-slate-700 ml-1">{config.hotkeys.stop}</span> 停止，
              <span className="font-mono font-semibold text-slate-700 ml-1">{config.hotkeys.singleStep}</span> 单步
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleStartPause}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                runState === 'running'
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {runState === 'running' ? (
                <>
                  <Pause className="w-4 h-4" aria-hidden="true" />
                  <span>暂停 ({config.hotkeys.toggleStartPause})</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" aria-hidden="true" />
                  <span>{runState === 'paused' ? '继续' : '启动'} ({config.hotkeys.toggleStartPause})</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onStop}
              disabled={runState === 'idle'}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" aria-hidden="true" />
              <span>停止 ({config.hotkeys.stop})</span>
            </button>

            <button
              type="button"
              onClick={onSingleStep}
              title="触发一次按键测试"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <StepForward className="w-4 h-4" aria-hidden="true" />
              <span>单步</span>
            </button>
          </div>
        </div>

        {/* 核心运行统计 */}
        <div className="grid grid-cols-3 gap-4 py-4 border-b border-slate-100">
          <div>
            <div className="text-xs text-slate-500">当前循环进度</div>
            <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
              {cyclesCompleted}
              <span className="text-sm font-normal text-slate-400">
                {' '}
                / {config.loopCount === 0 ? '∞' : config.loopCount}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">累计触发按键</div>
            <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
              {totalKeystrokes} <span className="text-xs font-normal text-slate-400">次</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">最近模拟按键</div>
            <div className="text-xl font-semibold font-mono text-blue-600 mt-1 truncate">
              {lastPressedKey ?? config.primaryKey.pythonKey}
            </div>
          </div>
        </div>

        {/* 循环进度条 */}
        {config.loopCount > 0 && (
          <div className="pt-3">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-200"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 沙盒预览模式切换 */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => onChangeTarget('video')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                config.simulatorTarget === 'video'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Video className="w-3.5 h-3.5" aria-hidden="true" />
              <span>视频快进模拟</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeTarget('slides')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                config.simulatorTarget === 'slides'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              <span>文档/PPT 翻页</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeTarget('keytester')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                config.simulatorTarget === 'keytester'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" aria-hidden="true" />
              <span>按键信号指示器</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onResetSimulator}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>重置沙盒状态</span>
          </button>
        </div>

        {/* 1. 视频播放器沙盒 */}
        {config.simulatorTarget === 'video' && (
          <div className="rounded-xl bg-slate-900 text-white p-5 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>模拟播放器 · 方向右键 (+5秒) / 左键 (-5秒) / 空格 (播放暂停)</span>
              <span className="font-mono tabular-nums">
                {videoPlaying ? '播放中' : '已暂停'}
              </span>
            </div>

            <div className="h-36 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="text-3xl font-mono font-semibold tabular-nums tracking-tight text-white">
                {formatVideoTime(videoSeconds)}
              </div>
              <div className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
                总时长 {formatVideoTime(totalVideoSeconds)}
              </div>

              {keyPulseActive && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-mono">
                  <FastForward className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>捕获按键: {lastPressedKey}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-150"
                  style={{ width: `${Math.min(100, (videoSeconds / totalVideoSeconds) * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
                <span>{formatVideoTime(videoSeconds)}</span>
                <span>{Math.round((videoSeconds / totalVideoSeconds) * 100)}%</span>
                <span>{formatVideoTime(totalVideoSeconds)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. 幻灯片/文档翻页沙盒 */}
        {config.simulatorTarget === 'slides' && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 flex flex-col items-center justify-center h-[248px]">
            <div className="text-xs text-slate-500 mb-2">
              幻灯片翻页模拟 · Right / PageDown / Space 下一页
            </div>
            <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-6 text-center shadow-xs">
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Slide Preview
              </div>
              <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 mt-2">
                第 {slideIndex} 页 <span className="text-base font-normal text-slate-400">/ {totalSlides}</span>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <SkipForward className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                <span>
                  {keyPulseActive ? `刚刚响应按键: ${lastPressedKey}` : '等待周期按键触发翻页'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. 物理按键信号响应面板 */}
        {config.simulatorTarget === 'keytester' && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 flex flex-col items-center justify-center h-[248px] space-y-4">
            <div className="text-xs text-slate-500">
              机械键帽触发实时可视化（按住时长 {config.holdDurationMs} ms）
            </div>
            <div
              className={`min-w-[160px] px-8 py-5 rounded-xl border-2 text-center font-mono transition-transform duration-100 ${
                keyPulseActive
                  ? 'bg-blue-600 border-blue-700 text-white translate-y-1 shadow-inner'
                  : 'bg-white border-slate-300 text-slate-900 shadow-[0_4px_0_0_#cbd5e1]'
              }`}
            >
              <div className="text-lg font-bold">
                {lastPressedKey ?? config.primaryKey.pythonKey}
              </div>
              <div className={`text-[11px] mt-1 ${keyPulseActive ? 'text-blue-100' : 'text-slate-400'}`}>
                {keyPulseActive ? 'PRESSED (触发中)' : 'READY (待命中)'}
              </div>
            </div>
            <div className="text-xs text-slate-500 font-mono tabular-nums">
              周期: {config.intervalMs}ms · 随机浮动: ±{config.jitterMs}ms
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
