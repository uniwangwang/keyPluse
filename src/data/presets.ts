import { AutomationConfig, KeyOption, PresetProfile } from '../types/automation';

export const COMMON_KEYS: KeyOption[] = [
  {
    id: 'right',
    label: '→ 方向右键 (Right)',
    pythonKey: 'right',
    browserKey: 'ArrowRight',
    category: 'navigation',
    description: '视频快进 / 幻灯片下一页 / 网页右翻',
  },
  {
    id: 'left',
    label: '← 方向左键 (Left)',
    pythonKey: 'left',
    browserKey: 'ArrowLeft',
    category: 'navigation',
    description: '视频后退 / 幻灯片上一页',
  },
  {
    id: 'space',
    label: '␣ 空格键 (Space)',
    pythonKey: 'space',
    browserKey: ' ',
    category: 'media',
    description: '播放暂停 / 页面向下滚动',
  },
  {
    id: 'enter',
    label: '↵ 回车键 (Enter)',
    pythonKey: 'enter',
    browserKey: 'Enter',
    category: 'editing',
    description: '确认弹窗 / 提交表单',
  },
  {
    id: 'page_down',
    label: '⇟ 下翻页 (PageDown)',
    pythonKey: 'page_down',
    browserKey: 'PageDown',
    category: 'navigation',
    description: '长文档 / 阅读器翻页',
  },
  {
    id: 'down',
    label: '↓ 方向下键 (Down)',
    pythonKey: 'down',
    browserKey: 'ArrowDown',
    category: 'navigation',
    description: '列表下移 / 短视频切换',
  },
  {
    id: 'tab',
    label: '⇥ 制表键 (Tab)',
    pythonKey: 'tab',
    browserKey: 'Tab',
    category: 'editing',
    description: '焦点切换 / 表单跳转',
  },
  {
    id: 'f5',
    label: 'F5 刷新键',
    pythonKey: 'f5',
    browserKey: 'F5',
    category: 'function',
    description: '定时刷新页面或看板',
  },
  {
    id: 'esc',
    label: 'Esc 退出键',
    pythonKey: 'esc',
    browserKey: 'Escape',
    category: 'function',
    description: '关闭提示框 / 取消状态',
  },
];

export const DEFAULT_CONFIG: AutomationConfig = {
  profileName: '视频播放自动快进',
  description: '周期性模拟按下方向右键，适用于长视频跳段浏览或自动推进进度，无需手动点选。',
  mode: 'single',
  primaryKey: COMMON_KEYS[0], // 方向右键 Right
  sequence: [
    {
      id: 'step-1',
      keyLabel: '→ 方向右键 (Right)',
      pythonKey: 'right',
      browserKey: 'ArrowRight',
      repeat: 1,
      delayAfterMs: 1200,
    },
    {
      id: 'step-2',
      keyLabel: '␣ 空格键 (Space)',
      pythonKey: 'space',
      browserKey: ' ',
      repeat: 1,
      delayAfterMs: 800,
    },
  ],
  intervalMs: 3000,
  holdDurationMs: 60,
  jitterMs: 0,
  loopCount: 20,
  startDelaySec: 2,
  hotkeys: {
    toggleStartPause: 'F8',
    stop: 'F9',
    singleStep: 'F10',
  },
  enableLogging: true,
  simulatorTarget: 'video',
};

export const PRESET_PROFILES: PresetProfile[] = [
  {
    id: 'video-skip',
    name: '视频自动快进 (方向右键)',
    summary: '每 3 秒按一次 → 右键，共执行 20 次，适合速览网课或长视频。',
    config: {
      profileName: '视频自动快进',
      description: '每 3 秒自动按下方向右键，模拟播放器快进 5 秒操作。',
      mode: 'single',
      primaryKey: COMMON_KEYS[0],
      intervalMs: 3000,
      holdDurationMs: 60,
      jitterMs: 0,
      loopCount: 20,
      startDelaySec: 2,
      simulatorTarget: 'video',
    },
  },
  {
    id: 'short-video-scroll',
    name: '短视频自动下划 (方向下键)',
    summary: '每 8 秒按一次 ↓ 下键，带 ±500ms 随机防机械抖动，无限循环。',
    config: {
      profileName: '短视频自动下划',
      description: '每 8 秒切换下一条视频，附带轻微随机延迟。',
      mode: 'single',
      primaryKey: COMMON_KEYS[5],
      intervalMs: 8000,
      holdDurationMs: 80,
      jitterMs: 500,
      loopCount: 0,
      startDelaySec: 3,
      simulatorTarget: 'video',
    },
  },
  {
    id: 'ppt-auto-next',
    name: '演示文稿 / 电子书自动翻页',
    summary: '每 5 秒按下 PageDown 翻页，共 30 页，适合无人值守轮播展示。',
    config: {
      profileName: '演示文稿自动翻页',
      description: '定时触发 PageDown 翻页，适合大屏轮播与阅读器。',
      mode: 'single',
      primaryKey: COMMON_KEYS[4],
      intervalMs: 5000,
      holdDurationMs: 50,
      jitterMs: 0,
      loopCount: 30,
      startDelaySec: 2,
      simulatorTarget: 'slides',
    },
  },
  {
    id: 'multi-step-workflow',
    name: '多键组合自动化流程',
    summary: '依次执行 方向右键 → 空格键 组合序列，适合带确认动作的批量任务。',
    config: {
      profileName: '多键组合自动化流程',
      description: '按顺序触发自定义多键序列，每轮结束后等待设定间隔。',
      mode: 'sequence',
      intervalMs: 2500,
      holdDurationMs: 60,
      jitterMs: 100,
      loopCount: 10,
      startDelaySec: 2,
      simulatorTarget: 'keytester',
    },
  },
];

export function normalizeCustomKey(raw: string): KeyOption {
  const cleaned = raw.trim();
  const lower = cleaned.toLowerCase();

  const knownMap: Record<string, { label: string; pythonKey: string; browserKey: string }> = {
    right: { label: '→ 方向右键 (Right)', pythonKey: 'right', browserKey: 'ArrowRight' },
    arrowright: { label: '→ 方向右键 (Right)', pythonKey: 'right', browserKey: 'ArrowRight' },
    left: { label: '← 方向左键 (Left)', pythonKey: 'left', browserKey: 'ArrowLeft' },
    arrowleft: { label: '← 方向左键 (Left)', pythonKey: 'left', browserKey: 'ArrowLeft' },
    up: { label: '↑ 方向上键 (Up)', pythonKey: 'up', browserKey: 'ArrowUp' },
    arrowup: { label: '↑ 方向上键 (Up)', pythonKey: 'up', browserKey: 'ArrowUp' },
    down: { label: '↓ 方向下键 (Down)', pythonKey: 'down', browserKey: 'ArrowDown' },
    arrowdown: { label: '↓ 方向下键 (Down)', pythonKey: 'down', browserKey: 'ArrowDown' },
    space: { label: '␣ 空格键 (Space)', pythonKey: 'space', browserKey: ' ' },
    ' ': { label: '␣ 空格键 (Space)', pythonKey: 'space', browserKey: ' ' },
    enter: { label: '↵ 回车键 (Enter)', pythonKey: 'enter', browserKey: 'Enter' },
    return: { label: '↵ 回车键 (Enter)', pythonKey: 'enter', browserKey: 'Enter' },
    tab: { label: '⇥ 制表键 (Tab)', pythonKey: 'tab', browserKey: 'Tab' },
    esc: { label: 'Esc 退出键', pythonKey: 'esc', browserKey: 'Escape' },
    escape: { label: 'Esc 退出键', pythonKey: 'esc', browserKey: 'Escape' },
    pagedown: { label: '⇟ 下翻页 (PageDown)', pythonKey: 'page_down', browserKey: 'PageDown' },
    page_down: { label: '⇟ 下翻页 (PageDown)', pythonKey: 'page_down', browserKey: 'PageDown' },
    pageup: { label: '⇞ 上翻页 (PageUp)', pythonKey: 'page_up', browserKey: 'PageUp' },
    page_up: { label: '⇞ 上翻页 (PageUp)', pythonKey: 'page_up', browserKey: 'PageUp' },
    backspace: { label: '⌫ 退格键 (Backspace)', pythonKey: 'backspace', browserKey: 'Backspace' },
    delete: { label: '⌦ 删除键 (Delete)', pythonKey: 'delete', browserKey: 'Delete' },
    home: { label: 'Home 键', pythonKey: 'home', browserKey: 'Home' },
    end: { label: 'End 键', pythonKey: 'end', browserKey: 'End' },
  };

  if (knownMap[lower]) {
    const match = knownMap[lower];
    return {
      id: `custom-${match.pythonKey}-${Date.now()}`,
      label: match.label,
      pythonKey: match.pythonKey,
      browserKey: match.browserKey,
      category: 'custom',
      description: '自定义按键',
    };
  }

  return {
    id: `custom-${lower}-${Date.now()}`,
    label: cleaned.length === 1 ? `按键 ${cleaned.toUpperCase()}` : cleaned,
    pythonKey: lower,
    browserKey: cleaned,
    category: 'custom',
    description: '用户自定义按键 / 组合键',
  };
}
