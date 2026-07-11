'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Send, Upload, Database, MessageSquare, Table2, BarChart3,
  Eye, EyeOff, ChevronDown, ChevronRight, FileText, Plus,
  Trash2, Loader2, AlertCircle, CheckCircle2, History,
  X, Bot, User, Maximize2, Minimize2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { uploadFile, sendChat, createSession, getSession } from '@/lib/api';

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
      setSource({
        type: 'file',
        name: file.name,
        tableName: result.table_name,
        columns: result.columns,
        rowCount: result.row_count,
      });
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

  async function handleSend() {
    if (!input.trim() || loading || !sessionId) return;
    const question = input.trim();
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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleNewChat() {
    await initSession();
    setMessages([]);
    setSource(null);
    setHistory([]);
    setError(null);
  }

  function toggleSql(idx: number) {
    setShowSql((prev) => ({ ...prev, [idx]: !prev[idx] }));
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
              <span className="font-bold text-white font-['Space_Grotesk']">TableTalk</span>
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
                placeholder="postgresql://user:pass@host:5432/db"
                value={dbConnStr}
                onChange={(e) => setDbConnStr(e.target.value)}
                className="glass-input w-full rounded-lg px-3 py-2 text-xs mb-2"
              />
              <button className="btn-primary text-xs py-1.5 px-3 w-full">
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
              <div>Rows: <span className="text-gray-300">{source.rowCount.toLocaleString()}</span></div>
              <div>Columns: <span className="text-gray-300">{source.columns.join(', ')}</span></div>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
              <History size={12} /> Query History
            </div>
            <div className="space-y-2">
              {history.map((h, i) => (
                <div key={i} className="glass rounded-lg p-2.5 cursor-pointer hover:bg-white/5 transition-colors">
                  <p className="text-xs text-gray-300 truncate">{h.question}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate font-mono">{h.sql}</p>
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
                {source ? `Chatting with ${source.name}` : 'TableTalk'}
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-600/20 border border-blue-500/20 flex items-center justify-center">
                  <Database size={32} className="text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white font-['Space_Grotesk'] mb-2">
                  Ask your data anything
                </h2>
                <p className="text-sm text-gray-400 mb-4">
                  Upload a file from the sidebar and start asking questions in plain English.
                </p>
                <div className="glass-card p-4 text-left text-sm text-gray-400 space-y-2">
                  <p className="text-xs text-gray-500 font-semibold mb-1">Try asking:</p>
                  <p className="font-mono text-xs">"Show me all records"</p>
                  <p className="font-mono text-xs">"What's the average value?"</p>
                  <p className="font-mono text-xs">"Top 10 highest scores"</p>
                  <p className="font-mono text-xs">"Group by category and count"</p>
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

                {/* SQL Toggle */}
                {msg.sql && (
                  <div className="mt-2">
                    <button
                      onClick={() => toggleSql(idx)}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-400 transition-colors"
                    >
                      {showSql[idx] ? <EyeOff size={12} /> : <Eye size={12} />}
                      {showSql[idx] ? 'Hide SQL' : 'View Generated SQL'}
                    </button>
                    {showSql[idx] && (
                      <div className="mt-1 glass rounded-xl p-3 overflow-x-auto">
                        <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{msg.sql}</pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Table Results */}
                {msg.columns && msg.columns.length > 0 && (
                  <div className="mt-3 glass rounded-xl overflow-hidden">
                    <div className="max-h-80 overflow-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/10">
                            {msg.columns.map((col, ci) => (
                              <th key={ci} className="px-3 py-2 text-left text-gray-300 font-semibold whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {msg.rows?.slice(0, 50).map((row, ri) => (
                            <tr key={ri} className="border-b border-white/5 hover:bg-white/5">
                              {row.map((cell: any, ci: number) => (
                                <td key={ci} className="px-3 py-1.5 text-gray-400 whitespace-nowrap">
                                  {cell !== null && cell !== undefined ? String(cell) : '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {msg.rows && msg.rows.length > 50 && (
                      <div className="px-3 py-2 text-xs text-gray-500 border-t border-white/5">
                        Showing 50 of {msg.rows.length} rows
                      </div>
                    )}
                  </div>
                )}

                {/* Chart */}
                {msg.chartData && msg.chartData.data && msg.chartData.data.length > 0 && (
                  <div className="mt-3 glass rounded-xl p-4">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                      <BarChart3 size={14} className="text-blue-400" />
                      Chart View
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={msg.chartData.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey={msg.chartData.x_key} stroke="#6b7280" fontSize={11} />
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
                          {msg.chartData.lines?.map((line: string, li: number) => (
                            <Bar
                              key={li}
                              dataKey={line}
                              fill={li === 0 ? '#4f8cff' : '#7c3aed'}
                              radius={[4, 4, 0, 0]}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
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
              <div className="glass rounded-xl px-4 py-3 flex items-center gap-2 text-red-400 text-sm border border-red-500/20">
                <AlertCircle size={16} />
                {error}
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
    </div>
  );
}
