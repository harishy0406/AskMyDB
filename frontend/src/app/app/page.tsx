'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Send, Upload, Database, MessageSquare, Table2, BarChart3,
  Eye, EyeOff, ChevronDown, ChevronRight, FileText, Plus,
  Trash2, Loader2, AlertCircle, CheckCircle2, History,
  X, Bot, User, Maximize2, Minimize2, Download,
  Layers, Search, Copy, Check, Sparkles,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { uploadFile, sendChat, createSession, getSession, deleteSession, connectDatabase, getSchema } from '@/lib/api';

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
  const [schemaData, setSchemaData] = useState<Record<string, { columns: { name: string; type: string }[] }> | null>(null);
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
  const [schemaSearch, setSchemaSearch] = useState('');
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
                        <span className="text-[10px] text-gray-500 flex-shrink-0 ml-1">
                          {tableInfo.columns.length} cols
                        </span>
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
                {source ? `Chatting with ${source.name}` : 'AskMyDB'}
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
                    <div className="bg-white/5 px-3 py-2 border-b border-white/10 flex justify-between items-center">
                      <span className="text-xs text-gray-400 flex items-center gap-1.5"><Table2 size={12} /> Results</span>
                      <button
                        onClick={() => downloadCsv(msg.columns!, msg.rows || [], idx)}
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Download size={12} /> CSV
                      </button>
                    </div>
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
    </div>
  );
}
