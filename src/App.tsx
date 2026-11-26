import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyConfigurator } from './components/KeyConfigurator';
import { LiveSimulatorPanel } from './components/LiveSimulatorPanel';
import { LogViewer } from './components/LogViewer';
import { PythonExportView } from './components/PythonExportView';
import { SequenceBuilder } from './components/SequenceBuilder';
import { NavTab, TopBar } from './components/TopBar';
import { DEFAULT_CONFIG, normalizeCustomKey } from './data/presets';
import { AutomationConfig, LogEntry, LogLevel, PresetProfile, RunState } from './types/automation';
import { generatePythonGuiScript } from './utils/pythonGenerator';

const STORAGE_KEY = 'keypulse_automation_config_v1';

function formatTimestamp(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('workspace');
  const [config, setConfig] = useState<AutomationConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      // Ignore storage errors
    }
    return DEFAULT_CONFIG;
  });

  const [runState, setRunState] = useState<RunState>('idle');
  const [countdownRemaining, setCountdownRemaining] = useState<number>(0);
  const [cyclesCompleted, setCyclesCompleted] = useState<number>(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState<number>(0);
  const [lastPressedKey, setLastPressedKey] = useState<string | null>(null);
  const [keyPulseActive, setKeyPulseActive] = useState<boolean>(false);

  // Simulator target state
  const [videoSeconds, setVideoSeconds] = useState<number>(125);
  const [videoPlaying, setVideoPlaying] = useState<boolean>(true);
  const [slideIndex, setSlideIndex] = useState<number>(1);

  const [logs, setLogs] = useState<LogEntry[]>(() => [
    {
      id: 'init-1',
      timestamp: formatTimestamp(),
      level: 'info',
      source: '系统初始化',
      message: '工作台已就绪，默认常用按键为方向右键 (right)，热键 F8 启动 / F9 停止',
    },
  ]);

  const configRef = useRef(config);
  configRef.current = config;

  const runStateRef = useRef(runState);
  runStateRef.current = runState;

  const cyclesRef = useRef(cyclesCompleted);
  cyclesRef.current = cyclesCompleted;

  const timerRef = useRef<number | null>(null);
  const pulseTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Ignore storage quota issues
    }
  }, [config]);

  const addLog = useCallback(
    (level: LogLevel, source: string, message: string, detail?: string) => {
      if (!configRef.current.enableLogging && level === 'key') return;
      const entry: LogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: formatTimestamp(),
        level,
        source,
        message,
        detail,
      };
      setLogs((prev) => [entry, ...prev].slice(0, 500));
    },
    []
  );

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const triggerSimulatedKey = useCallback(
    (pythonKey: string, label: string, cycleNum?: number) => {
      setLastPressedKey(pythonKey);
      setTotalKeystrokes((n) => n + 1);
      setKeyPulseActive(true);
      if (pulseTimeoutRef.current !== null) {
        window.clearTimeout(pulseTimeoutRef.current);
      }
      pulseTimeoutRef.current = window.setTimeout(() => {
        setKeyPulseActive(false);
      }, Math.min(450, Math.max(150, configRef.current.holdDurationMs + 120)));

      const lower = pythonKey.toLowerCase();
      if (lower === 'right' || lower.endsWith('+right')) {
        setVideoSeconds((s) => Math.min(1800, s + 5));
        setSlideIndex((p) => (p < 24 ? p + 1 : 1));
      } else if (lower === 'left' || lower.endsWith('+left')) {
        setVideoSeconds((s) => Math.max(0, s - 5));
        setSlideIndex((p) => (p > 1 ? p - 1 : 24));
      } else if (lower === 'space') {
        setVideoPlaying((v) => !v);
        setSlideIndex((p) => (p < 24 ? p + 1 : 1));
      } else if (lower === 'page_down' || lower === 'enter') {
        setSlideIndex((p) => (p < 24 ? p + 1 : 1));
      } else if (lower === 'down') {
        setVideoSeconds(0);
      }

      const cycleTag = cycleNum !== undefined ? `第 ${cycleNum} 轮` : '单步测试';
      addLog(
        'key',
        '按键模拟',
        `${cycleTag} -> 触发 [${label}]`,
        `(hold ${configRef.current.holdDurationMs}ms)`
      );
    },
    [addLog]
  );

  // 模拟视频自然播放计时
  useEffect(() => {
    if (!videoPlaying || config.simulatorTarget !== 'video') return;
    const id = window.setInterval(() => {
      setVideoSeconds((s) => (s < 1800 ? s + 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [videoPlaying, config.simulatorTarget]);

  const stopAutomation = useCallback(
    (reason?: string) => {
      clearTimers();
      if (runStateRef.current !== 'idle') {
        addLog(
          'info',
          '调度器',
          reason ?? `任务已停止，累计完成 ${cyclesRef.current} 轮循环`
        );
      }
      setRunState('idle');
      setCountdownRemaining(0);
    },
    [addLog, clearTimers]
  );

  const scheduleNextCycle = useCallback(() => {
    const runOneCycle = () => {
      if (runStateRef.current !== 'running') return;
      const cfg = configRef.current;

      if (cfg.loopCount > 0 && cyclesRef.current >= cfg.loopCount) {
        stopAutomation(`已完成设定的 ${cfg.loopCount} 次循环，任务自动结束`);
        return;
      }

      const nextCycle = cyclesRef.current + 1;
      cyclesRef.current = nextCycle;
      setCyclesCompleted(nextCycle);

      if (cfg.mode === 'single') {
        triggerSimulatedKey(cfg.primaryKey.pythonKey, cfg.primaryKey.label, nextCycle);
        const jitter =
          cfg.jitterMs > 0
            ? Math.round((Math.random() * 2 - 1) * cfg.jitterMs)
            : 0;
        const delay = Math.max(100, cfg.intervalMs + jitter);
        timerRef.current = window.setTimeout(runOneCycle, delay);
      } else {
        const steps =
          cfg.sequence.length > 0
            ? cfg.sequence
            : [
                {
                  id: 'fallback',
                  keyLabel: cfg.primaryKey.label,
                  pythonKey: cfg.primaryKey.pythonKey,
                  browserKey: cfg.primaryKey.browserKey,
                  repeat: 1,
                  delayAfterMs: 500,
                },
              ];

        let stepIdx = 0;
        let repIdx = 0;

        const runStep = () => {
          if (runStateRef.current !== 'running') return;
          if (stepIdx >= steps.length) {
            const jitter =
              cfg.jitterMs > 0
                ? Math.round((Math.random() * 2 - 1) * cfg.jitterMs)
                : 0;
            const cycleWait = Math.max(100, cfg.intervalMs + jitter);
            timerRef.current = window.setTimeout(runOneCycle, cycleWait);
            return;
          }

          const currentStep = steps[stepIdx];
          triggerSimulatedKey(currentStep.pythonKey, currentStep.keyLabel, nextCycle);
          repIdx += 1;

          if (repIdx >= currentStep.repeat) {
            stepIdx += 1;
            repIdx = 0;
          }
          timerRef.current = window.setTimeout(
            runStep,
            Math.max(50, currentStep.delayAfterMs)
          );
        };

        runStep();
      }
    };

    const firstDelay = 50;
    timerRef.current = window.setTimeout(runOneCycle, firstDelay);
  }, [stopAutomation, triggerSimulatedKey]);

  const startAutomation = useCallback(() => {
    clearTimers();
    const cfg = configRef.current;
    cyclesRef.current = 0;
    setCyclesCompleted(0);

    if (cfg.startDelaySec > 0) {
      setRunState('countdown');
      setCountdownRemaining(cfg.startDelaySec);
      addLog('info', '调度器', `${cfg.startDelaySec} 秒后开始周期执行...`);

      let remaining = cfg.startDelaySec;
      const tickCountdown = () => {
        if (runStateRef.current !== 'countdown') return;
        remaining -= 1;
        setCountdownRemaining(remaining);
        if (remaining <= 0) {
          setRunState('running');
          runStateRef.current = 'running';
          addLog('info', '调度器', '自动化周期任务已正式启动');
          scheduleNextCycle();
        } else {
          timerRef.current = window.setTimeout(tickCountdown, 1000);
        }
      };
      timerRef.current = window.setTimeout(tickCountdown, 1000);
    } else {
      setRunState('running');
      runStateRef.current = 'running';
      addLog('info', '调度器', '自动化周期任务已启动');
      scheduleNextCycle();
    }
  }, [addLog, clearTimers, scheduleNextCycle]);

  const toggleStartPause = useCallback(() => {
    if (runStateRef.current === 'idle') {
      startAutomation();
    } else if (runStateRef.current === 'running') {
      clearTimers();
      setRunState('paused');
      addLog('info', '调度器', '任务已暂停');
    } else if (runStateRef.current === 'paused') {
      setRunState('running');
      runStateRef.current = 'running';
      addLog('info', '调度器', '任务已恢复运行');
      scheduleNextCycle();
    } else if (runStateRef.current === 'countdown') {
      stopAutomation('倒计时期间已取消启动');
    }
  }, [addLog, clearTimers, scheduleNextCycle, startAutomation, stopAutomation]);

  const handleSingleStep = useCallback(() => {
    const cfg = configRef.current;
    triggerSimulatedKey(cfg.primaryKey.pythonKey, cfg.primaryKey.label);
  }, [triggerSimulatedKey]);

  // 全局热键监听 (F8 启动/暂停, F9 停止, F10 单步)
  useEffect(() => {
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
        !e.key.startsWith('F')
      ) {
        return;
      }

      const pressed =
        e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
      const hk = configRef.current.hotkeys;

      if (pressed.toLowerCase() === hk.toggleStartPause.toLowerCase()) {
        e.preventDefault();
        addLog('hotkey', '热键捕获', `按下 [${hk.toggleStartPause}] -> 切换启动/暂停`);
        toggleStartPause();
      } else if (pressed.toLowerCase() === hk.stop.toLowerCase()) {
        e.preventDefault();
        addLog('hotkey', '热键捕获', `按下 [${hk.stop}] -> 停止任务`);
        stopAutomation();
      } else if (pressed.toLowerCase() === hk.singleStep.toLowerCase()) {
        e.preventDefault();
        addLog('hotkey', '热键捕获', `按下 [${hk.singleStep}] -> 执行单步测试`);
        handleSingleStep();
      }
    };

    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, [addLog, handleSingleStep, stopAutomation, toggleStartPause]);

  const handleApplyPreset = (preset: PresetProfile) => {
    stopAutomation();
    setConfig((prev) => ({
      ...prev,
      ...preset.config,
    }));
    addLog('info', '模板加载', `已应用预设方案「${preset.name}」`);
  };

  const handleExportLogs = () => {
    const text = logs
      .slice()
      .reverse()
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message} ${l.detail ?? ''}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `keypulse_logs_${new Date().toISOString().slice(0, 10)}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addLog('info', '日志系统', '已导出完整操作日志文件 (.log)');
  };

  const handleQuickExportPythonGui = () => {
    const code = generatePythonGuiScript(config);
    const blob = new Blob([code], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'keypulse_gui.py';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addLog('info', '脚本导出', '已导出完整 Python GUI 桌面程序 keypulse_gui.py');
    setActiveTab('export');
  };

  const handleImportJsonConfig = (rawJson: string) => {
    try {
      const parsed = JSON.parse(rawJson);
      const primaryKeyOpt = parsed.primary_key
        ? normalizeCustomKey(String(parsed.primary_key))
        : config.primaryKey;

      const importedSequence = Array.isArray(parsed.sequence)
        ? parsed.sequence.map((item: { key?: string; label?: string; repeat?: number; delay_after_ms?: number }, i: number) => {
            const norm = normalizeCustomKey(String(item.key || 'right'));
            return {
              id: `imp-${Date.now()}-${i}`,
              keyLabel: item.label || norm.label,
              pythonKey: norm.pythonKey,
              browserKey: norm.browserKey,
              repeat: Math.max(1, Number(item.repeat) || 1),
              delayAfterMs: Math.max(50, Number(item.delay_after_ms) || 1000),
            };
          })
        : config.sequence;

      setConfig((prev) => ({
        ...prev,
        profileName: parsed.profile_name || prev.profileName,
        description: parsed.description || prev.description,
        mode: parsed.mode === 'sequence' ? 'sequence' : 'single',
        primaryKey: primaryKeyOpt,
        sequence: importedSequence,
        intervalMs: Number(parsed.interval_ms) || prev.intervalMs,
        holdDurationMs: Number(parsed.hold_duration_ms) || prev.holdDurationMs,
        jitterMs: Number(parsed.jitter_ms) ?? prev.jitterMs,
        loopCount: Number(parsed.loop_count) ?? prev.loopCount,
        startDelaySec: Number(parsed.start_delay_sec) ?? prev.startDelaySec,
        hotkeys: {
          toggleStartPause: (parsed.hotkeys?.toggle_start_pause || prev.hotkeys.toggleStartPause).toUpperCase(),
          stop: (parsed.hotkeys?.stop || prev.hotkeys.stop).toUpperCase(),
          singleStep: (parsed.hotkeys?.single_step || prev.hotkeys.singleStep).toUpperCase(),
        },
      }));
      addLog('info', '配置导入', `成功导入配置「${parsed.profile_name || '外部 JSON'}」`);
    } catch {
      addLog('warn', '配置导入', 'JSON 配置文件解析失败，请检查格式');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onQuickExportGui={handleQuickExportPythonGui}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6 space-y-6">
        {activeTab === 'workspace' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-6">
                <KeyConfigurator
                  config={config}
                  onChangeConfig={setConfig}
                  onApplyPreset={handleApplyPreset}
                  onAddLog={(lvl, src, msg) => addLog(lvl, src, msg)}
                  onSwitchToSequenceTab={() => setActiveTab('sequence')}
                />
              </div>

              <div className="lg:col-span-6 space-y-6">
                <LiveSimulatorPanel
                  config={config}
                  runState={runState}
                  countdownRemaining={countdownRemaining}
                  cyclesCompleted={cyclesCompleted}
                  lastPressedKey={lastPressedKey}
                  keyPulseActive={keyPulseActive}
                  videoSeconds={videoSeconds}
                  videoPlaying={videoPlaying}
                  slideIndex={slideIndex}
                  totalKeystrokes={totalKeystrokes}
                  onToggleStartPause={toggleStartPause}
                  onStop={() => stopAutomation()}
                  onSingleStep={handleSingleStep}
                  onResetSimulator={() => {
                    setVideoSeconds(125);
                    setVideoPlaying(true);
                    setSlideIndex(1);
                    setCyclesCompleted(0);
                    setTotalKeystrokes(0);
                    addLog('info', '沙盒重置', '已重置播放器进度与统计计数');
                  }}
                  onChangeTarget={(t) => setConfig((p) => ({ ...p, simulatorTarget: t }))}
                />

                <LogViewer
                  logs={logs}
                  compact
                  onClearLogs={() => setLogs([])}
                  onExportLogs={handleExportLogs}
                  onOpenFullLogs={() => setActiveTab('logs')}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === 'sequence' && (
          <SequenceBuilder
            config={config}
            onChangeConfig={setConfig}
            onAddLog={(lvl, src, msg) => addLog(lvl, src, msg)}
          />
        )}

        {activeTab === 'export' && (
          <PythonExportView
            config={config}
            onImportConfig={handleImportJsonConfig}
            onAddLog={(lvl, src, msg) => addLog(lvl, src, msg)}
          />
        )}

        {activeTab === 'logs' && (
          <LogViewer
            logs={logs}
            onClearLogs={() => setLogs([])}
            onExportLogs={handleExportLogs}
          />
        )}
      </main>
    </div>
  );
}
