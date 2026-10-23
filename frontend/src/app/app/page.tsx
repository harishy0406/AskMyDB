'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Send, Upload, Database, MessageSquare, Table2, BarChart3,
  Eye, EyeOff, ChevronDown, ChevronRight, FileText, Plus,
  Trash2, Loader2, AlertCircle, CheckCircle2, History,
  X, Bot, User, Maximize2, Minimize2, Download,
  Layers, Search, Copy, Check, Sparkles, ArrowUpRight,
  Code, HelpCircle, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft,
  TrendingUp, Activity, PieChart as PieChartIcon,
  Play, Terminal, RotateCcw, ArrowRight, Camera, Palette,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { uploadFile, sendChat, createSession, getSession, deleteSession, connectDatabase, getSchema, executeSql, getTableProfile } from '@/lib/api';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  columns?: string[];
  rows?: any[][];
  chartData?: any;
};

type SourceInfo = {
  type: 'file' | 'database' | null;
  name: string;
  tableName: string;
  columns: string[];
  rowCount: number;
};

const COLOR_THEMES: Record<string, { name: string; colors: string[] }> = {
  indigo: {
    name: 'Electric',
    colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#6366f1'],
  },
  cyber: {
    name: 'Cyberpunk',
    colors: ['#06b6d4', '#10b981', '#f43f5e', '#a855f7', '#eab308', '#3b82f6', '#14b8a6'],
  },
  emerald: {
    name: 'Emerald',
    colors: ['#10b981', '#059669', '#34d399', '#6ee7b7', '#14b8a6', '#0d9488', '#047857'],
  },
  sunset: {
    name: 'Sunset',
    colors: ['#f97316', '#ef4444', '#ec4899', '#f59e0b', '#e11d48', '#8b5cf6', '#d97706'],
  },
};

function InteractiveChart({ chartData }: { chartData: any }) {
  const initialType = chartData.suggested_type || chartData.type || 'bar';
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'pie'>(initialType);
  const [selectedTheme, setSelectedTheme] = useState<string>('indigo');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const palette = COLOR_THEMES[selectedTheme]?.colors || COLOR_THEMES.indigo.colors;
  const canPie = Boolean(chartData.can_pie || (chartData.lines?.length === 1 && chartData.data?.length <= 10));

  const availableTypes: { id: 'bar' | 'line' | 'area' | 'pie'; label: string; icon: any }[] = [
    { id: 'bar', label: 'Bar', icon: BarChart3 },
    { id: 'line', label: 'Line', icon: TrendingUp },
    { id: 'area', label: 'Area', icon: Activity },
  ];
  if (canPie) {
    availableTypes.push({ id: 'pie', label: 'Pie', icon: PieChartIcon });
  }

  const currentType = availableTypes.some((t) => t.id === chartType) ? chartType : 'bar';

  const handleExportPng = () => {
    if (!chartContainerRef.current) return;
    setIsExporting(true);

    try {
      const svgElement = chartContainerRef.current.querySelector('svg');
      if (!svgElement) {
        setIsExporting(false);
        return;
      }

      const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      const svgString = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const width = (svgElement.clientWidth || 640) * 2;
        const height = (svgElement.clientHeight || 280) * 2;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(image, 0, 0, width, height);

          const pngUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = `chart_${currentType}_${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        URL.revokeObjectURL(blobURL);
        setIsExporting(false);
      };

      image.onerror = () => {
        URL.revokeObjectURL(blobURL);
        setIsExporting(false);
      };

      image.src = blobURL;
    } catch (e) {
      console.error('Failed to export chart image', e);
      setIsExporting(false);
    }
  };

  return (
    <div className="mt-3 glass rounded-xl p-4 border border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-xs text-gray-300 font-medium">
          <BarChart3 size={14} className="text-blue-400" />
          <span>Data Visualization</span>
          <span className="text-[10px] bg-white/10 text-gray-400 px-2 py-0.5 rounded-full font-mono">
            {chartData.data?.length || 0} points
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Palette selector */}
          <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-white/10">
            <Palette size={11} className="text-gray-400" />
            <select
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
              className="bg-transparent text-[11px] text-gray-300 focus:outline-none cursor-pointer"
              title="Change chart color palette"
            >
              {Object.entries(COLOR_THEMES).map(([k, v]) => (
                <option key={k} value={k} className="bg-slate-900 text-gray-200">
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Export PNG */}
          <button
            onClick={handleExportPng}
            disabled={isExporting}
            className="flex items-center gap-1 text-[11px] text-gray-300 hover:text-white bg-black/40 hover:bg-white/10 border border-white/10 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
            title="Download chart as PNG image"
          >
            {isExporting ? <Loader2 size={11} className="animate-spin text-blue-400" /> : <Camera size={11} className="text-blue-400" />}
            <span>Export PNG</span>
          </button>

          {/* Chart Type Selector */}
          <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/10 gap-0.5">
            {availableTypes.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setChartType(tab.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                  title={`Switch to ${tab.label} chart`}
                >
                  <Icon size={12} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div ref={chartContainerRef} className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {currentType === 'bar' ? (
            <BarChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey={chartData.x_key} stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,15,30,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              {chartData.lines?.map((line: string, li: number) => (
                <Bar
                  key={li}
                  dataKey={line}
                  fill={palette[li % palette.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          ) : currentType === 'line' ? (
            <LineChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey={chartData.x_key} stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,15,30,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              {chartData.lines?.map((line: string, li: number) => (
                <Line
                  key={li}
                  type="monotone"
                  dataKey={line}
                  stroke={palette[li % palette.length]}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: palette[li % palette.length] }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          ) : currentType === 'area' ? (
            <AreaChart data={chartData.data}>
              <defs>
                {chartData.lines?.map((line: string, li: number) => (
                  <linearGradient key={li} id={`areaGrad-${li}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={palette[li % palette.length]} stopOpacity={0.6} />
                    <stop offset="95%" stopColor={palette[li % palette.length]} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey={chartData.x_key} stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,15,30,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              {chartData.lines?.map((line: string, li: number) => (
                <Area
                  key={li}
                  type="monotone"
                  dataKey={line}
                  stroke={palette[li % palette.length]}
                  fillOpacity={1}
                  fill={`url(#areaGrad-${li})`}
                />
              ))}
            </AreaChart>
          ) : (
            <PieChart>
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,15,30,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Pie
                data={chartData.data}
                dataKey={chartData.lines?.[0] || 'value'}
                nameKey={chartData.x_key || 'name'}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
              >
                {chartData.data?.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function QueryResultTable({
  columns,
  rows,
  messageIndex,
  onDownloadCsv,
}: {
  columns: string[];
  rows: any[][];
  messageIndex: number;
  onDownloadCsv?: (columns: string[], rows: any[][], index: number) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedMd, setCopiedMd] = useState<boolean>(false);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Filter rows
  const filteredRows = rows.filter((row) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return row.some((cell) => cell !== null && cell !== undefined && String(cell).toLowerCase().includes(term));
  });

  // Sort rows
  const sortedRows = [...filteredRows].sort((a, b) => {
    if (sortCol === null) return 0;
    const valA = a[sortCol];
    const valB = b[sortCol];
    if (valA === valB) return 0;
    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;
    
    // Numeric sort
    const numA = Number(valA);
    const numB = Number(valB);
    if (!isNaN(numA) && !isNaN(numB)) {
      return sortAsc ? numA - numB : numB - numA;
    }
    // String sort
    return sortAsc
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const paginatedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  function handleSort(colIdx: number) {
    if (sortCol === colIdx) {
      if (sortAsc) {
        setSortAsc(false);
      } else {
        setSortCol(null);
        setSortAsc(true);
      }
    } else {
      setSortCol(colIdx);
      setSortAsc(true);
    }
    setCurrentPage(1);
  }

  function handleExportCsv() {
    if (onDownloadCsv) {
      onDownloadCsv(columns, filteredRows, messageIndex);
      return;
    }
    const csvContent = [
      columns.join(','),
      ...filteredRows.map((row) => row.map((cell) => JSON.stringify(cell ?? '')).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `query_result_${messageIndex + 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleExportJson() {
    const records = filteredRows.map((row) => {
      const obj: Record<string, any> = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `query_result_${messageIndex + 1}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleExportMarkdown() {
    const header = `| ${columns.join(' | ')} |`;
    const divider = `| ${columns.map(() => '---').join(' | ')} |`;
    const body = filteredRows
      .map(
        (row) =>
          `| ${row.map((c) => (c !== null && c !== undefined ? String(c).replace(/\|/g, '\\|') : '')).join(' | ')} |`
      )
      .join('\n');
    const mdContent = `${header}\n${divider}\n${body}\n`;
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `query_result_${messageIndex + 1}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleCopyMarkdown() {
    const header = `| ${columns.join(' | ')} |`;
    const divider = `| ${columns.map(() => '---').join(' | ')} |`;
    const body = filteredRows
      .map(
        (row) =>
          `| ${row.map((c) => (c !== null && c !== undefined ? String(c).replace(/\|/g, '\\|') : '')).join(' | ')} |`
      )
      .join('\n');
    navigator.clipboard.writeText(`${header}\n${divider}\n${body}\n`);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  }

  const tableHeaderControls = (isModal: boolean) => (
    <div className="bg-white/5 px-3 py-2 border-b border-white/10 flex flex-wrap justify-between items-center gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-300 font-medium flex items-center gap-1.5">
          <Table2 size={13} className="text-blue-400" /> {isModal ? 'Expanded Table View' : 'Results'}
        </span>
        <span className="text-[10px] bg-white/10 text-gray-400 px-2 py-0.5 rounded-full font-mono">
          {filteredRows.length === rows.length
            ? `${rows.length} rows`
            : `${filteredRows.length} / ${rows.length} filtered`}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {rows.length > 5 && (
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-2 text-gray-500" />
            <input
              type="text"
              placeholder="Search rows..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-black/30 border border-white/10 rounded-lg pl-7 pr-2 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 w-32 sm:w-44"
            />
          </div>
        )}

        {/* Multi-Format Export Options */}
        <div className="flex items-center bg-black/30 rounded-lg p-0.5 border border-white/10 gap-0.5">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors hover:bg-white/10 px-2 py-0.5 rounded"
            title="Download CSV"
          >
            <Download size={11} /> CSV
          </button>
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition-colors hover:bg-white/10 px-2 py-0.5 rounded"
            title="Download JSON"
          >
            JSON
          </button>
          <button
            onClick={handleExportMarkdown}
            className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors hover:bg-white/10 px-2 py-0.5 rounded"
            title="Download Markdown Table"
          >
            MD
          </button>
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white transition-colors hover:bg-white/10 px-1.5 py-0.5 rounded"
            title="Copy Markdown Table to Clipboard"
          >
            {copiedMd ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
          </button>
        </div>

        {/* Fullscreen Toggle */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors border border-white/5"
          title={isModal ? 'Close Fullscreen (Esc)' : 'Expand to Fullscreen'}
        >
          {isModal ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>
    </div>
  );

  const tableBody = (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-white/10 bg-white/[0.02] sticky top-0 backdrop-blur-sm z-10">
          {columns.map((col, ci) => (
            <th
              key={ci}
              onClick={() => handleSort(ci)}
              className="px-3 py-2 text-left text-gray-300 font-semibold whitespace-nowrap cursor-pointer hover:bg-white/5 select-none transition-colors"
              title="Click to sort"
            >
              <div className="flex items-center gap-1">
                <span>{col}</span>
                {sortCol === ci ? (
                  sortAsc ? (
                    <ArrowUp size={11} className="text-blue-400" />
                  ) : (
                    <ArrowDown size={11} className="text-blue-400" />
                  )
                ) : (
                  <ArrowUpDown size={10} className="text-gray-600 hover:text-gray-400" />
                )}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {paginatedRows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="text-center py-6 text-gray-500 text-xs">
              No matching records found.
            </td>
          </tr>
        ) : (
          paginatedRows.map((row, ri) => (
            <tr key={ri} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              {row.map((cell: any, ci: number) => (
                <td key={ci} className="px-3 py-1.5 text-gray-300 whitespace-nowrap font-mono text-[11px]">
                  {cell !== null && cell !== undefined ? String(cell) : <span className="text-gray-600">—</span>}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  const tableFooter = (
    <div className="bg-white/[0.02] px-3 py-2 border-t border-white/5 flex flex-wrap justify-between items-center text-xs text-gray-400 gap-2">
      <div className="flex items-center gap-1">
        <span>Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs text-gray-300 focus:outline-none"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Previous page"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Next page"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="mt-3 glass rounded-xl overflow-hidden border border-white/10">
        {tableHeaderControls(false)}
        <div className="max-h-80 overflow-auto">{tableBody}</div>
        {(sortedRows.length > 10 || pageSize !== 10) && tableFooter}
      </div>

      {/* Fullscreen Modal View */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#0b1120] border border-white/20 rounded-2xl flex flex-col w-full max-w-6xl h-[90vh] shadow-2xl overflow-hidden">
            {tableHeaderControls(true)}
            <div className="flex-1 overflow-auto p-1">{tableBody}</div>
            {tableFooter}
          </div>
        </div>
      )}
    </>
  );
}

export default function AppPage() {
  const [sessionId, setSessionId] = useState<string>('');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<SourceInfo | null>(null);
  const [showSql, setShowSql] = useState<Record<number, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dbConnStr, setDbConnStr] = useState('');
  const [showDbInput, setShowDbInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ question: string; sql: string }[]>([]);
  const [copiedHistoryIdx, setCopiedHistoryIdx] = useState<number | null>(null);
  const [copiedSqlIdx, setCopiedSqlIdx] = useState<number | null>(null);
  const [schemaData, setSchemaData] = useState<Record<string, { columns: { name: string; type: string }[] }> | null>(null);
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
  const [schemaSearch, setSchemaSearch] = useState('');
  const [editingSqlIdx, setEditingSqlIdx] = useState<number | null>(null);
  const [sqlDraft, setSqlDraft] = useState<string>('');
  const [isExecutingSql, setIsExecutingSql] = useState<boolean>(false);
  const [sqlExecError, setSqlExecError] = useState<string | null>(null);
  const [profileTable, setProfileTable] = useState<string | null>(null);
  const [tableProfileData, setTableProfileData] = useState<any | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initSession();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function initSession() {
    try {
      const sid = await createSession();
      setSessionId(sid);
    } catch {
      setError('Could not connect to backend. Make sure the server is running.');
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length || !sessionId) return;
    const file = acceptedFiles[0];
    setUploading(true);
    setError(null);
    try {
      const result = await uploadFile(file, sessionId);
      setSessionId(result.session_id);
      setSource({
        type: 'file',
        name: file.name,
        tableName: result.table_name,
        columns: result.columns,
        rowCount: result.row_count,
      });
      try {
        const schema = await getSchema(result.session_id);
        setSchemaData(schema);
        if (schema && result.table_name) {
          setExpandedTables({ [result.table_name]: true });
        }
      } catch (e) {
        console.error('Failed to load schema', e);
      }
      setMessages([{
        role: 'assistant',
        content: `✅ Loaded **${file.name}** (${result.row_count.toLocaleString()} rows, ${result.columns.length} columns). Ask me anything about this data!`,
      }]);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [sessionId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/x-sqlite3': ['.db', '.sqlite', '.sqlite3'],
    },
    maxFiles: 1,
  });

  async function executeQuestion(questionText: string) {
    if (!questionText.trim() || loading || !sessionId) return;
    const question = questionText.trim();
    setInput('');
    setError(null);

    const userMsg: Message = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const convHistory = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    try {
      const result = await sendChat(sessionId, question, convHistory);
      const idx = messages.length + 1;
      const assistantMsg: Message = {
        role: 'assistant',
        content: result.reply || `Query returned ${result.rows?.length || 0} row(s).`,
        sql: result.sql_query,
        columns: result.columns,
        rows: result.rows,
        chartData: result.chart_data,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setShowSql((prev) => ({ ...prev, [idx]: true }));

      if (result.sql_query) {
        setHistory((prev) => [...prev, { question, sql: result.sql_query }]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err.message || 'Something went wrong'}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    await executeQuestion(input);
  }

  function copyHistorySql(sql: string, idx: number, e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(sql);
    setCopiedHistoryIdx(idx);
    setTimeout(() => setCopiedHistoryIdx(null), 2000);
  }

  function copyMessageSql(sql: string, idx: number) {
    navigator.clipboard.writeText(sql);
    setCopiedSqlIdx(idx);
    setTimeout(() => setCopiedSqlIdx(null), 2000);
  }

  async function handleRunEditedSql(idx: number) {
    if (!sessionId || !sqlDraft.trim()) return;
    setIsExecutingSql(true);
    setSqlExecError(null);
    try {
      const res = await executeSql(sessionId, sqlDraft.trim());
      if (res.error) {
        setSqlExecError(res.error);
        return;
      }
      setMessages((prev) => {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          content: res.reply || `Direct query executed successfully (${res.rows?.length || 0} rows).`,
          sql: res.sql_query,
          columns: res.columns,
          rows: res.rows,
          chartData: res.chart_data,
        };
        return next;
      });
      setEditingSqlIdx(null);
      if (res.sql_query) {
        setHistory((prev) => [...prev, { question: `Direct SQL: ${res.sql_query.slice(0, 40)}...`, sql: res.sql_query }]);
      }
    } catch (err: any) {
      setSqlExecError(err.message || 'Execution failed');
    } finally {
      setIsExecutingSql(false);
    }
  }

  async function openTableProfile(tableName: string) {
    if (!sessionId) return;
    setProfileTable(tableName);
    setIsProfileLoading(true);
    setProfileError(null);
    try {
      const data = await getTableProfile(sessionId, tableName);
      setTableProfileData(data);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to generate profile');
    } finally {
      setIsProfileLoading(false);
    }
  }

  function closeTableProfile() {
    setProfileTable(null);
    setTableProfileData(null);
    setProfileError(null);
  }



  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleNewChat() {
    if (sessionId) {
      try {
        await deleteSession(sessionId);
      } catch (e) {
        console.error('Failed to clean up old session', e);
      }
    }
    await initSession();
    setMessages([]);
    setSource(null);
    setHistory([]);
    setSchemaData(null);
    setExpandedTables({});
    setSchemaSearch('');
    setError(null);
  }

  async function handleConnectDb() {
    if (!dbConnStr.trim()) {
      setError('Please enter a connection string.');
      return;
    }
    const lower = dbConnStr.toLowerCase();
    if (!lower.startsWith('postgresql') && !lower.startsWith('mysql') && !lower.startsWith('sqlite')) {
      setError('Only postgresql://, mysql://, or sqlite:/// connections are supported.');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const result = await connectDatabase(sessionId, dbConnStr);
      setSessionId(result.session_id);
      const tableList = result.tables || [];
      setSource({
        type: 'database',
        name: dbConnStr.includes('@') ? dbConnStr.split('@')[1] : dbConnStr.split('/').pop() || 'Database',
        tableName: tableList.length > 0 ? tableList.join(', ') : 'No tables found',
        columns: [],
        rowCount: 0,
      });

      try {
        const schema = await getSchema(result.session_id);
        setSchemaData(schema);
        if (schema && tableList.length > 0) {
          setExpandedTables({ [tableList[0]]: true });
        }
      } catch (e) {
        console.error('Failed to load schema', e);
      }

      setMessages([{
        role: 'assistant',
        content: `✅ Connected to database (${tableList.length} table(s): ${tableList.join(', ')}). Ask me anything about this data!`,
      }]);
      setShowDbInput(false);
    } catch (err: any) {
      setError(err.message || 'Connection failed.');
    } finally {
      setLoading(false);
    }
  }

  function toggleTable(tableName: string) {
    setExpandedTables((prev) => ({ ...prev, [tableName]: !prev[tableName] }));
  }

  function insertIntoInput(token: string) {
    setInput((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${token}` : token;
    });
  }


  function toggleSql(idx: number) {
    setShowSql((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  function downloadCsv(columns: string[], rows: any[][], index: number) {
    const csvContent = [
      columns.join(','),
      ...rows.map(row => row.map(cell => JSON.stringify(cell ?? '')).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `query_result_${index}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="h-screen bg-[#0a0a1a] flex overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-72' : 'w-0'
        } transition-all duration-300 glass border-r border-white/10 flex flex-col overflow-hidden flex-shrink-0`}
        style={{ backdropFilter: 'blur(20px)' }}
      >
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <Database size={16} className="text-white" />
              </div>
              <span className="font-bold text-white font-['Space_Grotesk']">AskMyDB</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-white/10 hover:border-blue-500/50 hover:bg-white/5'
            }`}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-blue-400" />
                <span className="text-xs text-gray-400">Uploading...</span>
              </div>
            ) : (
              <>
                <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                <p className="text-xs text-gray-400">
                  Drop CSV, Excel, or SQLite files here
                </p>
              </>
            )}
          </div>

          {!showDbInput ? (
            <button
              onClick={() => setShowDbInput(true)}
              className="w-full mt-2 text-xs text-blue-400 hover:text-blue-300 py-2 transition-colors"
            >
              + Connect Database
            </button>
          ) : (
            <div className="mt-2">
              <input
                type="text"
                placeholder="postgresql://..., mysql://..., or sqlite:///..."
                value={dbConnStr}
                onChange={(e) => setDbConnStr(e.target.value)}
                className="glass-input w-full rounded-lg px-3 py-2 text-xs mb-2"
              />
              <button onClick={handleConnectDb} className="btn-primary text-xs py-1.5 px-3 w-full">
                Connect
              </button>
            </div>
          )}
        </div>

        {/* Source Info */}
        {source && (
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={14} className="text-blue-400" />
              <span className="text-xs font-semibold text-gray-300 truncate">{source.name}</span>
            </div>
            <div className="text-xs text-gray-500 space-y-0.5">
              <div>Table: <span className="text-gray-300">{source.tableName}</span></div>
              {source.rowCount > 0 && (
                <div>Rows: <span className="text-gray-300">{source.rowCount.toLocaleString()}</span></div>
              )}
              {source.columns.length > 0 && (
                <div>Columns: <span className="text-gray-300">{source.columns.join(', ')}</span></div>
              )}
            </div>
          </div>
        )}

        {/* Schema Explorer */}
        {schemaData && Object.keys(schemaData).length > 0 && (
          <div className="border-b border-white/10 px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
                <Layers size={13} className="text-blue-400" />
                <span>Schema Explorer</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full font-mono">
                  {Object.keys(schemaData).length}
                </span>
              </div>
            </div>

            {Object.keys(schemaData).length > 2 && (
              <div className="relative mb-2">
                <Search size={11} className="absolute left-2.5 top-2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filter tables..."
                  value={schemaSearch}
                  onChange={(e) => setSchemaSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-2 py-1 text-[11px] text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>
            )}

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {Object.entries(schemaData)
                .filter(([tbl]) => !schemaSearch || tbl.toLowerCase().includes(schemaSearch.toLowerCase()))
                .map(([tableName, tableInfo]) => {
                  const isExpanded = !!expandedTables[tableName];
                  return (
                    <div key={tableName} className="rounded-lg bg-white/[0.03] border border-white/5 overflow-hidden">
                      <div
                        onClick={() => toggleTable(tableName)}
                        className="px-2.5 py-1.5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors select-none"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isExpanded ? (
                            <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight size={12} className="text-gray-400 flex-shrink-0" />
                          )}
                          <span
                            className="text-xs font-medium text-gray-200 truncate hover:text-blue-400"
                            title="Click table name to insert into chat"
                            onClick={(e) => {
                              e.stopPropagation();
                              insertIntoInput(tableName);
                            }}
                          >
                            {tableName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openTableProfile(tableName);
                            }}
                            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-blue-300 transition-colors"
                            title="View Table Insights & Profile"
                          >
                            <Sparkles size={11} className="text-blue-400" />
                          </button>
                          <span className="text-[10px] text-gray-500 flex-shrink-0 font-mono">
                            {tableInfo.columns.length} cols
                          </span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-2.5 py-1.5 bg-black/20 border-t border-white/5 space-y-1">
                          {tableInfo.columns.map((col, ci) => (
                            <div
                              key={ci}
                              onClick={() => insertIntoInput(col.name)}
                              className="flex items-center justify-between text-[11px] py-0.5 px-1.5 rounded hover:bg-white/5 cursor-pointer text-gray-400 hover:text-white transition-colors group"
                              title={`Click to insert "${col.name}" into chat`}
                            >
                              <span className="truncate group-hover:text-blue-300 font-mono">{col.name}</span>
                              <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-white/5 text-gray-500 font-mono">
                                {col.type.split('(')[0] || 'ANY'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}


        {/* History */}
        {history.length > 0 && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
              <div className="flex items-center gap-1.5">
                <History size={12} />
                <span>Query History</span>
                <span className="text-[10px] bg-white/5 text-gray-400 px-1.5 py-0.5 rounded-full font-mono">
                  {history.length}
                </span>
              </div>
              <button
                onClick={() => setHistory([])}
                className="text-[10px] text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1"
                title="Clear query history"
              >
                <Trash2 size={10} /> Clear
              </button>
            </div>
            <div className="space-y-2">
              {history.map((h, i) => (
                <div
                  key={i}
                  onClick={() => setInput(h.question)}
                  className="glass rounded-lg p-2.5 cursor-pointer hover:bg-white/5 transition-all group relative border border-white/5 hover:border-blue-500/30"
                  title="Click to load into input"
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-xs text-gray-300 font-medium line-clamp-2 group-hover:text-blue-300 transition-colors">
                      {h.question}
                    </p>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={(e) => copyHistorySql(h.sql, i, e)}
                        className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Copy SQL query"
                      >
                        {copiedHistoryIdx === i ? (
                          <Check size={11} className="text-green-400" />
                        ) : (
                          <Copy size={11} />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          executeQuestion(h.question);
                        }}
                        className="p-1 rounded hover:bg-blue-600/30 text-blue-400 hover:text-blue-200 transition-colors"
                        title="Re-run query"
                      >
                        <ArrowUpRight size={11} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 truncate font-mono bg-black/20 px-1.5 py-0.5 rounded">
                    {h.sql}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Chat */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 justify-center text-sm text-gray-400 hover:text-white py-2 rounded-lg hover:bg-white/5 transition-all"
          >
            <Plus size={16} /> New Chat
          </button>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="glass px-4 py-3 flex items-center justify-between" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-blue-400" />
              <span className="text-sm font-medium text-white">
                {source ? `Chatting with ${source.name}` : 'AskMyDB'}
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-lg">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-600/20 border border-blue-500/20 flex items-center justify-center shadow-lg shadow-blue-500/10">
                  <Database size={32} className="text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-white font-['Space_Grotesk'] mb-2">
                  Ask your data anything
                </h2>
                <p className="text-sm text-gray-400 mb-6">
                  {source
                    ? `Connected to ${source.name}. Click a suggested query below or type your question in natural language.`
                    : "Upload a file or connect a database from the sidebar to start asking questions."}
                </p>

                <div className="text-left mb-3 flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                  <Sparkles size={13} className="text-blue-400" />
                  <span>Suggested Questions</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                  {[
                    {
                      label: "Show all records",
                      query: source?.tableName && !source.tableName.includes(',')
                        ? `Show me the first 20 records from ${source.tableName}`
                        : "Show me the first 20 records",
                      hint: "Preview sample rows and examine values",
                    },
                    {
                      label: "Count & Summary",
                      query: "What is the total number of records and summary metrics?",
                      hint: "Calculate aggregate statistics",
                    },
                    {
                      label: "Top values",
                      query: "What are the top 10 highest values sorted in descending order?",
                      hint: "Identify leaderboards and outliers",
                    },
                    {
                      label: "Group and count",
                      query: "Group the records by category and count the occurrences",
                      hint: "Aggregate categories and render charts",
                    },
                  ].map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (source) {
                          executeQuestion(s.query);
                        } else {
                          setInput(s.query);
                        }
                      }}
                      className="glass rounded-xl p-3 text-left hover:bg-white/10 hover:border-blue-500/40 transition-all group border border-white/5 cursor-pointer relative"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-200 group-hover:text-blue-400 transition-colors">
                          {s.label}
                        </span>
                        <ArrowUpRight size={12} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-1 mb-1 font-mono">{s.query}</p>
                      <span className="text-[10px] text-gray-500">{s.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}


          {messages.map((msg, idx) => (
            <div key={idx} className={`fade-in flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${msg.role === 'user' ? '' : ''}`}>
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-br-md'
                      : 'glass rounded-bl-md'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                </div>

                {/* SQL Toggle & Action Bar */}
                {msg.sql && (
                  <div className="mt-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleSql(idx)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-400 transition-colors"
                      >
                        {showSql[idx] ? <EyeOff size={12} /> : <Eye size={12} />}
                        {showSql[idx] ? 'Hide SQL' : 'View Generated SQL'}
                      </button>
                    </div>

                    {showSql[idx] && (
                      <div className="mt-2 glass rounded-xl overflow-hidden border border-white/10">
                        <div className="bg-white/5 px-3 py-1.5 border-b border-white/10 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                            <Code size={11} className="text-blue-400" /> SQL Query
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                if (editingSqlIdx === idx) {
                                  setEditingSqlIdx(null);
                                  setSqlExecError(null);
                                } else {
                                  setEditingSqlIdx(idx);
                                  setSqlDraft(msg.sql!);
                                  setSqlExecError(null);
                                  setShowSql((prev) => ({ ...prev, [idx]: true }));
                                }
                              }}
                              className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition-colors ${
                                editingSqlIdx === idx
                                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                                  : 'text-gray-400 hover:text-blue-300 hover:bg-white/5'
                              }`}
                              title="Edit and run this SQL query"
                            >
                              <Play size={10} className="text-blue-400 fill-current" />
                              <span>{editingSqlIdx === idx ? 'Close Editor' : 'Edit & Run'}</span>
                            </button>
                            <button
                              onClick={() => {
                                executeQuestion(`Explain this SQL query step-by-step in simple terms:\n\n${msg.sql}`);
                              }}
                              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-300 transition-colors px-2 py-0.5 rounded hover:bg-white/5"
                              title="Ask the assistant to explain this query"
                            >
                              <HelpCircle size={11} className="text-blue-400" />
                              <span>Explain</span>
                            </button>
                            <button
                              onClick={() => copyMessageSql(msg.sql!, idx)}
                              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-white/5"
                              title="Copy SQL to clipboard"
                            >
                              {copiedSqlIdx === idx ? (
                                <>
                                  <Check size={11} className="text-green-400" />
                                  <span className="text-green-400">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={11} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {editingSqlIdx === idx ? (
                          <div className="p-3 bg-black/60 border-t border-white/5 flex flex-col gap-2.5">
                            <div className="flex items-center justify-between text-[11px] text-gray-400">
                              <span className="flex items-center gap-1.5 text-blue-400 font-medium">
                                <Terminal size={12} /> SQL Editor Playground
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono">Executes live against active schema</span>
                            </div>
                            <textarea
                              value={sqlDraft}
                              onChange={(e) => setSqlDraft(e.target.value)}
                              rows={4}
                              className="w-full bg-black/80 border border-blue-500/40 rounded-lg p-2.5 text-xs text-emerald-400 font-mono focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 resize-y leading-relaxed"
                              placeholder="Enter SQL query..."
                            />
                            {sqlExecError && (
                              <div className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                                <AlertCircle size={13} className="text-rose-400 flex-shrink-0" />
                                <span>{sqlExecError}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-1">
                              <button
                                onClick={() => setSqlDraft(msg.sql!)}
                                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
                                title="Reset to original generated SQL"
                              >
                                <RotateCcw size={10} /> Reset
                              </button>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingSqlIdx(null);
                                    setSqlExecError(null);
                                  }}
                                  className="text-[11px] text-gray-400 hover:text-gray-200 px-2.5 py-1 rounded hover:bg-white/5 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  disabled={isExecutingSql || !sqlDraft.trim()}
                                  onClick={() => handleRunEditedSql(idx)}
                                  className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-3.5 py-1 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                                >
                                  {isExecutingSql ? (
                                    <>
                                      <Loader2 size={12} className="animate-spin" />
                                      <span>Running...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Play size={11} className="fill-current" />
                                      <span>Run Query</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-black/40 overflow-x-auto">
                            <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap">{msg.sql}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Table Results */}
                {msg.columns && msg.columns.length > 0 && (
                  <QueryResultTable
                    columns={msg.columns}
                    rows={msg.rows || []}
                    messageIndex={idx}
                    onDownloadCsv={downloadCsv}
                  />
                )}


                {/* Chart */}
                {msg.chartData && msg.chartData.data && msg.chartData.data.length > 0 && (
                  <InteractiveChart chartData={msg.chartData} />
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3 fade-in">
              <div className="glass rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-3">
                <Loader2 size={16} className="animate-spin text-blue-400" />
                <span className="text-sm text-gray-400">Analyzing your data...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center fade-in">
              <div className="glass rounded-xl px-4 py-3 flex items-center gap-2 text-red-400 text-sm border border-red-500/20 relative pr-10">
                <AlertCircle size={16} />
                {error}
                <button 
                  onClick={() => setError(null)} 
                  className="absolute right-3 text-red-400 hover:text-red-300 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="glass px-4 py-3" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderBottom: 'none' }}>
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={source ? "Ask a question about your data..." : "Upload a file first to start asking questions..."}
                disabled={!source || loading}
                className="glass-input w-full rounded-xl px-4 py-3 text-sm pr-12 disabled:opacity-50"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || !source}
              className="btn-primary p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Table Profile & Insights Modal */}
      {profileTable && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#0b1120] border border-white/20 rounded-2xl flex flex-col w-full max-w-4xl max-h-[85vh] shadow-2xl overflow-hidden glass">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
              <div className="flex items-center gap-2.5">
                <Sparkles size={16} className="text-blue-400" />
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>{profileTable}</span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono">
                      Table Insights
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    Statistical summary and column profile
                  </p>
                </div>
              </div>
              <button
                onClick={closeTableProfile}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Close Profile (Esc)"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {isProfileLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3">
                  <Loader2 size={24} className="animate-spin text-blue-400" />
                  <p className="text-xs text-gray-400 font-mono">Analyzing table profile & distributions...</p>
                </div>
              ) : profileError ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="text-rose-400 flex-shrink-0" />
                  <span>{profileError}</span>
                </div>
              ) : tableProfileData ? (
                <>
                  {/* Quick Metrics Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                      <span className="text-[11px] text-gray-400">Total Rows</span>
                      <p className="text-lg font-bold text-white font-mono mt-0.5">
                        {tableProfileData.row_count?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                      <span className="text-[11px] text-gray-400">Columns</span>
                      <p className="text-lg font-bold text-blue-400 font-mono mt-0.5">
                        {tableProfileData.column_count || 0}
                      </p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                      <span className="text-[11px] text-gray-400">Numeric Metrics</span>
                      <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                        {tableProfileData.columns?.filter((c: any) => c.avg !== null).length || 0}
                      </p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                      <span className="text-[11px] text-gray-400">Categorical Fields</span>
                      <p className="text-lg font-bold text-purple-400 font-mono mt-0.5">
                        {tableProfileData.columns?.filter((c: any) => c.avg === null).length || 0}
                      </p>
                    </div>
                  </div>

                  {/* Column Profile Table */}
                  <div className="border border-white/10 rounded-xl overflow-hidden">
                    <div className="bg-white/5 px-3 py-2 border-b border-white/10 text-xs text-gray-300 font-medium">
                      Column Distributions & Values
                    </div>
                    <div className="overflow-x-auto max-h-72">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400">
                            <th className="px-3 py-2 text-left">Column</th>
                            <th className="px-3 py-2 text-left">Type</th>
                            <th className="px-3 py-2 text-left">Nulls</th>
                            <th className="px-3 py-2 text-left">Distinct</th>
                            <th className="px-3 py-2 text-left">Stats (Min / Max / Avg)</th>
                            <th className="px-3 py-2 text-left">Sample Values</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tableProfileData.columns?.map((col: any, ci: number) => (
                            <tr key={ci} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="px-3 py-2 text-gray-200 font-mono font-medium">{col.name}</td>
                              <td className="px-3 py-2 text-gray-400 font-mono text-[11px]">{col.type}</td>
                              <td className="px-3 py-2 text-gray-400 font-mono">
                                {col.null_count > 0 ? (
                                  <span className="text-amber-400">{col.null_count} nulls</span>
                                ) : (
                                  <span className="text-gray-500">0</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-gray-300 font-mono">{col.distinct_count}</td>
                              <td className="px-3 py-2 text-gray-300 font-mono text-[11px]">
                                {col.avg !== null ? (
                                  <span className="text-blue-300">
                                    {col.min} / {col.max} <span className="text-gray-500">(μ {col.avg})</span>
                                  </span>
                                ) : (
                                  <span className="text-gray-600">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {col.sample_values?.slice(0, 3).map((val: string, vi: number) => (
                                    <span key={vi} className="text-[10px] bg-white/5 text-gray-300 px-1.5 py-0.5 rounded font-mono truncate max-w-[90px]">
                                      {val}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Quick Ask Insights */}
                  {tableProfileData.suggested_prompts && tableProfileData.suggested_prompts.length > 0 && (
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3.5 space-y-2">
                      <span className="text-xs text-gray-300 font-medium flex items-center gap-1.5">
                        <Sparkles size={12} className="text-blue-400" /> Quick Ask Suggestions
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {tableProfileData.suggested_prompts.map((prompt: string, pi: number) => (
                          <button
                            key={pi}
                            onClick={() => {
                              closeTableProfile();
                              executeQuestion(prompt);
                            }}
                            className="text-xs text-blue-300 hover:text-white bg-blue-600/10 hover:bg-blue-600/30 border border-blue-500/20 px-2.5 py-1 rounded-lg transition-all text-left flex items-center gap-1"
                          >
                            <span>{prompt}</span>
                            <ArrowRight size={11} className="flex-shrink-0 opacity-70" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

