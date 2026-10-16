/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { Command, X, Cpu, ArrowUpRight, FolderOpen } from 'lucide-react';
import {
  MindCategory,
  MindFileNode,
  FormationMode,
  MCPToolName,
  MCPCommandPayload,
} from '../types';

interface QuickLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (val: string) => void;
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
  agentLabel: string;
  categories: MindCategory[];
  files: MindFileNode[];
  onSelectFile: (fileId: string) => void;
  onSendMessage: (query: string) => void;
  onDispatchMCP: (tool: MCPToolName, params: MCPCommandPayload['params']) => void;
  onOpenConnectors: () => void;
}

export const QuickLaunchModal: React.FC<QuickLaunchModalProps> = ({
  isOpen,
  onClose,
  query,
  onQueryChange,
  selectedIndex,
  onSelectIndex,
  agentLabel,
  categories,
  files,
  onSelectFile,
  onSendMessage,
  onDispatchMCP,
  onOpenConnectors,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  const mcpTools = useMemo(
    () => [
      {
        id: 'mcp-sort-daily',
        label: 'sort_spheres({ formation: "daily-flow" })',
        subtitle: 'MCP Tool Call · Arrange 3D spheres into Daily Priority Runway',
        badge: 'MCP TOOL',
        run: () => {
          onClose();
          onDispatchMCP('sort_spheres', { formation: 'daily-flow' });
        },
      },
      {
        id: 'mcp-sort-smile',
        label: 'sort_spheres({ formation: "caught-up-smile" })',
        subtitle: 'MCP Tool Call · Arrange all spheres into Caught-Up 3D Smile',
        badge: 'MCP TOOL',
        run: () => {
          onClose();
          onDispatchMCP('sort_spheres', { formation: 'caught-up-smile' });
        },
      },
      {
        id: 'mcp-sort-grid',
        label: 'sort_spheres({ formation: "app-grid" })',
        subtitle: 'MCP Tool Call · Snap spheres into App Columns by emblem',
        badge: 'MCP TOOL',
        run: () => {
          onClose();
          onDispatchMCP('sort_spheres', { formation: 'app-grid' });
        },
      },
      {
        id: 'mcp-sort-kaleidoscope',
        label: 'sort_spheres({ formation: "kaleidoscope" })',
        subtitle: 'MCP Tool Call · Symmetrical color-coordinated mandala',
        badge: 'MCP TOOL',
        run: () => {
          onClose();
          onDispatchMCP('sort_spheres', { formation: 'kaleidoscope' });
        },
      },
      {
        id: 'mcp-query-work',
        label: 'query_cluster({ clusterId: "work" })',
        subtitle: 'MCP Tool Call · Expand and focus the Work 3D cluster',
        badge: 'MCP TOOL',
        run: () => {
          onClose();
          onDispatchMCP('query_cluster', { clusterId: 'work', explosionLevel: 0.95 });
        },
      },
      {
        id: 'open-connectors',
        label: 'Open Data Connectors & Directory Ingestion',
        subtitle: 'Import Local Directory (File System Access API) or configure Gmail OAuth 2.0',
        badge: 'INGEST',
        run: () => {
          onClose();
          onOpenConnectors();
        },
      },
    ],
    [onClose, onDispatchMCP, onOpenConnectors]
  );

  const matchingTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mcpTools;
    return mcpTools.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.subtitle.toLowerCase().includes(q)
    );
  }, [query, mcpTools]);

  const matchingFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files.slice(0, 8);
    return files
      .filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.appName.toLowerCase().includes(q) ||
          f.locationPath.toLowerCase().includes(q) ||
          f.summary.toLowerCase().includes(q) ||
          (f.metadata?.relativePath || '').toLowerCase().includes(q) ||
          (f.metadata?.mimeType || '').toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [query, files]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) {
              const q = query.trim();
              onClose();
              onSendMessage(q);
            } else if (matchingTools[0]) {
              matchingTools[0].run();
            }
          }}
          className="flex items-center gap-3 px-4 py-3.5 bg-slate-50 border-b border-slate-200"
        >
          <Command size={18} className="text-blue-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
              onSelectIndex(0);
            }}
            placeholder="Search across all 3D nodes, paths, MIME types, or trigger MCP tool calls..."
            className="flex-1 text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none"
          />
          {query.trim() && (
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              Ask {agentLabel} ↵
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60"
          >
            <X size={16} />
          </button>
        </form>

        <div className="max-h-[64vh] overflow-y-auto p-3.5 space-y-4">
          {query.trim() && (
            <div>
              <div className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Dispatch Semantic Query or MCP Cluster Filter
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const q = query.trim();
                    onClose();
                    onSendMessage(q);
                  }}
                  className="p-3 rounded-xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200 flex items-center justify-between gap-2 text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Cpu size={15} className="text-blue-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        Ask {agentLabel}: &ldquo;{query.trim()}&rdquo;
                      </div>
                      <div className="text-[10px] text-slate-600">
                        Resolves location &amp; pulls matching 3D spheres forward
                      </div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-blue-600 text-white rounded shrink-0">
                    ↵
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const q = query.trim();
                    onClose();
                    onDispatchMCP('query_cluster', { query: q, explosionLevel: 0.95 });
                  }}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 flex items-center justify-between gap-2 text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FolderOpen size={15} className="text-slate-700 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate font-mono">
                        query_cluster(&ldquo;{query.trim()}&rdquo;)
                      </div>
                      <div className="text-[10px] text-slate-600">
                        Direct MCP coordinate mutation to stage matching nodes
                      </div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-800 text-white rounded shrink-0">
                    MCP
                  </span>
                </button>
              </div>
            </div>
          )}

          {matchingTools.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                MCP &amp; 3D Engine Tool Calls (No Dock Required)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {matchingTools.map((tool, idx) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={tool.run}
                    className={`p-2.5 rounded-xl border text-left transition-colors flex items-start justify-between gap-2 ${
                      selectedIndex === idx && !query
                        ? 'bg-slate-100 border-slate-300'
                        : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200/80'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold font-mono text-slate-900 truncate">
                        {tool.label}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {tool.subtitle}
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white text-slate-600 border border-slate-200 rounded shrink-0">
                      {tool.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>
                {query.trim()
                  ? `Matching 3D Nodes (${matchingFiles.length})`
                  : 'Indexed 3D File Nodes'}
              </span>
              <span>Click to run highlight_node()</span>
            </div>

            {matchingFiles.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                No indexed node matched &ldquo;{query}&rdquo; — press Enter to run semantic agent search.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {matchingFiles.map((file) => {
                  const cat = categories.find((c) => c.id === file.categoryId);
                  return (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        onDispatchMCP('highlight_node', { nodeId: file.id });
                        onSelectFile(file.id);
                      }}
                      className="w-full px-3.5 py-2.5 hover:bg-blue-50/60 flex items-center justify-between gap-3 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-8 h-8 rounded-full text-white font-display font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs"
                          style={{ backgroundColor: cat?.color || '#2563EB' }}
                        >
                          {file.appSymbol}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {file.title}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {cat?.name} · {file.metadata?.relativePath || file.locationPath}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono text-slate-400">
                          {file.sizeLabel}
                        </span>
                        <ArrowUpRight size={14} className="text-slate-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            Shortcut: <kbd className="font-mono font-semibold">⌘K</kbd> /{' '}
            <kbd className="font-mono font-semibold">Ctrl+K</kbd>
          </span>
          <span>
            Press <kbd className="font-mono font-semibold">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
};
