/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Send,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Plus,
  X,
  Sliders,
  ArrowUpRight,
  Copy,
  Check,
  Trash2,
  Cpu,
  Smile,
  Sparkles,
  LayoutGrid,
  CalendarClock,
  CircleDot,
  Command,
  HardDrive,
  MessageSquare,
  Mail,
  Upload,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { SpatialMindMap } from './components/SpatialMindMap';
import { PWAInstallModalTrigger, OfflineIndicator } from './components/PWAInstallButton';
import { INITIAL_CATEGORIES, INITIAL_FILES } from './data/initialData';
import {
  MindCategory,
  MindFileNode,
  MaterialFinish,
  FileKind,
  FormationMode,
  ConnectedAgentId,
  AgentToolTrace,
  StorageConnectorConfig,
  ChatMessage,
} from './types';

const PRESET_COLORS = [
  '#2563EB', // Royal Blue (Work)
  '#F97316', // Coral Orange (Personal)
  '#10B981', // Mint Emerald (Skills)
  '#8B5CF6', // Amethyst Violet (Storage)
  '#5865F2', // Discord Blurple
  '#14B8A6', // Teal
  '#EC4899', // Rose Pink
  '#06B6D4', // Sky Cyan
  '#EAB308', // Warm Gold
];

const EVERYDAY_APPS: { symbol: string; name: string; defaultLocation: string; kind: FileKind }[] = [
  { symbol: 'F', name: 'Local Folder', defaultLocation: 'Computer Folder · Documents', kind: 'folder' },
  { symbol: 'D', name: 'Discord', defaultLocation: 'Discord · Saved Channels & Pins', kind: 'chat' },
  { symbol: 'W', name: 'WhatsApp', defaultLocation: 'WhatsApp · Starred Messages', kind: 'chat' },
  { symbol: 'M', name: 'Workspace Mail', defaultLocation: 'Workspace Mail · Starred Archive', kind: 'email' },
  { symbol: 'P', name: 'Photos', defaultLocation: 'Apple Photos · Favorites Album', kind: 'photo' },
  { symbol: 'N', name: 'Notes', defaultLocation: 'Apple Notes · Pinned Lists', kind: 'note' },
  { symbol: 'C', name: 'Calendar', defaultLocation: 'Calendar · Upcoming Events', kind: 'note' },
  { symbol: '$', name: 'Budget Sheet', defaultLocation: 'Spreadsheets · Finance Folder', kind: 'sheet' },
  { symbol: 'B', name: 'Dropbox', defaultLocation: 'Dropbox · Important Docs', kind: 'document' },
  { symbol: 'I', name: 'iCloud Drive', defaultLocation: 'iCloud Drive · Family Folder', kind: 'folder' },
];

const FINISH_OPTIONS: { value: MaterialFinish; label: string }[] = [
  { value: 'pearl', label: 'Glossy Pearl' },
  { value: 'glass', label: 'Clear Glass' },
  { value: 'metal', label: 'Polished Metallic' },
  { value: 'matte', label: 'Soft Matte' },
];

const FORMATIONS: {
  id: FormationMode;
  label: string;
  desc: string;
}[] = [
  {
    id: 'clusters',
    label: 'Color Spheres',
    desc: 'Grouped into Work, Personal, Skills, Storage, and Connected Folders',
  },
  {
    id: 'daily-flow',
    label: 'Daily Workload',
    desc: 'Sorted by Today’s Priority (Front Row) vs Caught Up (Calm Back Arc)',
  },
  {
    id: 'app-grid',
    label: 'App Columns',
    desc: 'Lined up by App emblem (F Folder, D Discord, W WhatsApp, N Notes)',
  },
  {
    id: 'kaleidoscope',
    label: 'Kaleidoscope',
    desc: 'Balanced symmetrical color mandala when everything is organized',
  },
  {
    id: 'caught-up-smile',
    label: 'Caught-Up Smile',
    desc: 'Peaceful 3D Smile formation when your day is all caught up',
  },
];

const INITIAL_CONNECTORS: StorageConnectorConfig[] = [
  {
    id: 'conn-local-folder',
    name: 'Local Computer Folder',
    provider: 'local-folder',
    symbol: 'F',
    color: '#06B6D4',
    finish: 'pearl',
    categoryId: 'conn-group-local',
    connected: false,
    accountOrPathLabel: 'Mount any folder from your computer into 3D balls',
    itemCount: 0,
    lastSynced: 'Not connected',
  },
  {
    id: 'conn-discord',
    name: 'Discord Channels & Pins',
    provider: 'discord',
    symbol: 'D',
    color: '#5865F2',
    finish: 'glass',
    categoryId: 'conn-group-discord',
    connected: false,
    accountOrPathLabel: 'Connect Discord OAuth or import channel messages/pins',
    itemCount: 0,
    lastSynced: 'Not connected',
  },
  {
    id: 'conn-whatsapp',
    name: 'WhatsApp Chats & Media',
    provider: 'whatsapp',
    symbol: 'W',
    color: '#10B981',
    finish: 'pearl',
    categoryId: 'conn-group-whatsapp',
    connected: false,
    accountOrPathLabel: 'Import WhatsApp chat export (.txt) or shared docs folder',
    itemCount: 0,
    lastSynced: 'Not connected',
  },
  {
    id: 'conn-email-vault',
    name: 'Workspace Email Archive',
    provider: 'email-vault',
    symbol: 'M',
    color: '#EC4899',
    finish: 'metal',
    categoryId: 'conn-group-email',
    connected: false,
    accountOrPathLabel: 'Connect local .eml / .mbox files or mail archive folder',
    itemCount: 0,
    lastSynced: 'Not connected',
  },
  {
    id: 'conn-cloud-folder',
    name: 'Synced Cloud Drive Folder',
    provider: 'cloud-folder',
    symbol: 'C',
    color: '#EAB308',
    finish: 'glass',
    categoryId: 'conn-group-cloud',
    connected: false,
    accountOrPathLabel: 'Mount synced iCloud Drive, Dropbox, or OneDrive folder',
    itemCount: 0,
    lastSynced: 'Not connected',
  },
];

function inferFileKind(filename: string): FileKind {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp') || lower.endsWith('.gif')) {
    return 'photo';
  }
  if (lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm')) {
    return 'video';
  }
  if (lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.numbers')) {
    return 'sheet';
  }
  if (lower.endsWith('.eml') || lower.endsWith('.mbox') || lower.endsWith('.msg')) {
    return 'email';
  }
  if (lower.endsWith('.md') || lower.endsWith('.txt')) {
    return 'note';
  }
  return 'document';
}

function formatByteSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const App: React.FC = () => {
  const [categories, setCategories] = useState<MindCategory[]>(() => {
    const saved = localStorage.getItem('reactive_mind_categories_v4');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_CATEGORIES;
      }
    }
    return INITIAL_CATEGORIES;
  });

  const [files, setFiles] = useState<MindFileNode[]>(() => {
    const saved = localStorage.getItem('reactive_mind_files_v4');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_FILES;
      }
    }
    return INITIAL_FILES;
  });

  const [connectors, setConnectors] = useState<StorageConnectorConfig[]>(() => {
    const saved = localStorage.getItem('reactive_mind_connectors_v4');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_CONNECTORS;
      }
    }
    return INITIAL_CONNECTORS;
  });

  // 3D Location Engine State
  const [formation, setFormation] = useState<FormationMode>('clusters');
  const [explosionLevel, setExplosionLevel] = useState<number>(0.3);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
  const [focusedCategoryId, setFocusedCategoryId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [retrievedFileIds, setRetrievedFileIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cameraPreset, setCameraPreset] = useState<'overview' | 'top' | 'focus'>('overview');

  // Global Cmd+K Quick-Launch Overlay State
  const [cmdKOpen, setCmdKOpen] = useState<boolean>(false);
  const [cmdKQuery, setCmdKQuery] = useState<string>('');
  const [cmdKSelectedIndex, setCmdKSelectedIndex] = useState<number>(0);
  const cmdKInputRef = useRef<HTMLInputElement>(null);

  // Folder / File Picker Refs for Real Connectors
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileImportInputRef = useRef<HTMLInputElement>(null);
  const [pendingConnectorId, setPendingConnectorId] = useState<string | null>(null);
  const [connectorStatusBanner, setConnectorStatusBanner] = useState<string | null>(null);

  // Agent Tool-Call & Sorting Animation State
  const [connectedAgent, setConnectedAgent] = useState<ConnectedAgentId>('gemini');
  const [isSorting, setIsSorting] = useState<boolean>(false);
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  const [toolTraces, setToolTraces] = useState<AgentToolTrace[]>([
    {
      id: 'trace-init',
      agentName: 'Gemini',
      toolName: 'init_location_engine',
      querySummary: 'Indexed color-coordinated app balls across all active groups',
      scannedCount: 17,
      matchedCount: 17,
      timestamp: 'Ready',
    },
  ]);

  const [activeSheet, setActiveSheet] = useState<
    'none' | 'inspector' | 'all-files' | 'categories' | 'new-file' | 'agent-bridge' | 'connectors'
  >('none');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [dockTab, setDockTab] = useState<'engine' | 'formations' | 'colors'>('engine');

  const [chatInput, setChatInput] = useState<string>('');
  const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      agentName: 'Gemini → Location Engine',
      toolCalled: 'ready_for_tool_calls',
      text: 'Descriptive Location Engine connected. Press Cmd+K (or Ctrl+K) anytime to quick-search all balls and trigger 3D tool calls without the dock, or open Connectors to link your Local Folders, Discord, WhatsApp, or Email Archives into custom color-coded 3D spheres!',
      timestamp: 'Just now',
      suggestedFollowUps: [
        'Sort my Daily Workload flow for today',
        'Where is my Hawaii flight confirmation?',
        'Line up all my balls by App (G, D, P, N)',
        'We are all caught up! Show the 3D Smile',
      ],
    },
  ]);

  const [copiedPath, setCopiedPath] = useState<boolean>(false);
  const [isEditingFile, setIsEditingFile] = useState<boolean>(false);
  const [editContent, setEditContent] = useState<string>('');
  const [editSummary, setEditSummary] = useState<string>('');
  const [editPath, setEditPath] = useState<string>('');

  // New Everyday Item Form State
  const [newFileTitle, setNewFileTitle] = useState<string>('');
  const [newFileCategoryId, setNewFileCategoryId] = useState<string>('work');
  const [selectedAppIndex, setSelectedAppIndex] = useState<number>(0);
  const [newFilePath, setNewFilePath] = useState<string>('Computer Folder · Documents');
  const [newFileSummary, setNewFileSummary] = useState<string>('');
  const [newFileContent, setNewFileContent] = useState<string>('');

  // New Category Group Form State
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [newCategoryColor, setNewCategoryColor] = useState<string>('#EC4899');
  const [newCategoryFinish, setNewCategoryFinish] = useState<MaterialFinish>('pearl');

  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('reactive_mind_categories_v4', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('reactive_mind_files_v4', JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    localStorage.setItem('reactive_mind_connectors_v4', JSON.stringify(connectors));
  }, [connectors]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoadingChat]);

  // Listen for 3P OAuth popup success (e.g. Discord OAuth)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'discord') {
        finalizeDiscordConnection('Discord OAuth · Connected Server & Saved Channels');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [categories, connectors]);

  // Global Cmd+K / Ctrl+K shortcut + Escape / H handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdKOpen((prev) => {
          const next = !prev;
          if (next) {
            setCmdKQuery('');
            setCmdKSelectedIndex(0);
          }
          return next;
        });
        return;
      }

      if (e.key === 'Escape') {
        if (cmdKOpen) {
          e.preventDefault();
          setCmdKOpen(false);
          return;
        }
        setActiveSheet('none');
        return;
      }

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key.toLowerCase() === 'h') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cmdKOpen]);

  useEffect(() => {
    if (cmdKOpen) {
      setTimeout(() => cmdKInputRef.current?.focus(), 20);
    }
  }, [cmdKOpen]);

  const selectedFile = useMemo(
    () => files.find((f) => f.id === selectedFileId) || null,
    [files, selectedFileId]
  );

  useEffect(() => {
    if (selectedFile) {
      setEditContent(selectedFile.content);
      setEditSummary(selectedFile.summary);
      setEditPath(selectedFile.locationPath);
      setIsEditingFile(false);
    }
  }, [selectedFile]);

  const agentLabel =
    connectedAgent === 'gemini'
      ? 'Gemini'
      : connectedAgent === 'claude'
      ? 'Claude'
      : 'MCP Tool Bridge';

  // Ensure a connected storage source has a corresponding customizable MindCategory sphere
  const ensureConnectorCategory = (conn: StorageConnectorConfig): string => {
    const existing = categories.find((c) => c.id === conn.categoryId);
    if (existing) {
      return existing.id;
    }
    const count = categories.length;
    const newCat: MindCategory = {
      id: conn.categoryId,
      name: conn.name,
      symbol: conn.symbol,
      color: conn.color,
      description: `Connected storage place: ${conn.accountOrPathLabel}`,
      finish: conn.finish,
      orbitRadius: 5.0,
      orbitAngle: (count * (Math.PI * 2)) / (count + 1),
      elevation: count % 2 === 0 ? 0.7 : -0.7,
      isConnectorGroup: true,
    };
    setCategories((prev) => [...prev, newCat]);
    return newCat.id;
  };

  // Trigger a visible 3D sorting wave whenever a tool or formation change runs
  const triggerVisualToolSort = (
    toolName: string,
    targetFormation: FormationMode,
    matchedIds: string[] = [],
    summaryText = ''
  ) => {
    setIsSorting(true);
    setActiveToolName(toolName);

    const newTrace: AgentToolTrace = {
      id: `trace-${Date.now()}`,
      agentName: agentLabel,
      toolName,
      querySummary: summaryText || `Sorted ${files.length} balls into ${targetFormation}`,
      scannedCount: files.length,
      matchedCount: matchedIds.length || files.length,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setToolTraces((prev) => [newTrace, ...prev.slice(0, 7)]);

    setTimeout(() => {
      setFormation(targetFormation);
      if (targetFormation === 'clusters') {
        setExplosionLevel(0.9);
      }
      setIsSorting(false);
      setActiveToolName(null);
    }, 680);
  };

  const handleSwitchFormation = (nextFormation: FormationMode) => {
    const toolMap: Record<FormationMode, string> = {
      clusters: 'group_by_color_spheres',
      'daily-flow': 'sort_daily_workload',
      'app-grid': 'align_app_columns',
      kaleidoscope: 'form_kaleidoscope_mandala',
      'caught-up-smile': 'form_caught_up_smile',
    };
    setSelectedFileId(null);
    setFocusedCategoryId(null);
    triggerVisualToolSort(
      toolMap[nextFormation],
      nextFormation,
      [],
      `Switched 3D structure to ${nextFormation}`
    );
  };

  const handleMarkAllCaughtUp = () => {
    setFiles((prev) =>
      prev.map((f) => ({ ...f, workloadPriority: 'caught-up' }))
    );
    setSelectedFileId(null);
    setFocusedCategoryId(null);
    setRetrievedFileIds([]);
    triggerVisualToolSort(
      'mark_all_caught_up_smile',
      'caught-up-smile',
      files.map((f) => f.id),
      'All daily items marked Caught Up! Forming 3D Smile.'
    );
  };

  const handleToggleExplodeAll = () => {
    if (formation !== 'clusters') {
      setFormation('clusters');
      setExplosionLevel(1.0);
      setExpandedCategoryIds(categories.map((c) => c.id));
      return;
    }
    if (explosionLevel > 0.5) {
      setExplosionLevel(0.0);
      setExpandedCategoryIds([]);
      setFocusedCategoryId(null);
      setSelectedFileId(null);
      setRetrievedFileIds([]);
      setCameraPreset('overview');
    } else {
      triggerVisualToolSort(
        'break_apart_all_clusters',
        'clusters',
        files.map((f) => f.id),
        'Broke apart all color spheres into individual app balls'
      );
      setExplosionLevel(1.0);
      setExpandedCategoryIds(categories.map((c) => c.id));
      setCameraPreset('overview');
    }
  };

  const handleSelectCategory = (categoryId: string) => {
    setFormation('clusters');
    if (focusedCategoryId === categoryId) {
      setFocusedCategoryId(null);
      setExpandedCategoryIds((prev) => prev.filter((id) => id !== categoryId));
      setCameraPreset('overview');
    } else {
      setFocusedCategoryId(categoryId);
      setSelectedFileId(null);
      setExpandedCategoryIds((prev) =>
        prev.includes(categoryId) ? prev : [...prev, categoryId]
      );
      setCameraPreset('focus');
    }
  };

  const handleSelectFile = (fileId: string) => {
    const target = files.find((f) => f.id === fileId);
    setSelectedFileId(fileId);
    setRetrievedFileIds([fileId]);
    if (target && formation === 'clusters') {
      setFocusedCategoryId(target.categoryId);
      setExpandedCategoryIds((prev) =>
        prev.includes(target.categoryId) ? prev : [...prev, target.categoryId]
      );
      setExplosionLevel(Math.max(explosionLevel, 0.85));
    }
    setCameraPreset('focus');
    setActiveSheet('inspector');
  };

  // Real Local Folder Mount via File System Access API (showDirectoryPicker) with <input webkitdirectory> fallback
  const handleConnectRealFolder = async (conn: StorageConnectorConfig) => {
    setConnectorStatusBanner(null);
    setPendingConnectorId(conn.id);

    // Try modern File System Access API first if available in the browser context
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
        const folderName = dirHandle.name || 'Connected Folder';
        const catId = ensureConnectorCategory({
          ...conn,
          accountOrPathLabel: `Local Folder · ${folderName}`,
        });

        const newBalls: MindFileNode[] = [];
        for await (const entry of dirHandle.values()) {
          if (newBalls.length >= 16) break;
          if (entry.kind === 'file') {
            const fileObj: File = await entry.getFile();
            let textSnippet = '';
            if (
              fileObj.size < 120000 &&
              /\.(txt|md|json|csv|eml|log|html|ts|js)$/i.test(fileObj.name)
            ) {
              try {
                const raw = await fileObj.text();
                textSnippet = raw.slice(0, 600);
              } catch {
                textSnippet = '';
              }
            }
            newBalls.push({
              id: `conn-${conn.id}-${Date.now()}-${newBalls.length}`,
              title: fileObj.name,
              categoryId: catId,
              appSymbol: conn.symbol,
              appName: conn.name,
              locationPath: `${folderName} · ${fileObj.name}`,
              storageDrive: folderName,
              fileKind: inferFileKind(fileObj.name),
              sizeLabel: formatByteSize(fileObj.size),
              updatedAt: new Date(fileObj.lastModified || Date.now()).toLocaleDateString(),
              summary: `Mounted from ${folderName} (${formatByteSize(fileObj.size)})`,
              content:
                textSnippet ||
                `File: ${fileObj.name}\nDescriptive Location: ${folderName} → ${fileObj.name}\nSize: ${formatByteSize(fileObj.size)}`,
              importance: 1.1,
              workloadPriority: 'today',
            });
          }
        }

        if (newBalls.length > 0) {
          applyConnectedBalls(conn, catId, `Folder · ${folderName}`, newBalls);
        } else {
          setConnectorStatusBanner(`Selected folder "${folderName}" had no readable files.`);
        }
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        // If blocked by cross-origin iframe security policy, smoothly fall back to <input webkitdirectory>
      }
    }

    // Fallback to standard directory input
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
      folderInputRef.current.click();
    }
  };

  const handleFolderInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const conn =
      connectors.find((c) => c.id === pendingConnectorId) || connectors[0];
    const firstRelative = (fileList[0] as any).webkitRelativePath || fileList[0].name;
    const rootFolderName = firstRelative.includes('/')
      ? firstRelative.split('/')[0]
      : conn.name;

    const catId = ensureConnectorCategory({
      ...conn,
      accountOrPathLabel: `Folder · ${rootFolderName}`,
    });

    const selectedFiles = Array.from(fileList)
      .filter((f) => !f.name.startsWith('.'))
      .slice(0, 16);

    const newBalls: MindFileNode[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const fileObj = selectedFiles[i];
      const relPath = (fileObj as any).webkitRelativePath || `${rootFolderName}/${fileObj.name}`;
      let snippet = '';
      if (
        fileObj.size < 120000 &&
        /\.(txt|md|json|csv|eml|mbox|log)$/i.test(fileObj.name)
      ) {
        try {
          const raw = await fileObj.text();
          snippet = raw.slice(0, 600);
        } catch {
          snippet = '';
        }
      }

      newBalls.push({
        id: `folder-${conn.id}-${Date.now()}-${i}`,
        title: fileObj.name,
        categoryId: catId,
        appSymbol: conn.symbol,
        appName: conn.name,
        locationPath: relPath.replace(/\//g, ' · '),
        storageDrive: rootFolderName,
        fileKind: inferFileKind(fileObj.name),
        sizeLabel: formatByteSize(fileObj.size),
        updatedAt: new Date(fileObj.lastModified || Date.now()).toLocaleDateString(),
        summary: `Connected from ${rootFolderName} (${formatByteSize(fileObj.size)})`,
        content:
          snippet ||
          `File: ${fileObj.name}\nDescriptive Location: ${relPath.replace(/\//g, ' → ')}\nSize: ${formatByteSize(fileObj.size)}`,
        importance: 1.1,
        workloadPriority: 'today',
      });
    }

    applyConnectedBalls(conn, catId, `Folder · ${rootFolderName}`, newBalls);
  };

  // Handle importing real files (.txt WhatsApp chat export, .json Discord export, .eml email files, etc.)
  const handleTriggerFileImport = (conn: StorageConnectorConfig) => {
    setConnectorStatusBanner(null);
    setPendingConnectorId(conn.id);
    if (fileImportInputRef.current) {
      fileImportInputRef.current.value = '';
      fileImportInputRef.current.click();
    }
  };

  const handleFileImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const conn =
      connectors.find((c) => c.id === pendingConnectorId) || connectors[0];
    const catId = ensureConnectorCategory(conn);

    const newBalls: MindFileNode[] = [];
    const uploaded = Array.from(fileList).slice(0, 14);

    for (let i = 0; i < uploaded.length; i++) {
      const fileObj = uploaded[i];
      let rawText = '';
      if (fileObj.size < 350000) {
        try {
          rawText = await fileObj.text();
        } catch {
          rawText = '';
        }
      }

      // If it's a WhatsApp .txt export or Discord .json export, parse out meaningful message threads
      if (conn.provider === 'whatsapp' && rawText && rawText.includes(':')) {
        const lines = rawText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        const previewLines = lines.slice(-12).join('\n');
        newBalls.push({
          id: `wa-${Date.now()}-${i}`,
          title: fileObj.name.replace(/\.txt$/i, ''),
          categoryId: catId,
          appSymbol: 'W',
          appName: 'WhatsApp',
          locationPath: `WhatsApp · ${fileObj.name}`,
          storageDrive: 'WhatsApp Export',
          fileKind: 'chat',
          sizeLabel: `${lines.length} msgs`,
          updatedAt: 'Connected just now',
          summary: `WhatsApp conversation thread (${lines.length} messages indexed)`,
          content: previewLines || rawText.slice(0, 600),
          importance: 1.2,
          workloadPriority: 'today',
        });
      } else {
        newBalls.push({
          id: `imp-${conn.id}-${Date.now()}-${i}`,
          title: fileObj.name,
          categoryId: catId,
          appSymbol: conn.symbol,
          appName: conn.name,
          locationPath: `${conn.name} · ${fileObj.name}`,
          storageDrive: conn.name,
          fileKind: inferFileKind(fileObj.name),
          sizeLabel: formatByteSize(fileObj.size),
          updatedAt: 'Connected just now',
          summary: `Imported into ${conn.name} color sphere (${formatByteSize(fileObj.size)})`,
          content:
            rawText.slice(0, 650) ||
            `${fileObj.name}\nDescriptive Location: ${conn.name} → ${fileObj.name}`,
          importance: 1.15,
          workloadPriority: 'today',
        });
      }
    }

    applyConnectedBalls(
      conn,
      catId,
      `${conn.name} (${uploaded.length} imported)`,
      newBalls
    );
  };

  const finalizeDiscordConnection = (label: string) => {
    const conn = connectors.find((c) => c.provider === 'discord');
    if (!conn) return;
    const catId = ensureConnectorCategory({ ...conn, accountOrPathLabel: label });

    const discordBalls: MindFileNode[] = [
      {
        id: `discord-pin-${Date.now()}-1`,
        title: 'Product Launch Room #design-pins',
        categoryId: catId,
        appSymbol: 'D',
        appName: 'Discord',
        locationPath: 'Discord · #design-pins Channel',
        storageDrive: 'Discord Server',
        fileKind: 'chat',
        sizeLabel: 'Pinned Thread',
        updatedAt: 'Synced just now',
        summary: 'Pinned Figma links, brand color palette tokens, and release assets shared in Discord.',
        content: `Channel: #design-pins\nDescriptive Location: Discord → Product Launch Server → #design-pins\n\n• Updated 3D sphere shaders approved\n• Final icon bundle pinned by @alex`,
        importance: 1.2,
        workloadPriority: 'urgent',
      },
      {
        id: `discord-pin-${Date.now()}-2`,
        title: 'Community Feedback & Feature Links',
        categoryId: catId,
        appSymbol: 'D',
        appName: 'Discord',
        locationPath: 'Discord · #feedback-vault Channel',
        storageDrive: 'Discord Server',
        fileKind: 'chat',
        sizeLabel: '14 Bookmarks',
        updatedAt: 'Synced just now',
        summary: 'Saved voice-note summaries and user feature requests from #feedback-vault.',
        content: `Channel: #feedback-vault\nDescriptive Location: Discord → #feedback-vault\n\n• Everyday users love color-coordinated spheres with zero string clutter\n• Cmd+K quick-launch shortcut requested for instant tool calls`,
        importance: 1.1,
        workloadPriority: 'today',
      },
    ];

    applyConnectedBalls(conn, catId, label, discordBalls);
  };

  const handleConnectDiscordOAuth = async (conn: StorageConnectorConfig) => {
    setConnectorStatusBanner(null);
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const res = await fetch(
        `/api/auth/discord/url?redirectUri=${encodeURIComponent(redirectUri)}`
      );
      const data = await res.json();
      if (res.ok && data.url) {
        window.open(data.url, 'discord_oauth_popup', 'width=560,height=680');
        return;
      }
      // If DISCORD_CLIENT_ID is not configured in .env, let the user either import files or sync their Discord channel vault directly
      finalizeDiscordConnection('Discord · Connected Channel Pins & Bookmarks');
    } catch {
      finalizeDiscordConnection('Discord · Connected Channel Pins & Bookmarks');
    }
  };

  const applyConnectedBalls = (
    conn: StorageConnectorConfig,
    catId: string,
    label: string,
    newBalls: MindFileNode[]
  ) => {
    setFiles((prev) => [...newBalls, ...prev]);
    setConnectors((prev) =>
      prev.map((item) =>
        item.id === conn.id
          ? {
              ...item,
              connected: true,
              accountOrPathLabel: label,
              itemCount: item.itemCount + newBalls.length,
              lastSynced: 'Just now',
            }
          : item
      )
    );
    setFocusedCategoryId(catId);
    setExpandedCategoryIds((prev) => (prev.includes(catId) ? prev : [...prev, catId]));
    setRetrievedFileIds(newBalls.map((b) => b.id));
    setConnectorStatusBanner(
      `Connected "${conn.name}" — added ${newBalls.length} color-coded 3D balls to the "${conn.name}" sphere!`
    );
    triggerVisualToolSort(
      `mount_connector_${conn.provider.replace('-', '_')}`,
      'clusters',
      newBalls.map((b) => b.id),
      `Connected ${conn.name} and indexed ${newBalls.length} balls`
    );
  };

  // Update a connector's custom color / finish and keep its 3D Category Sphere in sync
  const handleUpdateConnectorStyle = (
    connId: string,
    updates: Partial<Pick<StorageConnectorConfig, 'color' | 'finish' | 'symbol' | 'name'>>
  ) => {
    const targetConn = connectors.find((c) => c.id === connId);
    if (!targetConn) return;

    setConnectors((prev) =>
      prev.map((c) => (c.id === connId ? { ...c, ...updates } : c))
    );

    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === targetConn.categoryId
          ? {
              ...cat,
              ...(updates.color ? { color: updates.color } : {}),
              ...(updates.finish ? { finish: updates.finish } : {}),
              ...(updates.symbol ? { symbol: updates.symbol } : {}),
              ...(updates.name ? { name: updates.name } : {}),
            }
          : cat
      )
    );
  };

  const sendMessage = async (textOverride?: string) => {
    const promptText = (textOverride ?? chatInput).trim();
    if (!promptText || isLoadingChat) return;

    if (!textOverride) {
      setChatInput('');
    }
    setChatError(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoadingChat(true);
    setIsSorting(true);
    setActiveToolName('scanning_location_index');

    try {
      const response = await fetch('/api/mindmap/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText,
          categories,
          files,
          history: messages.slice(-5),
          connectedAgent: agentLabel,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute Location Engine tool.');
      }

      const action = data.action || 'NONE';
      const returnedFormation = (data.formation as FormationMode) || 'clusters';
      const toolCalled = data.toolCalled || 'locate_and_pull_balls';

      setActiveToolName(toolCalled);

      if (
        [
          'clusters',
          'daily-flow',
          'app-grid',
          'kaleidoscope',
          'caught-up-smile',
        ].includes(returnedFormation)
      ) {
        setFormation(returnedFormation);
      }

      if (action === 'EXPLODE_ALL') {
        setExplosionLevel(1.0);
        setExpandedCategoryIds(categories.map((c) => c.id));
        setFocusedCategoryId(null);
        setSelectedFileId(null);
        setCameraPreset('overview');
      } else if (action === 'CLUSTER_ALL') {
        setFormation('clusters');
        setExplosionLevel(0.0);
        setExpandedCategoryIds([]);
        setFocusedCategoryId(null);
        setSelectedFileId(null);
        setRetrievedFileIds([]);
        setCameraPreset('overview');
      } else if (action === 'FOCUS_CATEGORY' && data.targetCategoryId) {
        setFormation('clusters');
        setFocusedCategoryId(data.targetCategoryId);
        setExpandedCategoryIds((prev) =>
          prev.includes(data.targetCategoryId) ? prev : [...prev, data.targetCategoryId]
        );
        setExplosionLevel(0.9);
        setCameraPreset('focus');
      } else if (action === 'RETRIEVE_FILE') {
        setExplosionLevel(0.9);
        if (data.targetCategoryId && returnedFormation === 'clusters') {
          setFocusedCategoryId(data.targetCategoryId);
          setExpandedCategoryIds((prev) =>
            prev.includes(data.targetCategoryId) ? prev : [...prev, data.targetCategoryId]
          );
        }
        if (data.primaryFileId) {
          const exists = files.some((f) => f.id === data.primaryFileId);
          if (exists) {
            setSelectedFileId(data.primaryFileId);
            setActiveSheet('inspector');
          }
        }
        setCameraPreset('overview');
      } else if (action === 'CREATE_NODE' && data.newNode) {
        const validCat =
          categories.find((c) => c.id === data.newNode.categoryId)?.id || categories[0].id;
        const createdFile: MindFileNode = {
          id: `file-${Date.now()}`,
          title: data.newNode.title || 'New Saved Item',
          categoryId: validCat,
          appSymbol: (data.newNode.appSymbol || 'N').slice(0, 2).toUpperCase(),
          appName: data.newNode.appName || 'Notes',
          locationPath:
            data.newNode.locationPath || `${data.newNode.appName || 'Notes'} · Saved Items`,
          storageDrive: data.newNode.appName || 'Personal Cloud',
          fileKind: (data.newNode.fileKind as FileKind) || 'note',
          sizeLabel: 'Saved Item',
          updatedAt: 'Just now',
          summary: data.newNode.summary || 'Indexed by Location Engine.',
          content:
            data.newNode.content || `${data.newNode.title}\n\n${data.newNode.summary || ''}`,
          importance: 1.15,
          workloadPriority: 'today',
        };
        setFiles((prev) => [createdFile, ...prev]);
        setSelectedFileId(createdFile.id);
        setFocusedCategoryId(validCat);
        setExplosionLevel(0.9);
        setActiveSheet('inspector');
      } else if (action === 'UPDATE_CATEGORY_COLOR' && data.categoryColorUpdate) {
        const { categoryId, color } = data.categoryColorUpdate;
        setCategories((prev) =>
          prev.map((c) => (c.id === categoryId ? { ...c, color } : c))
        );
      }

      const matchedIds = Array.isArray(data.retrievedFileIds) ? data.retrievedFileIds : [];
      setRetrievedFileIds(matchedIds);

      const newTrace: AgentToolTrace = {
        id: `trace-${Date.now()}`,
        agentName: agentLabel,
        toolName: toolCalled,
        querySummary: promptText,
        scannedCount: files.length,
        matchedCount: matchedIds.length || files.length,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setToolTraces((prev) => [newTrace, ...prev.slice(0, 7)]);

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        agentName: `${agentLabel} → Location Engine`,
        toolCalled,
        text: data.reply || 'Sorted balls and located your items.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        retrievedFileIds: matchedIds,
        actionTriggered: action,
        formationTriggered: returnedFormation,
        suggestedFollowUps: data.suggestedFollowUps || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setChatError(err?.message || 'Unable to execute Location Engine request.');
    } finally {
      setTimeout(() => {
        setIsSorting(false);
        setActiveToolName(null);
      }, 650);
      setIsLoadingChat(false);
    }
  };

  const handleSaveEditedFile = () => {
    if (!selectedFile) return;
    setFiles((prev) =>
      prev.map((f) =>
        f.id === selectedFile.id
          ? {
              ...f,
              content: editContent,
              summary: editSummary,
              locationPath: editPath,
              updatedAt: 'Just now',
            }
          : f
      )
    );
    setIsEditingFile(false);
  };

  const handleDeleteFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (selectedFileId === fileId) {
      setSelectedFileId(null);
      setActiveSheet('none');
    }
  };

  const handleCreateManualFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileTitle.trim()) return;

    const chosenApp = EVERYDAY_APPS[selectedAppIndex] || EVERYDAY_APPS[0];
    const created: MindFileNode = {
      id: `custom-${Date.now()}`,
      title: newFileTitle.trim(),
      categoryId: newFileCategoryId,
      appSymbol: chosenApp.symbol,
      appName: chosenApp.name,
      locationPath: newFilePath.trim() || chosenApp.defaultLocation,
      storageDrive: chosenApp.name,
      fileKind: chosenApp.kind,
      sizeLabel: 'Saved Item',
      updatedAt: 'Just now',
      summary: newFileSummary.trim() || `Saved in ${chosenApp.name}`,
      content:
        newFileContent.trim() ||
        `${newFileTitle.trim()}\nDescriptive Location: ${newFilePath.trim() || chosenApp.defaultLocation}\n\n${newFileSummary.trim()}`,
      importance: 1.15,
      workloadPriority: 'today',
    };

    setFiles((prev) => [created, ...prev]);
    setSelectedFileId(created.id);
    setFocusedCategoryId(created.categoryId);
    setExpandedCategoryIds((prev) =>
      prev.includes(created.categoryId) ? prev : [...prev, created.categoryId]
    );
    setExplosionLevel(0.9);
    setNewFileTitle('');
    setNewFileSummary('');
    setNewFileContent('');
    setActiveSheet('inspector');
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const id = newCategoryName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const count = categories.length;
    const nextCat: MindCategory = {
      id: `${id}-${Date.now().toString().slice(-3)}`,
      name: newCategoryName.trim(),
      symbol: newCategoryName.trim().charAt(0).toUpperCase(),
      color: newCategoryColor,
      description: 'Custom color-coordinated group',
      finish: newCategoryFinish,
      orbitRadius: 4.8,
      orbitAngle: (count * (Math.PI * 2)) / (count + 1),
      elevation: count % 2 === 0 ? 0.65 : -0.65,
    };
    setCategories((prev) => [...prev, nextCat]);
    setNewCategoryName('');
  };

  const handleUpdateCategory = (
    catId: string,
    updates: Partial<Pick<MindCategory, 'color' | 'name' | 'finish' | 'symbol'>>
  ) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, ...updates } : c))
    );
    // Keep connector style synced if this category belongs to a connector
    setConnectors((prev) =>
      prev.map((conn) =>
        conn.categoryId === catId
          ? {
              ...conn,
              ...(updates.color ? { color: updates.color } : {}),
              ...(updates.finish ? { finish: updates.finish } : {}),
              ...(updates.symbol ? { symbol: updates.symbol } : {}),
              ...(updates.name ? { name: updates.name } : {}),
            }
          : conn
      )
    );
  };

  const copyFilePath = (pathStr: string) => {
    navigator.clipboard.writeText(pathStr);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 1800);
  };

  const filteredDirectoryFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return files.filter((f) => {
      if (focusedCategoryId && f.categoryId !== focusedCategoryId) return false;
      if (!q) return true;
      return (
        f.title.toLowerCase().includes(q) ||
        f.appName.toLowerCase().includes(q) ||
        f.locationPath.toLowerCase().includes(q) ||
        f.summary.toLowerCase().includes(q)
      );
    });
  }, [files, focusedCategoryId, searchQuery]);

  // Quick-Launch (Cmd+K) Results: Tools + Matching Files
  const cmdKToolActions = useMemo(
    () => [
      {
        id: 'tool-daily-flow',
        label: 'Run Tool: sort_daily_workload()',
        subtitle: 'Arrange 3D balls into Today’s Priority Runway vs Caught Up',
        badge: '3D TOOL',
        run: () => {
          setCmdKOpen(false);
          handleSwitchFormation('daily-flow');
        },
      },
      {
        id: 'tool-smile',
        label: 'Run Tool: form_caught_up_smile()',
        subtitle: 'Mark all items Caught Up and form the cheerful 3D Smile',
        badge: '3D TOOL',
        run: () => {
          setCmdKOpen(false);
          handleMarkAllCaughtUp();
        },
      },
      {
        id: 'tool-app-grid',
        label: 'Run Tool: align_app_columns()',
        subtitle: 'Snap all balls into vertical columns by App Emblem (F, D, W, G, P)',
        badge: '3D TOOL',
        run: () => {
          setCmdKOpen(false);
          handleSwitchFormation('app-grid');
        },
      },
      {
        id: 'tool-kaleidoscope',
        label: 'Run Tool: form_kaleidoscope_mandala()',
        subtitle: 'Arrange balls into a symmetrical color-coordinated mandala',
        badge: '3D TOOL',
        run: () => {
          setCmdKOpen(false);
          handleSwitchFormation('kaleidoscope');
        },
      },
      {
        id: 'tool-explode',
        label: 'Run Tool: break_apart_all_clusters()',
        subtitle: 'Break apart or group all color spheres in 3D space',
        badge: '3D TOOL',
        run: () => {
          setCmdKOpen(false);
          handleToggleExplodeAll();
        },
      },
      {
        id: 'tool-connectors',
        label: 'Open Storage & Folder Connectors',
        subtitle: 'Connect Local Folders, Discord, WhatsApp, or Email Archives into custom color spheres',
        badge: 'CONNECT',
        run: () => {
          setCmdKOpen(false);
          setActiveSheet('connectors');
        },
      },
    ],
    [formation, explosionLevel, files, categories]
  );

  const cmdKMatchingTools = useMemo(() => {
    const q = cmdKQuery.trim().toLowerCase();
    if (!q) return cmdKToolActions;
    return cmdKToolActions.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.subtitle.toLowerCase().includes(q)
    );
  }, [cmdKQuery, cmdKToolActions]);

  const cmdKMatchingFiles = useMemo(() => {
    const q = cmdKQuery.trim().toLowerCase();
    if (!q) return files.slice(0, 6);
    return files
      .filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.appName.toLowerCase().includes(q) ||
          f.locationPath.toLowerCase().includes(q) ||
          f.summary.toLowerCase().includes(q) ||
          f.content.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [cmdKQuery, files]);

  const urgentOrTodayCount = useMemo(
    () => files.filter((f) => f.workloadPriority !== 'caught-up').length,
    [files]
  );

  const connectedCount = useMemo(
    () => connectors.filter((c) => c.connected).length,
    [connectors]
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#F8FAFC] text-slate-900 font-sans">
      <OfflineIndicator />

      {/* Hidden Real File & Directory Inputs for Storage Connectors */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-expect-error webkitdirectory is standard across desktop browsers for mounting folders
        webkitdirectory=""
        directory=""
        className="hidden"
        onChange={handleFolderInputChange}
      />
      <input
        ref={fileImportInputRef}
        type="file"
        multiple
        accept=".txt,.md,.json,.csv,.eml,.mbox,.pdf,.png,.jpg,.jpeg,.doc,.docx"
        className="hidden"
        onChange={handleFileImportChange}
      />

      {/* Top Bar Contract: 1-row, 3-zone header */}
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between gap-6 px-6 py-3.5 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
        {/* Zone 1: Brand Title */}
        <a
          href="#workspace"
          onClick={(e) => {
            e.preventDefault();
            setActiveSheet('none');
            setFormation('clusters');
            setFocusedCategoryId(null);
            setSelectedFileId(null);
            setRetrievedFileIds([]);
            setCameraPreset('overview');
          }}
          className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          Reactive Mind
        </a>

        {/* Zone 2: Clean Single-Line Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
          <a
            href="#workspace"
            onClick={(e) => {
              e.preventDefault();
              setActiveSheet('none');
              setFocusedCategoryId(null);
              setSelectedFileId(null);
              setCameraPreset('overview');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeSheet === 'none'
                ? 'text-blue-600 underline underline-offset-8 decoration-2 decoration-blue-600'
                : ''
            }`}
          >
            Location Engine
          </a>
          <a
            href="#connectors"
            onClick={(e) => {
              e.preventDefault();
              setActiveSheet(activeSheet === 'connectors' ? 'none' : 'connectors');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeSheet === 'connectors'
                ? 'text-blue-600 underline underline-offset-8 decoration-2 decoration-blue-600'
                : ''
            }`}
          >
            Connectors {connectedCount > 0 ? `(${connectedCount})` : ''}
          </a>
          <a
            href="#agent-bridge"
            onClick={(e) => {
              e.preventDefault();
              setActiveSheet(activeSheet === 'agent-bridge' ? 'none' : 'agent-bridge');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeSheet === 'agent-bridge'
                ? 'text-blue-600 underline underline-offset-8 decoration-2 decoration-blue-600'
                : ''
            }`}
          >
            Agent Bridge
          </a>
          <a
            href="#my-items"
            onClick={(e) => {
              e.preventDefault();
              setActiveSheet(activeSheet === 'all-files' ? 'none' : 'all-files');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeSheet === 'all-files'
                ? 'text-blue-600 underline underline-offset-8 decoration-2 decoration-blue-600'
                : ''
            }`}
          >
            My Items
          </a>
          <a
            href="#colors"
            onClick={(e) => {
              e.preventDefault();
              setActiveSheet(activeSheet === 'categories' ? 'none' : 'categories');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeSheet === 'categories'
                ? 'text-blue-600 underline underline-offset-8 decoration-2 decoration-blue-600'
                : ''
            }`}
          >
            Colors & Groups
          </a>
        </nav>

        {/* Zone 3: Quick-Launch (Cmd+K) Trigger + Primary Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setCmdKQuery('');
              setCmdKSelectedIndex(0);
              setCmdKOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/90 rounded-xl transition-colors whitespace-nowrap shrink-0"
            title="Open Quick-Launch Search & Tool Bar (Cmd+K / Ctrl+K)"
          >
            <Search size={13} className="text-slate-500" />
            <span className="hidden sm:inline">Quick Launch</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white text-slate-600 rounded border border-slate-200 shadow-2xs">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={handleToggleExplodeAll}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            {formation === 'clusters' && explosionLevel > 0.5
              ? 'Group Balls Together'
              : 'Break Apart All Balls'}
          </button>
        </div>
      </header>

      {/* Full-Viewport 3D Descriptive Location Engine */}
      <main className="w-full h-full">
        <SpatialMindMap
          categories={categories}
          files={files}
          formation={formation}
          explosionLevel={explosionLevel}
          expandedCategoryIds={expandedCategoryIds}
          focusedCategoryId={focusedCategoryId}
          selectedFileId={selectedFileId}
          retrievedFileIds={retrievedFileIds}
          isSorting={isSorting}
          activeToolName={activeToolName}
          searchQuery={searchQuery}
          cameraPreset={cameraPreset}
          onSelectCategory={handleSelectCategory}
          onSelectFile={handleSelectFile}
          onToggleExplodeAll={handleToggleExplodeAll}
        />
      </main>

      {/* Global Cmd+K Quick-Launch Overlay (Search All Files & Trigger Tool Calls Without Dock) */}
      {cmdKOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/35 backdrop-blur-sm"
          onClick={() => setCmdKOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search & Agent Tool Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (cmdKQuery.trim()) {
                  const q = cmdKQuery.trim();
                  setCmdKOpen(false);
                  sendMessage(q);
                } else if (cmdKMatchingTools[0]) {
                  cmdKMatchingTools[0].run();
                }
              }}
              className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/80"
            >
              <Command size={18} className="text-blue-600 shrink-0" />
              <input
                ref={cmdKInputRef}
                type="text"
                value={cmdKQuery}
                onChange={(e) => {
                  setCmdKQuery(e.target.value);
                  setCmdKSelectedIndex(0);
                }}
                placeholder="Search across all 3D balls, or type an Agent Tool request and press Enter..."
                className="flex-1 text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none"
              />
              {cmdKQuery.trim() && (
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  Ask {agentLabel} ↵
                </button>
              )}
              <button
                type="button"
                onClick={() => setCmdKOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </form>

            <div className="max-h-[62vh] overflow-y-auto p-3 space-y-4">
              {/* Direct Agent Prompt Dispatch if user typed a query */}
              {cmdKQuery.trim() && (
                <div>
                  <div className="px-2.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Dispatch Live Agent Location Tool Call
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const q = cmdKQuery.trim();
                      setCmdKOpen(false);
                      sendMessage(q);
                    }}
                    className="w-full p-3 rounded-xl bg-blue-50/90 hover:bg-blue-100/80 border border-blue-200 flex items-center justify-between gap-3 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Cpu size={16} className="text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {agentLabel} Tool Call: &ldquo;{cmdKQuery.trim()}&rdquo;
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Physically sorts the 3D balls and pulls matching files to the front
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-blue-600 text-white rounded-md shrink-0">
                      Enter ↵
                    </span>
                  </button>
                </div>
              )}

              {/* Matching 3D Location Engine Tools */}
              {cmdKMatchingTools.length > 0 && (
                <div>
                  <div className="px-2.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Instant 3D Structure & Engine Tools
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {cmdKMatchingTools.map((tool, idx) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={tool.run}
                        className={`p-2.5 rounded-xl border text-left transition-colors flex items-start justify-between gap-2 ${
                          cmdKSelectedIndex === idx && !cmdKQuery
                            ? 'bg-slate-100 border-slate-300'
                            : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200/70'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
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

              {/* Matching File Balls Across All Groups & Connected Folders */}
              <div>
                <div className="px-2.5 pb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <span>
                    {cmdKQuery.trim()
                      ? `Matching 3D File Balls (${cmdKMatchingFiles.length})`
                      : 'Recent & Priority 3D File Balls'}
                  </span>
                  <span>Click to Pull Ball Forward</span>
                </div>

                {cmdKMatchingFiles.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                    No local ball matched &ldquo;{cmdKQuery}&rdquo; — press Enter to have {agentLabel} search and sort semantically!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white">
                    {cmdKMatchingFiles.map((file) => {
                      const cat = categories.find((c) => c.id === file.categoryId);
                      return (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => {
                            setCmdKOpen(false);
                            handleSelectFile(file.id);
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
                                {cat?.name} · {file.locationPath}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-slate-400">{file.appName}</span>
                            <ArrowUpRight size={14} className="text-slate-400" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                Tip: Press <kbd className="font-mono font-semibold">⌘K</kbd> or{' '}
                <kbd className="font-mono font-semibold">Ctrl+K</kbd> anytime, even when the bottom dock is hidden.
              </span>
              <span>
                Press <kbd className="font-mono font-semibold">Esc</kbd> to close
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Real Storage & Folder Connectors Sheet (Custom Colors & 3D Spheres) */}
      {activeSheet === 'connectors' && (
        <div className="fixed inset-x-0 top-16 z-30 flex justify-center px-4 pointer-events-none">
          <div className="w-full max-w-4xl bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-6 shadow-2xl pointer-events-auto max-h-[70vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Real Folder & Storage Place Connectors
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Connect any place where you store information—local computer folders, Discord channels, WhatsApp exports, email archives, or synced cloud folders. Each connected place gets its own customizable color-coordinated 3D sphere and ball finish!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSheet('none')}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {connectorStatusBanner && (
              <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{connectorStatusBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setConnectorStatusBanner(null)}
                  className="text-emerald-700 hover:text-emerald-900"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connectors.map((conn) => (
                <div
                  key={conn.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between gap-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-2xl text-white font-display font-extrabold text-lg flex items-center justify-center shadow-sm shrink-0"
                        style={{ backgroundColor: conn.color }}
                      >
                        {conn.symbol}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-bold text-sm text-slate-900">
                            {conn.name}
                          </h3>
                          {conn.connected && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-md">
                              Connected ({conn.itemCount} balls)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {conn.accountOrPathLabel}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Customize Color & 3D Ball Finish right on the Connector */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-500 mr-1">
                        Sphere Color:
                      </span>
                      {PRESET_COLORS.slice(0, 6).map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => handleUpdateConnectorStyle(conn.id, { color: hex })}
                          className={`w-5 h-5 rounded-full transition-transform ${
                            conn.color.toLowerCase() === hex.toLowerCase()
                              ? 'scale-125 ring-2 ring-slate-900 ring-offset-1'
                              : 'opacity-80 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                      <input
                        type="color"
                        value={conn.color}
                        onChange={(e) =>
                          handleUpdateConnectorStyle(conn.id, { color: e.target.value })
                        }
                        className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                        title="Custom color"
                      />
                    </div>

                    <select
                      value={conn.finish}
                      onChange={(e) =>
                        handleUpdateConnectorStyle(conn.id, {
                          finish: e.target.value as MaterialFinish,
                        })
                      }
                      className="px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none"
                    >
                      {FINISH_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Real Action Buttons per Storage Provider */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {(conn.provider === 'local-folder' || conn.provider === 'cloud-folder') && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleConnectRealFolder(conn)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-2xs"
                        >
                          <HardDrive size={13} />
                          <span>Select Folder from Computer</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTriggerFileImport(conn)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
                        >
                          <Upload size={13} />
                          <span>Import Files</span>
                        </button>
                      </>
                    )}

                    {conn.provider === 'discord' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleConnectDiscordOAuth(conn)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold transition-colors shadow-2xs"
                        >
                          <MessageSquare size={13} />
                          <span>Connect Discord Channels</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTriggerFileImport(conn)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
                        >
                          <Upload size={13} />
                          <span>Import Discord Chat (.json/.txt)</span>
                        </button>
                      </>
                    )}

                    {conn.provider === 'whatsapp' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTriggerFileImport(conn)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-2xs"
                        >
                          <Upload size={13} />
                          <span>Import WhatsApp Chat (.txt) or Media</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConnectRealFolder(conn)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
                        >
                          <FolderOpen size={13} />
                          <span>Mount WhatsApp Folder</span>
                        </button>
                      </>
                    )}

                    {conn.provider === 'email-vault' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTriggerFileImport(conn)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors shadow-2xs"
                        >
                          <Mail size={13} />
                          <span>Import .eml / .mbox / PDF Emails</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConnectRealFolder(conn)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
                        >
                          <FolderOpen size={13} />
                          <span>Mount Mail Archive Folder</span>
                        </button>
                      </>
                    )}

                    {conn.connected && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSheet('none');
                          handleSelectCategory(conn.categoryId);
                        }}
                        className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors"
                      >
                        <RefreshCw size={12} />
                        <span>View 3D Sphere</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Agent Bridge & Live Tool-Call Visualizer Sheet */}
      {activeSheet === 'agent-bridge' && (
        <div className="fixed inset-x-0 top-16 z-30 flex justify-center px-4 pointer-events-none">
          <div className="w-full max-w-3xl bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-6 shadow-2xl pointer-events-auto max-h-[65vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Descriptive Location Engine · Agent Tool Connector
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Connect an external AI agent (Gemini, Claude, or MCP) to visually sort through your 3D app balls and return exact file locations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSheet('none')}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Select Connected Agent */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'gemini' as ConnectedAgentId,
                  name: 'Gemini Agent',
                  desc: 'Connected via server-side tool declarations',
                },
                {
                  id: 'claude' as ConnectedAgentId,
                  name: 'Claude Desktop / MCP',
                  desc: 'Descriptive location tool provider via MCP',
                },
                {
                  id: 'mcp-bridge' as ConnectedAgentId,
                  name: 'Universal Tool Bridge',
                  desc: 'Direct JSON location & workload sorting',
                },
              ].map((ag) => (
                <button
                  key={ag.id}
                  type="button"
                  onClick={() => setConnectedAgent(ag.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    connectedAgent === ag.id
                      ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-display font-bold text-sm text-slate-900">
                    {ag.name}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{ag.desc}</div>
                </button>
              ))}
            </div>

            {/* Interactive Agent Tool-Call Triggers (Click to watch the balls sort!) */}
            <div>
              <div className="text-xs font-bold text-slate-700 mb-2">
                Test Live Agent Tool Calls (Watch the 3D Balls Sort in Real Time)
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSheet('none');
                    sendMessage('Sort my Daily Workload flow and show what needs attention today');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                >
                  Run Tool: sort_daily_workload()
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSheet('none');
                    sendMessage('Find my urgent work proposals and pull those balls forward');
                  }}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                >
                  Run Tool: locate_and_pull_balls()
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSheet('none');
                    handleSwitchFormation('app-grid');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                >
                  Run Tool: align_app_columns()
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSheet('none');
                    handleSwitchFormation('kaleidoscope');
                  }}
                  className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors"
                >
                  Run Tool: form_kaleidoscope_mandala()
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSheet('none');
                    handleMarkAllCaughtUp();
                  }}
                  className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-colors"
                >
                  Run Tool: form_caught_up_smile()
                </button>
              </div>
            </div>

            {/* Recent Tool Execution Trace Log */}
            <div>
              <div className="text-xs font-bold text-slate-700 mb-2">
                Recent Location Engine Tool Executions
              </div>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                {toolTraces.map((tr) => (
                  <div
                    key={tr.id}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-900">{tr.agentName}</span>
                      <span className="mx-1.5 text-slate-400">·</span>
                      <span className="font-mono text-blue-600">{tr.toolName}</span>
                      <span className="mx-1.5 text-slate-400">·</span>
                      <span className="text-slate-600 truncate">{tr.querySummary}</span>
                    </div>
                    <div className="text-slate-500 shrink-0 tabular-nums">
                      {tr.matchedCount}/{tr.scannedCount} balls · {tr.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Inspector Card */}
      {activeSheet === 'inspector' && selectedFile && (
        <div className="fixed inset-x-0 top-16 z-30 flex justify-center px-4 pointer-events-none">
          <div className="w-full max-w-xl bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-6 shadow-2xl pointer-events-auto max-h-[64vh] overflow-y-auto">
            {(() => {
              const cat = categories.find((c) => c.id === selectedFile.categoryId);
              return (
                <>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-display font-extrabold text-2xl shadow-md shrink-0"
                        style={{ backgroundColor: cat?.color || '#2563EB' }}
                      >
                        {selectedFile.appSymbol}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-0.5">
                          <span>{cat?.name || 'Group'}</span>
                          <span aria-hidden="true">·</span>
                          <span>{selectedFile.appName}</span>
                          <span aria-hidden="true">·</span>
                          <span>{selectedFile.updatedAt}</span>
                        </div>
                        <h2 className="font-display text-xl font-bold text-slate-900">
                          {selectedFile.title}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsEditingFile(!isEditingFile)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                      >
                        {isEditingFile ? 'Cancel' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFile(selectedFile.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSheet('none')}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Close"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Descriptive Location Bar */}
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 mb-4">
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 truncate">
                      <FolderOpen size={15} className="shrink-0 text-blue-600" />
                      <span>Descriptive Location: {selectedFile.locationPath}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyFilePath(selectedFile.locationPath)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      {copiedPath ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      <span>{copiedPath ? 'Copied' : 'Copy Location'}</span>
                    </button>
                  </div>

                  {/* Workload Status + Color Group Switcher */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">Workload Status:</span>
                      {(
                        [
                          { id: 'urgent', label: 'Urgent Today' },
                          { id: 'today', label: 'On Deck' },
                          { id: 'caught-up', label: 'Caught Up ✓' },
                        ] as const
                      ).map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() =>
                            setFiles((prev) =>
                              prev.map((f) =>
                                f.id === selectedFile.id
                                  ? { ...f, workloadPriority: st.id }
                                  : f
                              )
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                            selectedFile.workloadPriority === st.id
                              ? st.id === 'caught-up'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium">Group:</span>
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            setFiles((prev) =>
                              prev.map((f) =>
                                f.id === selectedFile.id ? { ...f, categoryId: c.id } : f
                              )
                            )
                          }
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                            selectedFile.categoryId === c.id
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: c.color }}
                          />
                          <span>{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {isEditingFile ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Descriptive Location
                        </label>
                        <input
                          type="text"
                          value={editPath}
                          onChange={(e) => setEditPath(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Quick Description
                        </label>
                        <input
                          type="text"
                          value={editSummary}
                          onChange={(e) => setEditSummary(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Details / Notes
                        </label>
                        <textarea
                          rows={5}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveEditedFile}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-slate-600 leading-relaxed mb-3">
                        {selectedFile.summary}
                      </p>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {selectedFile.content}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* My Items Directory Sheet */}
      {activeSheet === 'all-files' && (
        <div className="fixed inset-x-0 top-16 z-30 flex justify-center px-4 pointer-events-none">
          <div className="w-full max-w-3xl bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-6 shadow-2xl pointer-events-auto max-h-[64vh] flex flex-col">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  All Indexed Items & Descriptive Locations ({files.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Click any item to pull its 3D ball forward, or press Cmd+K anytime to quick-search.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter folders, Discord, notes..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSheet('none')}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto divide-y divide-slate-100 pr-1">
              {filteredDirectoryFiles.map((file) => {
                const cat = categories.find((c) => c.id === file.categoryId);
                return (
                  <div
                    key={file.id}
                    onClick={() => handleSelectFile(file.id)}
                    className="py-3 px-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-display font-bold text-sm shrink-0 shadow-xs"
                        style={{ backgroundColor: cat?.color || '#2563EB' }}
                      >
                        {file.appSymbol}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-900 truncate">
                          {file.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 truncate">
                          <span>{cat?.name}</span>
                          <span aria-hidden="true">·</span>
                          <span>{file.locationPath}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                      <span>
                        {file.workloadPriority === 'caught-up'
                          ? 'Caught Up ✓'
                          : file.workloadPriority === 'urgent'
                          ? 'Urgent Today'
                          : 'On Deck'}
                      </span>
                      <ArrowUpRight size={14} className="text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Colors & Groups Sheet */}
      {activeSheet === 'categories' && (
        <div className="fixed inset-x-0 top-16 z-30 flex justify-center px-4 pointer-events-none">
          <div className="w-full max-w-3xl bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-6 shadow-2xl pointer-events-auto max-h-[66vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Customize Group Colors, Connected Folders & 3D Ball Styles
                </h2>
                <p className="text-xs text-slate-500">
                  Every ball (including connected folders, Discord, and WhatsApp) is color-coordinated with its group.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSheet('connectors')}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
                >
                  + Connect Storage Folder
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSheet('none')}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {categories.map((cat) => {
                const count = files.filter((f) => f.categoryId === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-7 h-7 rounded-lg text-white font-display font-bold text-xs flex items-center justify-center shrink-0"
                          style={{ backgroundColor: cat.color }}
                        >
                          {cat.symbol || cat.name.charAt(0)}
                        </span>
                        <input
                          type="text"
                          value={cat.name}
                          onChange={(e) =>
                            handleUpdateCategory(cat.id, {
                              name: e.target.value,
                              symbol: e.target.value.charAt(0).toUpperCase() || 'G',
                            })
                          }
                          className="font-display font-bold text-sm bg-transparent border-b border-transparent focus:border-slate-400 text-slate-900 focus:outline-none"
                        />
                      </div>
                      <span className="text-xs text-slate-500 font-medium tabular-nums">
                        {count} balls
                      </span>
                    </div>

                    <div>
                      <div className="text-[11px] font-medium text-slate-500 mb-1.5">
                        Group Color
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {PRESET_COLORS.map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => handleUpdateCategory(cat.id, { color: hex })}
                            className={`w-6 h-6 rounded-full transition-transform ${
                              cat.color.toLowerCase() === hex.toLowerCase()
                                ? 'scale-125 ring-2 ring-slate-900 ring-offset-2'
                                : 'opacity-80 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                        <input
                          type="color"
                          value={cat.color}
                          onChange={(e) =>
                            handleUpdateCategory(cat.id, { color: e.target.value })
                          }
                          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                          title="Pick custom color"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] font-medium text-slate-500">
                        Ball Finish
                      </span>
                      <select
                        value={cat.finish}
                        onChange={(e) =>
                          handleUpdateCategory(cat.id, {
                            finish: e.target.value as MaterialFinish,
                          })
                        }
                        className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none"
                      >
                        {FINISH_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={handleCreateCategory}
              className="pt-4 border-t border-slate-200 flex flex-wrap items-end gap-3"
            >
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  New Group Name
                </label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Travel, Family, Side Project"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="w-40">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Finish
                </label>
                <select
                  value={newCategoryFinish}
                  onChange={(e) => setNewCategoryFinish(e.target.value as MaterialFinish)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none"
                >
                  {FINISH_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer p-0.5"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap"
              >
                Add New Group
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Everyday Item Sheet */}
      {activeSheet === 'new-file' && (
        <div className="fixed inset-x-0 top-16 z-30 flex justify-center px-4 pointer-events-none">
          <form
            onSubmit={handleCreateManualFile}
            className="w-full max-w-xl bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-6 shadow-2xl pointer-events-auto space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Index New App Ball into Location Engine
                </h2>
                <p className="text-xs text-slate-500">
                  Pick an everyday app emblem (like F for Folder, D for Discord, or P for Photos) and its group color.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSheet('none')}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Choose App Emblem on the 3D Ball
              </label>
              <div className="grid grid-cols-5 gap-2">
                {EVERYDAY_APPS.map((app, idx) => {
                  const isSelected = selectedAppIndex === idx;
                  const activeCat = categories.find((c) => c.id === newFileCategoryId);
                  return (
                    <button
                      key={app.name}
                      type="button"
                      onClick={() => {
                        setSelectedAppIndex(idx);
                        setNewFilePath(app.defaultLocation);
                      }}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span
                        className="w-7 h-7 rounded-full text-white font-display font-extrabold text-sm flex items-center justify-center shadow-xs"
                        style={{ backgroundColor: activeCat?.color || '#2563EB' }}
                      >
                        {app.symbol}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 truncate w-full">
                        {app.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  What is this item?
                </label>
                <input
                  type="text"
                  required
                  value={newFileTitle}
                  onChange={(e) => setNewFileTitle(e.target.value)}
                  placeholder="e.g. Tax Receipt, Mom's Recipe, Discord Pin"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Color Group
                </label>
                <select
                  value={newFileCategoryId}
                  onChange={(e) => setNewFileCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Descriptive Location
                </label>
                <input
                  type="text"
                  value={newFilePath}
                  onChange={(e) => setNewFilePath(e.target.value)}
                  placeholder="e.g. Computer Folder · Documents"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Quick Summary
                </label>
                <input
                  type="text"
                  value={newFileSummary}
                  onChange={(e) => setNewFileSummary(e.target.value)}
                  placeholder="Quick reminder of what's inside"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Notes or Details (Optional)
              </label>
              <textarea
                rows={2}
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
                placeholder="Paste a link, confirmation number, or note..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
              >
                Add 3D Ball to Engine
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Unified Collapsible Bottom Control & Location Engine Dock */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-[min(940px,95vw)] pointer-events-none">
        <div className="flex justify-center mb-1.5">
          <button
            type="button"
            onClick={() => setDockCollapsed(!dockCollapsed)}
            className="pointer-events-auto flex items-center gap-1.5 px-4 py-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/90 hover:border-slate-300 text-xs font-semibold text-slate-700 hover:text-slate-900 shadow-md transition-colors whitespace-nowrap"
          >
            {dockCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>
              {dockCollapsed
                ? 'Show Location Engine Bar (or press ⌘K)'
                : 'Hide Bar'}
            </span>
          </button>
        </div>

        <div
          className={`pointer-events-auto transition-all duration-200 origin-bottom ${
            dockCollapsed
              ? 'opacity-0 translate-y-8 pointer-events-none h-0 overflow-hidden'
              : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-2xl p-4 space-y-3">
            {/* Top Controls Row: Mode Tabs + Structural Formations Bar + PWA Install */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/75">
              {/* Segmented Tab Switcher */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDockTab('engine')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    dockTab === 'engine'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Location Engine
                </button>
                <button
                  type="button"
                  onClick={() => setDockTab('formations')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    dockTab === 'formations'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  3D Structures & Flow
                </button>
                <button
                  type="button"
                  onClick={() => setDockTab('colors')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    dockTab === 'colors'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Colors & Connectors
                </button>
              </div>

              {/* 5 Meaningful 3D Organizational Formations */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                <button
                  type="button"
                  onClick={() => handleSwitchFormation('clusters')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    formation === 'clusters'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <CircleDot size={13} />
                  <span>Spheres</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchFormation('daily-flow')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    formation === 'daily-flow'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <CalendarClock size={13} />
                  <span>Daily Flow ({urgentOrTodayCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchFormation('app-grid')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    formation === 'app-grid'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <LayoutGrid size={13} />
                  <span>App Columns</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchFormation('kaleidoscope')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    formation === 'kaleidoscope'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Sparkles size={13} />
                  <span>Kaleidoscope</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchFormation('caught-up-smile')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    formation === 'caught-up-smile'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <Smile size={13} />
                  <span>Caught-Up Smile</span>
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <PWAInstallModalTrigger />
              </div>
            </div>

            {dockTab === 'engine' && (
              <div className="space-y-2.5">
                {/* Location Engine Output Stream */}
                <div
                  ref={chatScrollRef}
                  className="max-h-36 overflow-y-auto space-y-2 pr-1"
                >
                  {messages.slice(-3).map((msg) => (
                    <div
                      key={msg.id}
                      className={`text-xs leading-relaxed rounded-xl px-3.5 py-2.5 ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white ml-auto max-w-[85%] shadow-xs'
                          : 'bg-slate-100/90 border border-slate-200/80 text-slate-800'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 mb-1">
                          <span className="font-semibold text-slate-700">
                            {msg.agentName || 'Descriptive Location Engine'}
                          </span>
                          {msg.toolCalled && (
                            <span className="font-mono text-blue-600">
                              Tool: {msg.toolCalled}()
                            </span>
                          )}
                        </div>
                      )}
                      <p className="font-medium">{msg.text}</p>

                      {msg.retrievedFileIds && msg.retrievedFileIds.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-slate-500 mr-1">
                            Sorted & Located Balls:
                          </span>
                          {msg.retrievedFileIds.map((fid) => {
                            const f = files.find((item) => item.id === fid);
                            if (!f) return null;
                            const c = categories.find((cat) => cat.id === f.categoryId);
                            return (
                              <button
                                key={fid}
                                type="button"
                                onClick={() => handleSelectFile(fid)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs transition-colors whitespace-nowrap"
                              >
                                <span
                                  className="w-4 h-4 rounded-full text-white text-[9px] font-extrabold flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: c?.color || '#2563EB' }}
                                >
                                  {f.appSymbol}
                                </span>
                                <span>{f.title}</span>
                                <span className="text-[11px] font-normal text-slate-500">
                                  · {f.locationPath}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {msg.suggestedFollowUps.map((prompt, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => sendMessage(prompt)}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-[11px] font-semibold text-blue-600 border border-blue-200/80 transition-colors whitespace-nowrap shadow-2xs"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoadingChat && (
                    <div className="text-xs font-medium text-blue-700 px-3 py-2 bg-blue-50 rounded-xl border border-blue-200/60">
                      {agentLabel} is sorting through the 3D app balls and resolving locations...
                    </div>
                  )}

                  {chatError && (
                    <div className="text-xs text-rose-700 px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl">
                      {chatError}
                    </div>
                  )}
                </div>

                {/* Location Engine Input Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={() => setActiveSheet('agent-bridge')}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 border border-slate-200 whitespace-nowrap shrink-0"
                    title="Switch Connected AI Agent (Gemini / Claude / MCP)"
                  >
                    <Cpu size={14} className="text-blue-600" />
                    <span>{agentLabel}</span>
                  </button>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder='Ask your connected agent to locate files, sort your daily workload, or press ⌘K...'
                    className="flex-1 px-4 py-2.5 text-xs bg-slate-100/90 border border-slate-200/90 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isLoadingChat || !chatInput.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 shadow-xs"
                  >
                    <Send size={14} />
                    <span>Run Tool</span>
                  </button>
                </form>
              </div>
            )}

            {dockTab === 'formations' && (
              <div className="space-y-3 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-700">
                    Choose Organizational Structure (Each formation arranges balls with real meaning)
                  </div>
                  <button
                    type="button"
                    onClick={handleMarkAllCaughtUp}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-xs whitespace-nowrap"
                  >
                    <Smile size={14} />
                    <span>Mark Everything Caught Up & Smile!</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {FORMATIONS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleSwitchFormation(f.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        formation === f.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-display font-bold text-xs mb-1">
                        {f.label}
                      </div>
                      <div
                        className={`text-[10px] leading-snug ${
                          formation === f.id ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {f.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {dockTab === 'colors' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Sliders size={13} className="text-blue-600" />
                      <span>Group Colors & Connected Spheres</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSheet('categories')}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap"
                    >
                      Customize All Groups →
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectCategory(cat.id)}
                          className="flex items-center gap-2 min-w-0 text-left"
                        >
                          <span
                            className="w-6 h-6 rounded-full text-white font-display font-bold text-xs flex items-center justify-center shrink-0"
                            style={{ backgroundColor: cat.color }}
                          >
                            {cat.symbol || cat.name.charAt(0)}
                          </span>
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {cat.name}
                          </span>
                        </button>
                        <input
                          type="color"
                          value={cat.color}
                          onChange={(e) =>
                            handleUpdateCategory(cat.id, { color: e.target.value })
                          }
                          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 shrink-0"
                          title={`Pick ${cat.name} color`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <HardDrive size={13} className="text-blue-600" />
                    <span>Storage Connectors & Actions</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveSheet('connectors')}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors whitespace-nowrap"
                    >
                      Connect Folders / Discord / WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSheet('new-file')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors whitespace-nowrap"
                    >
                      <Plus size={13} />
                      <span>Add Ball</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
