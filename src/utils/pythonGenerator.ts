import { AutomationConfig } from '../types/automation';

function escapePyString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function generateConfigJson(config: AutomationConfig): string {
  const payload = {
    profile_name: config.profileName,
    description: config.description,
    mode: config.mode,
    primary_key: config.primaryKey.pythonKey,
    sequence: config.sequence.map((s) => ({
      key: s.pythonKey,
      label: s.keyLabel,
      repeat: s.repeat,
      delay_after_ms: s.delayAfterMs,
    })),
    interval_ms: config.intervalMs,
    hold_duration_ms: config.holdDurationMs,
    jitter_ms: config.jitterMs,
    loop_count: config.loopCount,
    start_delay_sec: config.startDelaySec,
    hotkeys: {
      toggle_start_pause: config.hotkeys.toggleStartPause.toLowerCase(),
      stop: config.hotkeys.stop.toLowerCase(),
      single_step: config.hotkeys.singleStep.toLowerCase(),
    },
    enable_logging: config.enableLogging,
  };
  return JSON.stringify(payload, null, 2);
}

export function generatePythonGuiScript(config: AutomationConfig): string {
  const jsonConfig = generateConfigJson(config)
    .replace(/\\/g, '\\\\')
    .replace(/"""/g, '\\"\\"\\"');

  const profileName = escapePyString(config.profileName);

  return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KeyPulse 键盘周期自动化桌面工具 (Python Tkinter + Pynput)
预设配置: ${profileName}

安装依赖:
    pip install pynput

运行方式:
    python keypulse_gui.py
"""

import json
import os
import random
import threading
import time
import tkinter as tk
from datetime import datetime
from tkinter import filedialog, messagebox, scrolledtext, ttk

try:
    from pynput import keyboard
    from pynput.keyboard import Controller, Key
    PYNPUT_AVAILABLE = True
except ImportError:
    PYNPUT_AVAILABLE = False


DEFAULT_CONFIG = json.loads("""${jsonConfig}""")

SPECIAL_KEY_MAP = {
    "right": Key.right,
    "left": Key.left,
    "up": Key.up,
    "down": Key.down,
    "space": Key.space,
    "enter": Key.enter,
    "return": Key.enter,
    "tab": Key.tab,
    "esc": Key.esc,
    "escape": Key.esc,
    "page_down": Key.page_down,
    "pagedown": Key.page_down,
    "page_up": Key.page_up,
    "pageup": Key.page_up,
    "backspace": Key.backspace,
    "delete": Key.delete,
    "home": Key.home,
    "end": Key.end,
    "ctrl": Key.ctrl,
    "ctrl_l": Key.ctrl_l,
    "alt": Key.alt,
    "shift": Key.shift,
    "f1": Key.f1, "f2": Key.f2, "f3": Key.f3, "f4": Key.f4,
    "f5": Key.f5, "f6": Key.f6, "f7": Key.f7, "f8": Key.f8,
    "f9": Key.f9, "f10": Key.f10, "f11": Key.f11, "f12": Key.f12,
}

COMMON_KEY_CHOICES = [
    ("right", "→ 方向右键 (right)"),
    ("left", "← 方向左键 (left)"),
    ("space", "␣ 空格键 (space)"),
    ("enter", "↵ 回车键 (enter)"),
    ("page_down", "⇟ 下翻页 (page_down)"),
    ("down", "↓ 方向下键 (down)"),
    ("tab", "⇥ 制表键 (tab)"),
    ("f5", "F5 刷新键 (f5)"),
    ("esc", "Esc 退出键 (esc)"),
]


class IconFactory:
    """使用 Tkinter Canvas 绘制简洁矢量图标，无需外部图片资源"""

    @staticmethod
    def draw_play(canvas: tk.Canvas, color="#ffffff"):
        canvas.delete("all")
        canvas.create_polygon(5, 3, 15, 9, 5, 15, fill=color, outline="")

    @staticmethod
    def draw_pause(canvas: tk.Canvas, color="#ffffff"):
        canvas.delete("all")
        canvas.create_rectangle(4, 3, 7, 15, fill=color, outline="")
        canvas.create_rectangle(11, 3, 14, 15, fill=color, outline="")

    @staticmethod
    def draw_stop(canvas: tk.Canvas, color="#dc2626"):
        canvas.delete("all")
        canvas.create_rectangle(4, 4, 14, 14, fill=color, outline="")

    @staticmethod
    def draw_keyboard(canvas: tk.Canvas, color="#2563eb"):
        canvas.delete("all")
        canvas.create_rectangle(2, 4, 18, 15, outline=color, width=1.6)
        for x in (5, 9, 13):
            canvas.create_rectangle(x, 7, x + 2, 9, fill=color, outline="")
        canvas.create_line(5, 12, 15, 12, fill=color, width=1.6)


class KeyPulseApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("KeyPulse — 键盘周期自动化控制台")
        self.root.geometry("940x680")
        self.root.minsize(840, 600)
        self.root.configure(bg="#f8fafc")

        self.config = dict(DEFAULT_CONFIG)
        self.sequence = list(self.config.get("sequence", []))
        self.custom_keys = [k for k, _ in COMMON_KEY_CHOICES]

        self.controller = Controller() if PYNPUT_AVAILABLE else None
        self.hotkey_listener = None
        self.worker_thread = None
        self.stop_event = threading.Event()
        self.pause_event = threading.Event()
        self.is_running = False
        self.is_paused = False
        self.current_cycle = 0

        self._setup_styles()
        self._build_ui()
        self._apply_config_to_ui()
        self._start_global_hotkeys()
        self.log("INFO", "系统初始化完成，常用按键已设为方向右键 (right)")

        if not PYNPUT_AVAILABLE:
            self.log("WARN", "未检测到 pynput 库，请执行: pip install pynput")

    def _setup_styles(self):
        style = ttk.Style()
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure("TFrame", background="#f8fafc")
        style.configure("Card.TFrame", background="#ffffff", relief="flat")
        style.configure("TLabel", background="#ffffff", foreground="#0f172a", font=("Segoe UI", 10))
        style.configure("Muted.TLabel", background="#ffffff", foreground="#64748b", font=("Segoe UI", 9))
        style.configure("Header.TLabel", background="#f8fafc", foreground="#0f172a", font=("Segoe UI", 14, "bold"))

    def _build_ui(self):
        # 顶部控制栏
        top_bar = tk.Frame(self.root, bg="#ffffff", highlightbackground="#e2e8f0", highlightthickness=1)
        top_bar.pack(fill="x", padx=16, pady=(14, 10))

        brand_frame = tk.Frame(top_bar, bg="#ffffff")
        brand_frame.pack(side="left", padx=14, pady=10)
        kb_icon = tk.Canvas(brand_frame, width=20, height=18, bg="#ffffff", highlightthickness=0)
        kb_icon.pack(side="left", padx=(0, 8))
        IconFactory.draw_keyboard(kb_icon)
        tk.Label(brand_frame, text="KeyPulse 自动化控制台", bg="#ffffff", fg="#0f172a",
                 font=("Segoe UI", 12, "bold")).pack(side="left")

        self.status_label = tk.Label(top_bar, text="状态: 已就绪", bg="#f1f5f9", fg="#334155",
                                     font=("Segoe UI", 9, "bold"), padx=10, pady=4)
        self.status_label.pack(side="left", padx=12)

        btn_bar = tk.Frame(top_bar, bg="#ffffff")
        btn_bar.pack(side="right", padx=14, pady=8)

        self.btn_start = tk.Button(
            btn_bar, text="▶ 启动任务", command=self.toggle_start_pause,
            bg="#2563eb", fg="#ffffff", activebackground="#1d4ed8", activeforeground="#ffffff",
            relief="flat", font=("Segoe UI", 10, "bold"), padx=14, pady=6, cursor="hand2"
        )
        self.btn_start.pack(side="left", padx=4)

        self.btn_stop = tk.Button(
            btn_bar, text="■ 停止", command=self.stop_task,
            bg="#ffffff", fg="#dc2626", highlightbackground="#fecaca", highlightthickness=1,
            relief="flat", font=("Segoe UI", 10, "bold"), padx=12, pady=6, cursor="hand2"
        )
        self.btn_stop.pack(side="left", padx=4)

        tk.Button(
            btn_bar, text="导出配置", command=self.export_config_json,
            bg="#f8fafc", fg="#0f172a", relief="flat", font=("Segoe UI", 9), padx=10, pady=6, cursor="hand2"
        ).pack(side="left", padx=4)

        tk.Button(
            btn_bar, text="导入配置", command=self.import_config_json,
            bg="#f8fafc", fg="#0f172a", relief="flat", font=("Segoe UI", 9), padx=10, pady=6, cursor="hand2"
        ).pack(side="left", padx=4)

        tk.Button(
            btn_bar, text="导出独立脚本", command=self.export_standalone_script,
            bg="#0f172a", fg="#ffffff", relief="flat", font=("Segoe UI", 9, "bold"), padx=10, pady=6, cursor="hand2"
        ).pack(side="left", padx=(4, 0))

        # 主工作区左右分栏
        main_pane = tk.Frame(self.root, bg="#f8fafc")
        main_pane.pack(fill="both", expand=True, padx=16, pady=(0, 14))
        main_pane.columnconfigure(0, weight=5)
        main_pane.columnconfigure(1, weight=6)
        main_pane.rowconfigure(0, weight=1)

        # 左侧: 参数与按键配置
        left_card = tk.Frame(main_pane, bg="#ffffff", highlightbackground="#e2e8f0", highlightthickness=1)
        left_card.grid(row=0, column=0, sticky="nsew", padx=(0, 8))

        self._build_config_panel(left_card)

        # 右侧: 序列 & 实时日志记录
        right_card = tk.Frame(main_pane, bg="#ffffff", highlightbackground="#e2e8f0", highlightthickness=1)
        right_card.grid(row=0, column=1, sticky="nsew", padx=(8, 0))

        self._build_log_and_sequence_panel(right_card)

    def _build_config_panel(self, parent: tk.Frame):
        pad = {"padx": 16, "pady": 6}
        tk.Label(parent, text="1. 按键与模式配置", bg="#ffffff", fg="#0f172a",
                 font=("Segoe UI", 11, "bold")).pack(anchor="w", padx=16, pady=(14, 6))

        mode_frame = tk.Frame(parent, bg="#ffffff")
        mode_frame.pack(fill="x", **pad)
        self.mode_var = tk.StringVar(value="single")
        tk.Radiobutton(mode_frame, text="单键周期连按 (推荐: 方向右键)", variable=self.mode_var,
                       value="single", bg="#ffffff", font=("Segoe UI", 9)).pack(side="left", padx=(0, 12))
        tk.Radiobutton(mode_frame, text="多键自定义序列", variable=self.mode_var,
                       value="sequence", bg="#ffffff", font=("Segoe UI", 9)).pack(side="left")

        # 常用按键快捷按钮网格
        tk.Label(parent, text="常用按键快捷选择:", bg="#ffffff", fg="#475569",
                 font=("Segoe UI", 9)).pack(anchor="w", padx=16, pady=(6, 4))
        quick_grid = tk.Frame(parent, bg="#ffffff")
        quick_grid.pack(fill="x", padx=16, pady=(0, 6))

        self.primary_key_var = tk.StringVar(value="right")
        for idx, (k_val, k_label) in enumerate(COMMON_KEY_CHOICES[:6]):
            btn = tk.Button(
                quick_grid, text=k_label.split(" ")[0] + " " + k_label.split(" ")[1],
                command=lambda v=k_val: self.select_primary_key(v),
                bg="#eff6ff" if k_val == "right" else "#f8fafc",
                fg="#1d4ed8" if k_val == "right" else "#334155",
                relief="flat", highlightbackground="#cbd5e1", highlightthickness=1,
                font=("Segoe UI", 9), padx=8, pady=4, cursor="hand2"
            )
            btn.grid(row=idx // 2, column=idx % 2, sticky="ew", padx=3, pady=3)
        quick_grid.columnconfigure(0, weight=1)
        quick_grid.columnconfigure(1, weight=1)

        # 自定义按键输入与添加
        custom_row = tk.Frame(parent, bg="#ffffff")
        custom_row.pack(fill="x", padx=16, pady=6)
        tk.Label(custom_row, text="当前按键 / 自定义:", bg="#ffffff", fg="#334155",
                 font=("Segoe UI", 9)).pack(side="left")
        self.custom_key_entry = tk.Entry(custom_row, textvariable=self.primary_key_var,
                                         font=("Consolas", 10), bg="#f8fafc", width=16)
        self.custom_key_entry.pack(side="left", padx=8)
        tk.Button(
            custom_row, text="+ 加入序列", command=self.add_custom_key_to_sequence,
            bg="#f1f5f9", fg="#0f172a", relief="flat", font=("Segoe UI", 9), padx=8, pady=3, cursor="hand2"
        ).pack(side="left")

        tk.Label(parent, text="支持按键名如 right, space, enter, a 或组合键 ctrl+right",
                 bg="#ffffff", fg="#94a3b8", font=("Segoe UI", 8)).pack(anchor="w", padx=16)

        # 周期与循环设置
        tk.Label(parent, text="2. 间隔时间与循环次数", bg="#ffffff", fg="#0f172a",
                 font=("Segoe UI", 11, "bold")).pack(anchor="w", padx=16, pady=(14, 6))

        grid = tk.Frame(parent, bg="#ffffff")
        grid.pack(fill="x", padx=16, pady=4)
        grid.columnconfigure(1, weight=1)

        self.interval_var = tk.StringVar(value="3000")
        self.hold_var = tk.StringVar(value="60")
        self.jitter_var = tk.StringVar(value="0")
        self.loop_var = tk.StringVar(value="20")
        self.delay_var = tk.StringVar(value="2")

        fields = [
            ("触发间隔 (毫秒 ms):", self.interval_var),
            ("按住时长 (毫秒 ms):", self.hold_var),
            ("随机浮动 (±毫秒):", self.jitter_var),
            ("循环次数 (0=无限):", self.loop_var),
            ("启动倒计时 (秒):", self.delay_var),
        ]
        for r, (label_text, var) in enumerate(fields):
            tk.Label(grid, text=label_text, bg="#ffffff", fg="#334155",
                     font=("Segoe UI", 9)).grid(row=r, column=0, sticky="w", pady=4)
            tk.Entry(grid, textvariable=var, font=("Consolas", 10), bg="#f8fafc",
                     width=14).grid(row=r, column=1, sticky="e", pady=4)

        # 热键设置
        tk.Label(parent, text="3. 全局热键控制 (后台生效)", bg="#ffffff", fg="#0f172a",
                 font=("Segoe UI", 11, "bold")).pack(anchor="w", padx=16, pady=(14, 6))

        hk_grid = tk.Frame(parent, bg="#ffffff")
        hk_grid.pack(fill="x", padx=16, pady=4)
        hk_grid.columnconfigure(1, weight=1)

        self.hk_toggle_var = tk.StringVar(value="f8")
        self.hk_stop_var = tk.StringVar(value="f9")

        tk.Label(hk_grid, text="启动 / 暂停 热键:", bg="#ffffff", fg="#334155",
                 font=("Segoe UI", 9)).grid(row=0, column=0, sticky="w", pady=3)
        tk.Entry(hk_grid, textvariable=self.hk_toggle_var, font=("Consolas", 10),
                 bg="#f8fafc", width=14).grid(row=0, column=1, sticky="e", pady=3)

        tk.Label(hk_grid, text="强制停止 热键:", bg="#ffffff", fg="#334155",
                 font=("Segoe UI", 9)).grid(row=1, column=0, sticky="w", pady=3)
        tk.Entry(hk_grid, textvariable=self.hk_stop_var, font=("Consolas", 10),
                 bg="#f8fafc", width=14).grid(row=1, column=1, sticky="e", pady=3)

        tk.Button(
            parent, text="应用热键设置", command=self._restart_hotkeys,
            bg="#f1f5f9", fg="#0f172a", relief="flat", font=("Segoe UI", 9), padx=10, pady=4, cursor="hand2"
        ).pack(anchor="e", padx=16, pady=(6, 12))

    def _build_log_and_sequence_panel(self, parent: tk.Frame):
        # 序列列表
        seq_header = tk.Frame(parent, bg="#ffffff")
        seq_header.pack(fill="x", padx=16, pady=(14, 4))
        tk.Label(seq_header, text="按键序列队列 (多键模式生效)", bg="#ffffff", fg="#0f172a",
                 font=("Segoe UI", 10, "bold")).pack(side="left")
        tk.Button(seq_header, text="清空序列", command=self.clear_sequence,
                  bg="#ffffff", fg="#64748b", relief="flat", font=("Segoe UI", 8), cursor="hand2").pack(side="right")

        self.seq_listbox = tk.Listbox(parent, height=5, bg="#f8fafc", fg="#0f172a",
                                      font=("Consolas", 9), relief="flat",
                                      highlightbackground="#e2e8f0", highlightthickness=1)
        self.seq_listbox.pack(fill="x", padx=16, pady=(0, 10))

        # 进度显示
        prog_frame = tk.Frame(parent, bg="#f8fafc", highlightbackground="#e2e8f0", highlightthickness=1)
        prog_frame.pack(fill="x", padx=16, pady=(0, 10))
        self.progress_label = tk.Label(prog_frame, text="已执行次数: 0  |  当前按键: -",
                                       bg="#f8fafc", fg="#334155", font=("Consolas", 9), pady=6)
        self.progress_label.pack(side="left", padx=10)

        # 日志记录
        log_header = tk.Frame(parent, bg="#ffffff")
        log_header.pack(fill="x", padx=16, pady=(4, 4))
        tk.Label(log_header, text="实时操作日志与调试历史", bg="#ffffff", fg="#0f172a",
                 font=("Segoe UI", 10, "bold")).pack(side="left")
        tk.Button(log_header, text="导出日志", command=self.export_logs,
                  bg="#f1f5f9", fg="#0f172a", relief="flat", font=("Segoe UI", 8), padx=8, pady=2, cursor="hand2").pack(side="right", padx=(4, 0))
        tk.Button(log_header, text="清空", command=self.clear_logs,
                  bg="#f1f5f9", fg="#64748b", relief="flat", font=("Segoe UI", 8), padx=8, pady=2, cursor="hand2").pack(side="right")

        self.log_text = scrolledtext.ScrolledText(
            parent, bg="#0f172a", fg="#e2e8f0", font=("Consolas", 9),
            relief="flat", padx=10, pady=8, state="disabled"
        )
        self.log_text.pack(fill="both", expand=True, padx=16, pady=(0, 14))
        self.log_text.tag_config("INFO", foreground="#93c5fd")
        self.log_text.tag_config("KEY", foreground="#4ade80")
        self.log_text.tag_config("HOTKEY", foreground="#fbbf24")
        self.log_text.tag_config("WARN", foreground="#f87171")

    def _apply_config_to_ui(self):
        self.mode_var.set(self.config.get("mode", "single"))
        self.primary_key_var.set(self.config.get("primary_key", "right"))
        self.interval_var.set(str(self.config.get("interval_ms", 3000)))
        self.hold_var.set(str(self.config.get("hold_duration_ms", 60)))
        self.jitter_var.set(str(self.config.get("jitter_ms", 0)))
        self.loop_var.set(str(self.config.get("loop_count", 20)))
        self.delay_var.set(str(self.config.get("start_delay_sec", 2)))
        hotkeys = self.config.get("hotkeys", {})
        self.hk_toggle_var.set(hotkeys.get("toggle_start_pause", "f8"))
        self.hk_stop_var.set(hotkeys.get("stop", "f9"))
        self._refresh_sequence_list()

    def _refresh_sequence_list(self):
        self.seq_listbox.delete(0, tk.END)
        for idx, item in enumerate(self.sequence, start=1):
            self.seq_listbox.insert(
                tk.END,
                f"{idx:02d}. 按键 [{item.get('key', 'right')}] x{item.get('repeat', 1)}  -> 等待 {item.get('delay_after_ms', 1000)} ms"
            )

    def select_primary_key(self, key_name: str):
        self.primary_key_var.set(key_name)
        self.log("INFO", f"已选择常用按键: {key_name}")

    def add_custom_key_to_sequence(self):
        key_name = self.primary_key_var.get().strip()
        if not key_name:
            return
        self.sequence.append({"key": key_name, "label": key_name, "repeat": 1, "delay_after_ms": 1000})
        self._refresh_sequence_list()
        self.log("INFO", f"已将自定义按键 [{key_name}] 添加至流程序列")

    def clear_sequence(self):
        self.sequence.clear()
        self._refresh_sequence_list()
        self.log("INFO", "已清空按键序列队列")

    def log(self, level: str, message: str):
        ts = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        line = f"[{ts}] [{level}] {message}\\n"

        def _append():
            self.log_text.configure(state="normal")
            self.log_text.insert(tk.END, line, level)
            self.log_text.see(tk.END)
            self.log_text.configure(state="disabled")

        self.root.after(0, _append)

    def clear_logs(self):
        self.log_text.configure(state="normal")
        self.log_text.delete("1.0", tk.END)
        self.log_text.configure(state="disabled")

    def export_logs(self):
        path = filedialog.asksaveasfilename(defaultextension=".log", initialfile="keypulse_log.log",
                                           filetypes=[("Log files", "*.log"), ("Text files", "*.txt")])
        if path:
            content = self.log_text.get("1.0", tk.END)
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            self.log("INFO", f"日志已导出至: {path}")

    def _resolve_pynput_key(self, key_str: str):
        k = key_str.strip().lower()
        if k in SPECIAL_KEY_MAP:
            return SPECIAL_KEY_MAP[k]
        if len(k) == 1:
            return k
        return k

    def _press_key_combo(self, key_expr: str, hold_ms: int):
        if not self.controller:
            return
        parts = [p.strip().lower() for p in key_expr.split("+") if p.strip()]
        keys = [self._resolve_pynput_key(p) for p in parts]
        for k in keys:
            self.controller.press(k)
        time.sleep(max(0.01, hold_ms / 1000.0))
        for k in reversed(keys):
            self.controller.release(k)

    def toggle_start_pause(self):
        if not self.is_running:
            self.start_task()
        else:
            if self.is_paused:
                self.is_paused = False
                self.pause_event.clear()
                self._update_status("运行中", "#dcfce7", "#15803d", "❚❚ 暂停任务")
                self.log("INFO", "任务已恢复运行")
            else:
                self.is_paused = True
                self.pause_event.set()
                self._update_status("已暂停", "#fef3c7", "#b45309", "▶ 继续任务")
                self.log("INFO", "任务已暂停")

    def start_task(self):
        if not PYNPUT_AVAILABLE:
            messagebox.showerror("缺少依赖", "请先安装 pynput:\\npip install pynput")
            return
        self.stop_event.clear()
        self.pause_event.clear()
        self.is_running = True
        self.is_paused = False
        self.current_cycle = 0
        self._update_status("运行中", "#dcfce7", "#15803d", "❚❚ 暂停任务")
        self.worker_thread = threading.Thread(target=self._run_loop, daemon=True)
        self.worker_thread.start()

    def stop_task(self):
        if not self.is_running:
            return
        self.stop_event.set()
        self.pause_event.clear()
        self.is_running = False
        self.is_paused = False
        self._update_status("已停止", "#f1f5f9", "#334155", "▶ 启动任务")
        self.log("INFO", f"自动化任务已停止，累计完成 {self.current_cycle} 轮")

    def _update_status(self, text: str, bg: str, fg: str, btn_text: str):
        def _ui():
            self.status_label.configure(text=f"状态: {text}", bg=bg, fg=fg)
            self.btn_start.configure(text=btn_text)
        self.root.after(0, _ui)

    def _run_loop(self):
        try:
            interval_ms = max(50, int(self.interval_var.get()))
            hold_ms = max(10, int(self.hold_var.get()))
            jitter_ms = max(0, int(self.jitter_var.get()))
            loop_count = max(0, int(self.loop_var.get()))
            delay_sec = max(0, float(self.delay_var.get()))
        except ValueError:
            self.log("WARN", "参数格式错误，请确认时间间隔与循环次数为有效数字")
            self.root.after(0, self.stop_task)
            return

        mode = self.mode_var.get()
        primary_key = self.primary_key_var.get().strip() or "right"

        if delay_sec > 0:
            self.log("INFO", f"{delay_sec} 秒后开始执行，请切换到目标窗口...")
            end_wait = time.time() + delay_sec
            while time.time() < end_wait:
                if self.stop_event.is_set():
                    return
                time.sleep(0.1)

        while not self.stop_event.is_set():
            while self.pause_event.is_set() and not self.stop_event.is_set():
                time.sleep(0.1)
            if self.stop_event.is_set():
                break

            if loop_count > 0 and self.current_cycle >= loop_count:
                self.log("INFO", f"已完成设定的 {loop_count} 次循环，任务自动结束")
                break

            self.current_cycle += 1
            if mode == "single":
                self._press_key_combo(primary_key, hold_ms)
                self.log("KEY", f"第 {self.current_cycle} 轮 -> 模拟按下 [{primary_key}] (按住 {hold_ms}ms)")
                self.root.after(0, lambda k=primary_key, c=self.current_cycle:
                                self.progress_label.configure(text=f"已执行次数: {c}  |  当前按键: {k}"))
            else:
                steps = self.sequence if self.sequence else [{"key": primary_key, "repeat": 1, "delay_after_ms": 500}]
                for step in steps:
                    if self.stop_event.is_set():
                        break
                    k = step.get("key", primary_key)
                    rep = int(step.get("repeat", 1))
                    for _ in range(rep):
                        if self.stop_event.is_set():
                            break
                        self._press_key_combo(k, hold_ms)
                        self.log("KEY", f"第 {self.current_cycle} 轮序列 -> 按下 [{k}]")
                        self.root.after(0, lambda key_n=k, c=self.current_cycle:
                                        self.progress_label.configure(text=f"已执行次数: {c}  |  当前按键: {key_n}"))
                        time.sleep(max(0.05, int(step.get("delay_after_ms", 500)) / 1000.0))

            actual_wait_ms = interval_ms + (random.randint(-jitter_ms, jitter_ms) if jitter_ms > 0 else 0)
            actual_wait_ms = max(50, actual_wait_ms)
            waited = 0.0
            step_slice = 0.05
            while waited < actual_wait_ms / 1000.0:
                if self.stop_event.is_set():
                    break
                if not self.pause_event.is_set():
                    waited += step_slice
                time.sleep(step_slice)

        self.is_running = False
        self._update_status("已就绪", "#f1f5f9", "#334155", "▶ 启动任务")

    def _format_hotkey(self, name: str) -> str:
        k = name.strip().lower()
        if not k.startswith("<") and len(k) > 1:
            return f"<{k}>"
        return k

    def _start_global_hotkeys(self):
        if not PYNPUT_AVAILABLE:
            return
        if self.hotkey_listener:
            self.hotkey_listener.stop()
        hk_toggle = self._format_hotkey(self.hk_toggle_var.get())
        hk_stop = self._format_hotkey(self.hk_stop_var.get())
        try:
            mapping = {
                hk_toggle: lambda: self._on_hotkey("TOGGLE"),
                hk_stop: lambda: self._on_hotkey("STOP"),
            }
            self.hotkey_listener = keyboard.GlobalHotKeys(mapping)
            self.hotkey_listener.start()
            self.log("HOTKEY", f"全局热键监听已启用: 启动/暂停={hk_toggle}, 停止={hk_stop}")
        except Exception as exc:
            self.log("WARN", f"热键注册失败: {exc}")

    def _restart_hotkeys(self):
        self._start_global_hotkeys()

    def _on_hotkey(self, action: str):
        self.log("HOTKEY", f"捕获全局热键动作: {action}")
        if action == "TOGGLE":
            self.root.after(0, self.toggle_start_pause)
        elif action == "STOP":
            self.root.after(0, self.stop_task)

    def _collect_config(self) -> dict:
        return {
            "profile_name": self.config.get("profile_name", "KeyPulse 配置"),
            "mode": self.mode_var.get(),
            "primary_key": self.primary_key_var.get().strip() or "right",
            "sequence": self.sequence,
            "interval_ms": int(self.interval_var.get() or 3000),
            "hold_duration_ms": int(self.hold_var.get() or 60),
            "jitter_ms": int(self.jitter_var.get() or 0),
            "loop_count": int(self.loop_var.get() or 0),
            "start_delay_sec": float(self.delay_var.get() or 2),
            "hotkeys": {
                "toggle_start_pause": self.hk_toggle_var.get().strip() or "f8",
                "stop": self.hk_stop_var.get().strip() or "f9",
            },
        }

    def export_config_json(self):
        path = filedialog.asksaveasfilename(defaultextension=".json", initialfile="automation_config.json",
                                           filetypes=[("JSON files", "*.json")])
        if path:
            cfg = self._collect_config()
            with open(path, "w", encoding="utf-8") as f:
                json.dump(cfg, f, ensure_ascii=False, indent=2)
            self.log("INFO", f"配置已导出: {path}")

    def import_config_json(self):
        path = filedialog.askopenfilename(filetypes=[("JSON files", "*.json")])
        if path:
            with open(path, "r", encoding="utf-8") as f:
                self.config = json.load(f)
            self.sequence = list(self.config.get("sequence", []))
            self._apply_config_to_ui()
            self._start_global_hotkeys()
            self.log("INFO", f"已加载配置文件: {os.path.basename(path)}")

    def export_standalone_script(self):
        path = filedialog.asksaveasfilename(defaultextension=".py", initialfile="auto_key_runner.py",
                                           filetypes=[("Python files", "*.py")])
        if not path:
            return
        cfg = self._collect_config()
        script = f"""#!/usr/bin/env python3
import time, random
from pynput.keyboard import Controller, Key, GlobalHotKeys

# 自动生成的 KeyPulse 轻量自动化脚本
KEY_NAME = {repr(cfg['primary_key'])}
INTERVAL_MS = {cfg['interval_ms']}
HOLD_MS = {cfg['hold_duration_ms']}
LOOP_COUNT = {cfg['loop_count']}
"""
        with open(path, "w", encoding="utf-8") as f:
            f.write(script)
        self.log("INFO", f"已导出独立运行脚本: {path}")


if __name__ == "__main__":
    app_root = tk.Tk()
    app = KeyPulseApp(app_root)
    app_root.mainloop()
`;
}

export function generateStandaloneRunnerScript(config: AutomationConfig): string {
  const profileName = escapePyString(config.profileName);
  const toggleHk = `<${config.hotkeys.toggleStartPause.toLowerCase()}>`;
  const stopHk = `<${config.hotkeys.stop.toLowerCase()}>`;
  const seqJson = JSON.stringify(
    config.sequence.map((s) => ({
      key: s.pythonKey,
      repeat: s.repeat,
      delay_after_ms: s.delayAfterMs,
    })),
    null,
    4
  );

  return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KeyPulse 轻量级后台自动化执行脚本
方案名称: ${profileName}
热键说明: ${config.hotkeys.toggleStartPause} 启动/暂停 | ${config.hotkeys.stop} 停止退出

安装依赖: pip install pynput
"""

import random
import threading
import time
from datetime import datetime
from pynput.keyboard import Controller, GlobalHotKeys, Key

MODE = "${config.mode}"
PRIMARY_KEY = "${escapePyString(config.primaryKey.pythonKey)}"
SEQUENCE = ${seqJson}
INTERVAL_MS = ${config.intervalMs}
HOLD_MS = ${config.holdDurationMs}
JITTER_MS = ${config.jitterMs}
LOOP_COUNT = ${config.loopCount}  # 0 表示无限循环
START_DELAY_SEC = ${config.startDelaySec}

SPECIAL_KEYS = {
    "right": Key.right,
    "left": Key.left,
    "up": Key.up,
    "down": Key.down,
    "space": Key.space,
    "enter": Key.enter,
    "tab": Key.tab,
    "esc": Key.esc,
    "page_down": Key.page_down,
    "page_up": Key.page_up,
    "f5": Key.f5,
}

kb = Controller()
running_flag = threading.Event()
exit_flag = threading.Event()


def log(msg: str):
    now = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[{now}] {msg}")


def press_key(key_expr: str):
    parts = [p.strip().lower() for p in key_expr.split("+") if p.strip()]
    resolved = [SPECIAL_KEYS.get(p, p) for p in parts]
    for k in resolved:
        kb.press(k)
    time.sleep(max(0.01, HOLD_MS / 1000.0))
    for k in reversed(resolved):
        kb.release(k)


def toggle_run():
    if running_flag.is_set():
        running_flag.clear()
        log("热键触发 -> 已暂停")
    else:
        running_flag.set()
        log("热键触发 -> 开始执行")


def stop_all():
    running_flag.clear()
    exit_flag.set()
    log("热键触发 -> 停止脚本")


def worker():
    if START_DELAY_SEC > 0:
        log(f"等待 {START_DELAY_SEC} 秒后进入监听状态...")
        time.sleep(START_DELAY_SEC)

    cycle = 0
    while not exit_flag.is_set():
        if not running_flag.is_set():
            time.sleep(0.1)
            continue

        if LOOP_COUNT > 0 and cycle >= LOOP_COUNT:
            log(f"已完成 {LOOP_COUNT} 次循环，自动停止")
            running_flag.clear()
            cycle = 0
            continue

        cycle += 1
        if MODE == "single":
            press_key(PRIMARY_KEY)
            log(f"第 {cycle} 次 -> 按下 [{PRIMARY_KEY}]")
        else:
            for step in SEQUENCE:
                if not running_flag.is_set() or exit_flag.is_set():
                    break
                for _ in range(step["repeat"]):
                    press_key(step["key"])
                    log(f"第 {cycle} 轮序列 -> 按下 [{step['key']}]")
                    time.sleep(step["delay_after_ms"] / 1000.0)

        wait_ms = INTERVAL_MS + (random.randint(-JITTER_MS, JITTER_MS) if JITTER_MS > 0 else 0)
        time.sleep(max(0.05, wait_ms / 1000.0))


if __name__ == "__main__":
    log("KeyPulse 脚本已启动，按 ${config.hotkeys.toggleStartPause} 开始/暂停，按 ${config.hotkeys.stop} 退出")
    threading.Thread(target=worker, daemon=True).start()
    with GlobalHotKeys({"${toggleHk}": toggle_run, "${stopHk}": stop_all}) as listener:
        while not exit_flag.is_set():
            time.sleep(0.2)
        listener.stop()
`;
}
