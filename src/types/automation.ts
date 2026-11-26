export type RunState = 'idle' | 'countdown' | 'running' | 'paused';

export type LogLevel = 'info' | 'key' | 'hotkey' | 'warn' | 'error';

export interface KeyOption {
  id: string;
  label: string;
  pythonKey: string;
  browserKey: string;
  category: 'navigation' | 'media' | 'editing' | 'function' | 'custom';
  description?: string;
}

export interface KeyStep {
  id: string;
  keyLabel: string;
  pythonKey: string;
  browserKey: string;
  repeat: number;
  delayAfterMs: number;
}

export interface HotkeyBindings {
  toggleStartPause: string; // e.g. 'F8'
  stop: string;             // e.g. 'F9'
  singleStep: string;       // e.g. 'F10'
}

export interface AutomationConfig {
  profileName: string;
  description: string;
  mode: 'single' | 'sequence';
  primaryKey: KeyOption;
  sequence: KeyStep[];
  intervalMs: number;       // Interval between cycles (ms)
  holdDurationMs: number;   // Key press hold time (ms)
  jitterMs: number;         // Optional random jitter (+/- ms)
  loopCount: number;        // 0 = infinite
  startDelaySec: number;    // Delay before first press (seconds)
  hotkeys: HotkeyBindings;
  enableLogging: boolean;
  simulatorTarget: 'video' | 'slides' | 'keytester';
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  detail?: string;
}

export interface PresetProfile {
  id: string;
  name: string;
  summary: string;
  config: Partial<AutomationConfig>;
}
