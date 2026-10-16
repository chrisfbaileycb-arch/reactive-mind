/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Sparkles,
  CalendarClock,
  LayoutGrid,
  Smile,
  CircleDot,
  ArrowUpRight,
  Cpu,
  FolderPlus,
  X,
} from 'lucide-react';
import {
  MindCategory,
  MindFileNode,
  FormationMode,
} from '../types';

interface QuickLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: MindFileNode[];
  categories: MindCategory[];
  connectedAgentLabel: string;
  onSelectFile: (fileId: string) => void;
  onSelectCategory: (categoryId: string) => void;
  onRunToolFormation: (formation: FormationMode) => void;
  onBreakApartAll: () => void;
  onMarkAllCaughtUp: () => void;
  onOpenConnectors: () => void;
  onRunAgentPrompt: (prompt: string) => void;
}

interface QuickActionItem {
  id: string;
  type: 'tool' | 'file' | 'group' | 'agent-prompt';
  title: string;
  subtitle: string;
  badgeText: string;
  badgeColor: string;
  onExecute: () => void;
}

export const QuickLaunchModal: React.FC<QuickLaunchModalProps> = ({
  isOpen,
  onClose,
  files,
  categories,
  connectedAgentLabel,
  onSelectFile,
  onSelectCategory,
  onRunToolFormation,
  onBreakApartAll,
  onMarkAllCaughtUp,
  onOpenConnectors,
  onRunAgentPrompt,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 20);
    }
  }, [isOpen]);

  const items = useMemo<QuickActionItem[]>(() => {
    const q = query.trim().toLowerCase();

    const toolActions: QuickActionItem[] = [
      {
        id: 'tool-daily-flow',
        type: 'tool',
        title: 'Run Tool: sort_daily_workload()',
        subtitle: 'Arrange balls into Priority Front Row, On Deck, and Caught Up',
        badgeText: 'W',
        badgeColor: '#2563EB',
        onExecute: () => {
          onRunToolFormation('daily-flow');
          onClose();
        },
      },
      {
        id: 'tool-break-apart',
        type: 'tool',
        title: 'Run Tool: break_apart_all_clusters()',
        subtitle: 'Where are all my files? Break all spheres into individual app balls',
        badgeText: 'B',
        badgeColor: '#F97316',
        onExecute: () => {
          onBreakApartAll();
          onClose();
        },
      },
      {
        id: 'tool-app-grid',
        type: 'tool',
        title: 'Run Tool: align_app_columns()',
        subtitle: 'Line up all 3D balls into neat columns by App Emblem (G, D, P, N, W)',
        badgeText: 'A',
        badgeColor: '#0F172A',
        onExecute: () => {
          onRunToolFormation('app-grid');
          onClose();
        },
      },
      {
        id: 'tool-kaleidoscope',
        type: 'tool',
        title: 'Run Tool: form_kaleidoscope_mandala()',
        subtitle: 'Symmetrical color-balanced mandala formation',
        badgeText: 'K',
        badgeColor: '#4F46E5',
        onExecute: () => {
          onRunToolFormation('kaleidoscope');
          onClose();
        },
      },
      {
        id: 'tool-smile',
        type: 'tool',
        title: 'Run Tool: form_caught_up_smile()',
        subtitle: 'Mark everything Caught Up and arrange balls into a 3D Smile!',
        badgeText: '✓',
        badgeColor: '#10B981',
        onExecute: () => {
          onMarkAllCaughtUp();
          onClose();
        },
      },
      {
        id: 'tool-connectors',
        type: 'tool',
        title: 'Connect Folder, Discord, WhatsApp, or Cloud Storage...',
        subtitle: 'Link real folders & messaging archives into color-coded 3D groups',
        badgeText: '+',
        badgeColor: '#8B5CF6',
        onExecute: () => {
          onClose();
          onOpenConnectors();
        },
      },
    ];

    const matchingTools = q
      ? toolActions.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.subtitle.toLowerCase().includes(q)
        )
      : toolActions;

    const matchingFiles: QuickActionItem[] = files
      .filter((f) => {
        if (!q) return true;
        return (
          f.title.toLowerCase().includes(q) ||
          f.appName.toLowerCase().includes(q) ||
          f.locationPath.toLowerCase().includes(q) ||
          f.summary.toLowerCase().includes(q) ||
          f.content.toLowerCase().includes(q)
        );
      })
      .slice(0, q ? 12 : 6)
      .map((f) => {
        const cat = categories.find((c) => c.id === f.categoryId);
        return {
          id: `file-${f.id}`,
          type: 'file',
          title: f.title,
          subtitle: `${cat?.name || 'Group'} · Located in: ${f.locationPath}`,
          badgeText: f.appSymbol,
          badgeColor: cat?.color || '#2563EB',
          onExecute: () => {
            onSelectFile(f.id);
            onClose();
          },
        };
      });

    const matchingGroups: QuickActionItem[] = q
      ? categories
          .filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.description.toLowerCase().includes(q)
          )
          .map((c) => ({
            id: `group-${c.id}`,
            type: 'group',
            title: `Focus Group Sphere: ${c.name}`,
            subtitle: c.description,
            badgeText: c.symbol || c.name.charAt(0),
            badgeColor: c.color,
            onExecute: () => {
              onSelectCategory(c.id);
              onClose();
            },
          }))
      : [];

    const combined: QuickActionItem[] = [];

    if (q.length > 1) {
      combined.push({
        id: 'ask-agent-live',
        type: 'agent-prompt',
        title: `Ask ${connectedAgentLabel} Location Engine: "${query.trim()}"`,
        subtitle: 'Physically sort 3D balls and locate matching items without opening dock',
        badgeText: 'AI',
        badgeColor: '#2563EB',
        onExecute: () => {
          onRunAgentPrompt(query.trim());
          onClose();
        },
      });
    }

    // When user is typing a search query, prioritize matching files first, then tools
    if (q) {
      return [...combined, ...matchingFiles, ...matchingGroups, ...matchingTools];
    }

    return [...matchingTools, ...matchingFiles];
  }, [
    query,
    files,
    categories,
    connectedAgentLabel,
    onRunToolFormation,
    onBreakApartAll,
    onMarkAllCaughtUp,
    onOpenConnectors,
    onSelectFile,
    onSelectCategory,
    onRunAgentPrompt,
    onClose,
  ]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) =>
          items.length > 0 ? (prev - 1 + items.length) % items.length : 0
        );
      } else if (e.key === 'Enter' && items[activeIndex]) {
        e.preventDefault();
        items[activeIndex].onExecute();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items, activeIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/35 backdrop-blur-sm pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search & Command Input Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/80">
          <Search size={18} className="text-blue-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all files, locations, apps (Gmail, Discord, WhatsApp, Folders) or trigger a 3D tool..."
            className="flex-1 bg-transparent text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <span className="px-2 py-0.5 text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 rounded border border-slate-200">
            ESC
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X size={16} />
          </button>
        </div>

        {/* Instant 1-Click Tool Strip */}
        <div className="px-4 py-2 bg-slate-50/90 border-b border-slate-200/60 flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 whitespace-nowrap">
            Instant 3D Tools:
          </span>
          <button
            type="button"
            onClick={() => {
              onRunToolFormation('daily-flow');
              onClose();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-[11px] font-semibold whitespace-nowrap transition-colors"
          >
            <CalendarClock size={12} />
            <span>Daily Workload</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onRunToolFormation('app-grid');
              onClose();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-[11px] font-semibold whitespace-nowrap transition-colors"
          >
            <LayoutGrid size={12} />
            <span>App Columns</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onRunToolFormation('kaleidoscope');
              onClose();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 text-[11px] font-semibold whitespace-nowrap transition-colors"
          >
            <Sparkles size={12} />
            <span>Kaleidoscope</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onMarkAllCaughtUp();
              onClose();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-semibold whitespace-nowrap transition-colors"
          >
            <Smile size={12} />
            <span>Caught-Up Smile</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenConnectors();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 text-[11px] font-semibold whitespace-nowrap transition-colors"
          >
            <FolderPlus size={12} />
            <span>Connect Source</span>
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[54vh] overflow-y-auto p-2 divide-y divide-slate-100">
          {items.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No matching files or tools found. Press Enter to ask {connectedAgentLabel} Location Engine.
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={item.onExecute}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-left transition-colors ${
                    isSelected ? 'bg-blue-50/90 text-slate-900' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-8 h-8 rounded-xl text-white font-display font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs"
                      style={{ backgroundColor: item.badgeColor }}
                    >
                      {item.badgeText}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-[11px] font-semibold text-slate-400">
                    <span>
                      {item.type === 'tool'
                        ? 'Run Tool'
                        : item.type === 'agent-prompt'
                        ? 'Ask Engine'
                        : item.type === 'group'
                        ? 'Focus Sphere'
                        : 'Locate Ball'}
                    </span>
                    <ArrowUpRight size={14} className={isSelected ? 'text-blue-600' : 'text-slate-400'} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>·</span>
            <span>↵ Execute or Locate in 3D</span>
            <span>·</span>
            <span>⌘K Toggle Anywhere</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            <Cpu size={12} className="text-blue-600" />
            <span>Engine: {connectedAgentLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
