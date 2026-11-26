import React, { useMemo, useRef, useState } from 'react';
import { Check, Code2, Copy, Download, FileJson, Upload } from 'lucide-react';
import { AutomationConfig } from '../types/automation';
import {
  generateConfigJson,
  generatePythonGuiScript,
  generateStandaloneRunnerScript,
} from '../utils/pythonGenerator';

interface PythonExportViewProps {
  config: AutomationConfig;
  onImportConfig: (rawJson: string) => void;
  onAddLog: (level: 'info' | 'key' | 'hotkey' | 'warn', source: string, message: string) => void;
}

type ExportArtifact = 'gui' | 'runner' | 'json';

export const PythonExportView: React.FC<PythonExportViewProps> = ({
  config,
  onImportConfig,
  onAddLog,
}) => {
  const [artifact, setArtifact] = useState<ExportArtifact>('gui');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const codeContent = useMemo(() => {
    if (artifact === 'gui') return generatePythonGuiScript(config);
    if (artifact === 'runner') return generateStandaloneRunnerScript(config);
    return generateConfigJson(config);
  }, [artifact, config]);

  const filenameMap: Record<ExportArtifact, string> = {
    gui: 'keypulse_gui.py',
    runner: 'auto_key_runner.py',
    json: 'automation_config.json',
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeContent);
      setCopied(true);
      onAddLog('info', '脚本导出', `已复制 ${filenameMap[artifact]} 到剪贴板`);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      onAddLog('warn', '脚本导出', '剪贴板复制失败，请使用下载按钮');
    }
  };

  const handleDownload = (target: ExportArtifact = artifact) => {
    const content =
      target === 'gui'
        ? generatePythonGuiScript(config)
        : target === 'runner'
          ? generateStandaloneRunnerScript(config)
          : generateConfigJson(config);
    const mime = target === 'json' ? 'application/json;charset=utf-8' : 'text/x-python;charset=utf-8';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filenameMap[target];
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onAddLog('info', '脚本导出', `已下载文件 ${filenameMap[target]}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportConfig(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* 导出控制面板 */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              导出 Python GUI 桌面应用与配置脚本
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              导出的 Python 程序已内嵌你当前配置的所有按键（默认方向右键）、时间间隔、循环次数、热键和日志功能，可在 Windows / macOS / Linux 本地直接运行。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>导入 JSON 配置</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownload('json')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <FileJson className="w-3.5 h-3.5" aria-hidden="true" />
              <span>下载配置 (.json)</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownload('gui')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>下载完整 Python GUI (.py)</span>
            </button>
          </div>
        </div>

        {/* 本地运行步骤 */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div>
            <div className="text-xs font-semibold text-slate-900">01. 安装键盘模拟库</div>
            <div className="mt-1 font-mono text-xs text-slate-600 bg-white border border-slate-200 rounded px-2.5 py-1.5 select-all">
              pip install pynput
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-900">02. 启动图形界面</div>
            <div className="mt-1 font-mono text-xs text-slate-600 bg-white border border-slate-200 rounded px-2.5 py-1.5 select-all">
              python keypulse_gui.py
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-900">03. 热键全局控制</div>
            <div className="mt-1 text-xs text-slate-600 leading-relaxed">
              切回视频或任务窗口后，按 <span className="font-mono font-semibold text-slate-900">{config.hotkeys.toggleStartPause}</span> 启动/暂停，按 <span className="font-mono font-semibold text-slate-900">{config.hotkeys.stop}</span> 停止。
            </div>
          </div>
        </div>

        {/* 文件切换栏 */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setArtifact('gui')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                artifact === 'gui' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>keypulse_gui.py (桌面界面)</span>
            </button>
            <button
              type="button"
              onClick={() => setArtifact('runner')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                artifact === 'runner' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>auto_key_runner.py (轻量脚本)</span>
            </button>
            <button
              type="button"
              onClick={() => setArtifact('json')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                artifact === 'json' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" aria-hidden="true" />
              <span>automation_config.json</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制' : '复制代码'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownload(artifact)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载 {filenameMap[artifact]}</span>
            </button>
          </div>
        </div>

        {/* 代码视图 */}
        <div className="mt-3 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>{filenameMap[artifact]}</span>
            <span className="tabular-nums">{codeContent.split('\n').length} 行</span>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed">
            <code>{codeContent}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
