/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  Send,
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
  HardDrive,
  Radio,
} from 'lucide-react';
import { SpatialMindMap } from './components/SpatialMindMap';
import { ConnectorsModal } from './components/ConnectorsModal';
import { QuickLaunchModal } from './components/QuickLaunchModal';
import { PWAInstallModalTrigger, OfflineIndicator } from './components/PWAInstallButton';
import { useAgentBridge } from './hooks/useAgentBridge';
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
  MCPCommandPayload,
  MCPToolName,
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
  { symbol: 'G', name: 'Gmail', defaultLocation: 'Gmail · Starred Inbox', kind: 'email' },
  { symbol: 'D', name: 'Discord', defaultLocation: 'Discord · Saved Channels & Pins', kind: 'chat' },
  { symbol: 'W', name: 'WhatsApp', defaultLocation: 'WhatsApp · Starred Messages', kind: 'chat' },
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
    desc: 'Grouped into Work, Personal, Skills, Storage, and Imported Directories',
  },
  {
    id: 'daily-flow',
    label: 'Daily Workload',
    desc: 'Sorted by Today’s Priority (Front Row) vs Caught Up (Calm Back Arc)',
  },
  {
    id: 'app-grid',
    label: 'App Columns',
    desc: 'Lined up by App emblem (F Folder, G Gmail, D Discord, W WhatsApp)',
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
    name: 'Local Directory',
    provider: 'local-folder',
    symbol: 'F',
    color: '#06B6D4',
    finish: 'pearl',
    categoryId: 'conn-group-local',
    connected: false,
    accountOrPathLabel: 'Native File System Access API (showDirectoryPicker)',
    itemCount: 0,
    lastSynced: 'Not connected',
  },
  {
    id: 'conn-gmail',
    name: 'Gmail Readonly API',
    provider: 'gmail',
    symbol: 'G',
    color: '#EA4335',
    finish: 'glass',
    categoryId: 'conn-group-gmail',
    connected: false,
    accountOrPathLabel: 'OAuth 2.0 https://www.googleapis.com/auth/gmail.readonly',
    itemCount: 0,
    lastSynced: 'Not connected',
  },
  {
    id: 'conn-discord',
    name: 'Discord Archive',
    provider: 'discord',
    symbol: 'D',
    color: '#5865F2',
    finish: 'glass',
    categoryId: 'conn-group-discord',
    connected: false,
    accountOrPathLabel: 'Import real Discord channel JSON/TXT messages',
    itemCount: 0,
    lastSynced: 'Not connected',
  },
  {
    id: 'conn-whatsapp',
    name: 'WhatsApp Export',
    provider: 'whatsapp',
    symbol: 'W',
    color: '#10B981',
    finish: 'pearl',
    categoryId: 'conn-group-whatsapp',
    connected: false,
    accountOrPathLabel: 'Import real WhatsApp exported .txt chat files',
    itemCount: 0,
    lastSynced: 'Not connected',
  },
  {
    id: 'conn-email-vault',
    name: 'Email Archive (.eml / .mbox)',
    provider: 'email-vault',
    symbol: 'M',
    color: '#EC4899',
    finish: 'metal',
    categoryId: 'conn-group-email',
    connected: false,
    accountOrPathLabel: 'Import local .eml or .mbox email files',
    itemCount: 0,
    lastSynced: 'Not connected',
  },
];

export const App: React.FC = () => {
  const [categories, setCategories] = useState<MindCategory[]>(() => {
    const saved = localStorage.getItem('reactive_mind_categories_v5');
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
    const saved = localStorage.getItem('reactive_mind_files_v5');
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
    const saved = localStorage.getItem('reactive_mind_connectors_v5');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_CONNECTORS;
      }
    }
    return INITIAL_CONNECTORS;
  });

  // 1. UI Refactor: Dockable Drawer Collapse State (isDockCollapsed defaults to false)
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [dockTab, setDockTab] = useState<'engine' | 'formations' | 'colors'>('engine');

  // Modals at z-50
  const [isConnectorsOpen, setIsConnectorsOpen] = useState<boolean>(false);
  const [isQuickLaunchOpen, setIsQuickLaunchOpen] = useState<boolean>(false);
  const [quickLaunchQuery, setQuickLaunchQuery] = useState<string>('');
  const [quickLaunchIndex, setQuickLaunchIndex] = useState<number>(0);

  // 3D Location Engine State
  const [formation, setFormation] = useState<FormationMode>('clusters');
  const [explosionLevel, setExplosionLevel] = useState<number>(0.3);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
  const [focusedCategoryId, setFocusedCategoryId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [retrievedFileIds, setRetrievedFileIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cameraPreset, setCameraPreset] = useState<'overview' | 'top' | 'focus'>('overview');

  // Mutable 3D Coordinate Overrides Ref (kept out of high-frequency React render loops)
  const coordinateOverridesRef = useRef<Record<string, [number, number, number]>>({});

  // Agent & MCP Bridge State
  const [connectedAgent, setConnectedAgent] = useState<ConnectedAgentId>('gemini');
  const [externalWsUrl, setExternalWsUrl] = useState<string>('');
  const [isSorting, setIsSorting] = useState<boolean>(false);
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  const [toolTraces, setToolTraces] = useState<AgentToolTrace[]>([
    {
      id: 'trace-init',
      agentName: 'MCP Bridge',
      toolName: 'init_location_engine',
      querySummary: 'Connected SSE MCP stream and indexed 3D spatial nodes',
      scannedCount: 17,
      matchedCount: 17,
      timestamp: 'Ready',
    },
  ]);

  const [activeSheet, setActiveSheet] = useState<
    'none' | 'inspector' | 'all-files' | 'categories' | 'new-file' | 'agent-bridge'
  >('none');

  const [chatInput, setChatInput] = useState<string>('');
  const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      agentName: 'Gemini → Location Engine',
      toolCalled: 'mcp_stream_connected',
      text: 'Descriptive Location Engine ready. Press Cmd+K (or Ctrl+K) to search all nodes or dispatch MCP tool calls (sort_spheres, highlight_node, query_cluster), or open Connectors to ingest a real local directory via File System Access API.',
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

  // New Item Form State
  const [newFileTitle, setNewFileTitle] = useState<string>('');
  const [newFileCategoryId, setNewFileCategoryId] = useState<string>('work');
  const [selectedAppIndex, setSelectedAppIndex] = useState<number>(0);
  const [newFilePath, setNewFilePath] = useState<string>('Computer Folder · Documents');
  const [newFileSummary, setNewFileSummary] = useState<string>('');
  const [newFileContent, setNewFileContent] = useState<string>('');

  // New Category Form State
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [newCategoryColor, setNewCategoryColor] = useState<string>('#EC4899');
  const [newCategoryFinish, setNewCategoryFinish] = useState<MaterialFinish>('pearl');

  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('reactive_mind_categories_v5', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('reactive_mind_files_v5', JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    localStorage.setItem('reactive_mind_connectors_v5', JSON.stringify(connectors));
  }, [connectors]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoadingChat]);

  const agentLabel =
    connectedAgent === 'gemini'
      ? 'Gemini'
      : connectedAgent === 'claude'
      ? 'Claude'
      : 'MCP Tool Bridge';

  // Handle incoming structured MCP Tool Calls (sort_spheres, highlight_node, query_cluster)
  // Mutates 3D coordinates via coordinateOverridesRef without high-frequency React re-render loops
  const handleIncomingMCPCommand = useCallback(
    (cmd: MCPCommandPayload) => {
      const { tool, params, agentName } = cmd;
      setIsSorting(true);
      setActiveToolName(`${tool}()`);

      if (tool === 'sort_spheres') {
        // Clear any single-node coordinate overrides unless explicit coordinates map was provided
        coordinateOverridesRef.current = params.coordinates ? { ...params.coordinates } : {};
        const nextFormation = params.formation || 'daily-flow';
        setFormation(nextFormation);
        if (typeof params.explosionLevel === 'number') {
          setExplosionLevel(params.explosionLevel);
        } else if (nextFormation === 'clusters') {
          setExplosionLevel(0.9);
        }
        setSelectedFileId(null);
        setFocusedCategoryId(null);

        setToolTraces((prev) => [
          {
            id: cmd.id || `mcp-${Date.now()}`,
            agentName: agentName || agentLabel,
            toolName: `sort_spheres(${nextFormation})`,
            querySummary: `Mutated 3D sphere coordinates into "${nextFormation}" structure`,
            scannedCount: files.length,
            matchedCount: files.length,
            timestamp: cmd.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev.slice(0, 7),
        ]);
      } else if (tool === 'highlight_node') {
        const targetId = params.nodeId;
        const targetNode = files.find((f) => f.id === targetId) || files[0];
        if (targetNode) {
          // Mutate coordinate override ref to pull highlighted node to front inspection stage
          coordinateOverridesRef.current = {
            ...coordinateOverridesRef.current,
            [targetNode.id]: [0, 0.85, 4.1],
            ...(params.coordinates || {}),
          };
          setSelectedFileId(targetNode.id);
          setRetrievedFileIds([targetNode.id]);
          setFocusedCategoryId(targetNode.categoryId);
          setExpandedCategoryIds((prev) =>
            prev.includes(targetNode.categoryId) ? prev : [...prev, targetNode.categoryId]
          );
          setCameraPreset('focus');
          setActiveSheet('inspector');

          setToolTraces((prev) => [
            {
              id: cmd.id || `mcp-${Date.now()}`,
              agentName: agentName || agentLabel,
              toolName: `highlight_node("${targetNode.id}")`,
              querySummary: `Highlighted "${targetNode.title}" at front 3D coordinate [0, 0.85, 4.1]`,
              scannedCount: files.length,
              matchedCount: 1,
              timestamp: cmd.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
            ...prev.slice(0, 7),
          ]);
        }
      } else if (tool === 'query_cluster') {
        coordinateOverridesRef.current = params.coordinates ? { ...params.coordinates } : {};
        setFormation('clusters');
        const q = (params.query || '').trim().toLowerCase();
        const clusterId = params.clusterId;

        let matched: MindFileNode[] = [];
        if (clusterId) {
          matched = files.filter((f) => f.categoryId === clusterId);
          setFocusedCategoryId(clusterId);
          setExpandedCategoryIds((prev) =>
            prev.includes(clusterId) ? prev : [...prev, clusterId]
          );
        } else if (q) {
          matched = files.filter(
            (f) =>
              f.title.toLowerCase().includes(q) ||
              f.appName.toLowerCase().includes(q) ||
              f.locationPath.toLowerCase().includes(q) ||
              f.summary.toLowerCase().includes(q) ||
              (f.metadata?.relativePath || '').toLowerCase().includes(q)
          );
        }

        // Arrange matched cluster nodes along a front arc via coordinateOverridesRef
        if (matched.length > 0) {
          const nextCoords: Record<string, [number, number, number]> = {};
          const count = Math.min(matched.length, 10);
          const span = Math.min(count * 1.4, 8.2);
          matched.slice(0, count).forEach((node, idx) => {
            const x = count === 1 ? 0 : -span / 2 + (idx / (count - 1)) * span;
            const y = Math.sin((idx / Math.max(count - 1, 1)) * Math.PI) * 0.5 + 0.55;
            nextCoords[node.id] = [x, y, 3.7];
          });
          coordinateOverridesRef.current = nextCoords;
        }

        setExplosionLevel(params.explosionLevel ?? 0.95);
        setRetrievedFileIds(matched.map((m) => m.id));
        setCameraPreset(clusterId ? 'focus' : 'overview');

        setToolTraces((prev) => [
          {
            id: cmd.id || `mcp-${Date.now()}`,
            agentName: agentName || agentLabel,
            toolName: `query_cluster(${clusterId || q || 'all'})`,
            querySummary: `Queried cluster and staged ${matched.length} matching 3D spheres`,
            scannedCount: files.length,
            matchedCount: matched.length,
            timestamp: cmd.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev.slice(0, 7),
        ]);
      }

      setTimeout(() => {
        setIsSorting(false);
        setActiveToolName(null);
      }, 650);
    },
    [files, agentLabel]
  );

  const { sseConnected, wsConnected, clientId, dispatchMCPCommand } = useAgentBridge({
    onCommand: handleIncomingMCPCommand,
    externalWsUrl,
  });

  // Global Cmd+K / Ctrl+K shortcut + Escape / H handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickLaunchOpen((prev) => {
          const next = !prev;
          if (next) {
            setQuickLaunchQuery('');
            setQuickLaunchIndex(0);
          }
          return next;
        });
        return;
      }

      if (e.key === 'Escape') {
        if (isQuickLaunchOpen) {
          e.preventDefault();
          setIsQuickLaunchOpen(false);
          return;
        }
        if (isConnectorsOpen) {
          e.preventDefault();
          setIsConnectorsOpen(false);
          return;
        }
        setActiveSheet('none');
        return;
      }

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key.toLowerCase() === 'h') {
        setIsDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickLaunchOpen, isConnectorsOpen]);

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

  const handleDispatchMCP = useCallback(
    (tool: MCPToolName, params: MCPCommandPayload['params']) => {
      dispatchMCPCommand(tool, params, agentLabel).catch(() => {
        // Fallback direct execution if offline
        handleIncomingMCPCommand({
          id: `local-${Date.now()}`,
          tool,
          params,
          agentName: agentLabel,
        });
      });
    },
    [dispatchMCPCommand, handleIncomingMCPCommand, agentLabel]
  );

  const handleSwitchFormation = (nextFormation: FormationMode) => {
    handleDispatchMCP('sort_spheres', { formation: nextFormation });
  };

  const handleMarkAllCaughtUp = () => {
    setFiles((prev) =>
      prev.map((f) => ({ ...f, workloadPriority: 'caught-up' }))
    );
    handleDispatchMCP('sort_spheres', { formation: 'caught-up-smile' });
  };

  const handleToggleExplodeAll = () => {
    coordinateOverridesRef.current = {};
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
      setExplosionLevel(1.0);
      setExpandedCategoryIds(categories.map((c) => c.id));
      setCameraPreset('overview');
    }
  };

  const handleSelectCategory = (categoryId: string) => {
    coordinateOverridesRef.current = {};
    setFormation('clusters');
    if (focusedCategoryId === categoryId) {
      setFocusedCategoryId(null);
      setExpandedCategoryIds((prev) => prev.filter((id) => id !== categoryId));
      setCameraPreset('overview');
    } else {
      handleDispatchMCP('query_cluster', { clusterId: categoryId, explosionLevel: 0.95 });
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

  // Ingest real parsed directory/files or Gmail API messages into the 3D scene
  const handleIngestDirectoryAndFiles = (
    connectorId: string,
    category: MindCategory,
    newNodes: MindFileNode[],
    sourceLabel: string
  ) => {
    coordinateOverridesRef.current = {};
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === category.id);
      if (exists) {
        return prev.map((c) => (c.id === category.id ? category : c));
      }
      return [...prev, category];
    });

    setFiles((prev) => {
      const existingIds = new Set(newNodes.map((n) => n.id));
      const filtered = prev.filter((f) => !existingIds.has(f.id));
      return [...newNodes, ...filtered];
    });

    setConnectors((prev) =>
      prev.map((c) =>
        c.id === connectorId
          ? {
              ...c,
              categoryId: category.id,
              connected: true,
              accountOrPathLabel: sourceLabel,
              itemCount: newNodes.length,
              lastSynced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          : c
      )
    );

    setFormation('clusters');
    setFocusedCategoryId(category.id);
    setExpandedCategoryIds((prev) =>
      prev.includes(category.id) ? prev : [...prev, category.id]
    );
    setExplosionLevel(0.95);
    setRetrievedFileIds(newNodes.slice(0, 8).map((n) => n.id));
    setCameraPreset('focus');

    setToolTraces((prev) => [
      {
        id: `ingest-${Date.now()}`,
        agentName: 'Filesystem Ingestor',
        toolName: 'mapDirectoryEntriesToSceneNodes',
        querySummary: `Ingested ${newNodes.length} real nodes from ${sourceLabel}`,
        scannedCount: newNodes.length,
        matchedCount: newNodes.length,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev.slice(0, 7),
    ]);
  };

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
    coordinateOverridesRef.current = {};

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
      const toolCalled = data.toolCalled || 'sort_spheres';

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
        f.summary.toLowerCase().includes(q) ||
        (f.metadata?.relativePath || '').toLowerCase().includes(q)
      );
    });
  }, [files, focusedCategoryId, searchQuery]);

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

      {/* Top Bar Contract: 1-row, 3-zone header */}
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between gap-6 px-6 py-3.5 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
        {/* Zone 1: Brand Title */}
        <a
          href="#workspace"
          onClick={(e) => {
            e.preventDefault();
            coordinateOverridesRef.current = {};
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
              coordinateOverridesRef.current = {};
              setActiveSheet('none');
              setFocusedCategoryId(null);
              setSelectedFileId(null);
              setCameraPreset('overview');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeSheet === 'none' && !isConnectorsOpen
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
              setIsConnectorsOpen(true);
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              isConnectorsOpen
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
            My Items ({files.length})
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
            Colors &amp; Groups
          </a>
        </nav>

        {/* Zone 3: Quick-Launch (Cmd+K) Trigger + Primary Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setQuickLaunchQuery('');
              setQuickLaunchIndex(0);
              setIsQuickLaunchOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/90 rounded-xl transition-colors whitespace-nowrap shrink-0"
            title="Open Quick-Launch Search & MCP Tool Bar (Cmd+K / Ctrl+K)"
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

      {/* Full-Viewport 3D Descriptive Location Engine (retains full pointer events behind collapsed dock) */}
      <main className="w-full h-full pointer-events-auto">
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
          coordinateOverridesRef={coordinateOverridesRef}
          onSelectCategory={handleSelectCategory}
          onSelectFile={handleSelectFile}
          onToggleExplodeAll={handleToggleExplodeAll}
        />
      </main>

      {/* Modal 1 (z-50): Global Cmd+K QuickLaunchModal */}
      <QuickLaunchModal
        isOpen={isQuickLaunchOpen}
        onClose={() => setIsQuickLaunchOpen(false)}
        query={quickLaunchQuery}
        onQueryChange={setQuickLaunchQuery}
        selectedIndex={quickLaunchIndex}
        onSelectIndex={setQuickLaunchIndex}
        agentLabel={agentLabel}
        categories={categories}
        files={files}
        onSelectFile={handleSelectFile}
        onSendMessage={sendMessage}
        onDispatchMCP={handleDispatchMCP}
        onOpenConnectors={() => setIsConnectorsOpen(true)}
      />

      {/* Modal 2 (z-50): ConnectorsModal (Real Local Directory Ingestion + Gmail OAuth 2.0 Config) */}
      <ConnectorsModal
        isOpen={isConnectorsOpen}
        onClose={() => setIsConnectorsOpen(false)}
        categories={categories}
        connectors={connectors}
        onIngestDirectoryAndFiles={handleIngestDirectoryAndFiles}
        onUpdateConnectorStyle={handleUpdateConnectorStyle}
        onFocusCategory={(catId) => {
          setFormation('clusters');
          setFocusedCategoryId(catId);
          setExpandedCategoryIds((prev) => (prev.includes(catId) ? prev : [...prev, catId]));
          setExplosionLevel(0.95);
          setCameraPreset('focus');
        }}
      />

      {/* Agent Bridge & Live MCP Protocol Sheet */}
      {activeSheet === 'agent-bridge' && (
        <div className="fixed inset-x-0 top-16 z-30 flex justify-center px-4 pointer-events-none">
          <div className="w-full max-w-3xl bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-6 shadow-2xl pointer-events-auto max-h-[66vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    Model Context Protocol (MCP) &amp; Agent Bridge
                  </h2>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md flex items-center gap-1 ${
                      sseConnected
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <Radio size={11} />
                    <span>{sseConnected ? `SSE Connected (${clientId || 'live'})` : 'Connecting...'}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Listens in real time to <code className="font-mono">/api/mcp/stream</code> and optional local WebSocket servers for <code className="font-mono">sort_spheres</code>, <code className="font-mono">highlight_node</code>, and <code className="font-mono">query_cluster</code> commands.
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

            {/* External Local MCP WebSocket Server Input */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs">
                <div className="font-bold text-slate-800">
                  Optional External Local MCP WebSocket Server
                </div>
                <div className="text-slate-500 text-[11px]">
                  Connect directly to a local MCP agent socket (e.g. <code className="font-mono">ws://localhost:8765/mcp</code>)
                </div>
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <input
                  type="text"
                  value={externalWsUrl}
                  onChange={(e) => setExternalWsUrl(e.target.value)}
                  placeholder="ws://localhost:8765/mcp"
                  className="flex-1 px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                />
                <span
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg ${
                    wsConnected
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {wsConnected ? 'WS LIVE' : 'WS IDLE'}
                </span>
              </div>
            </div>

            {/* Select Connected Agent */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'gemini' as ConnectedAgentId,
                  name: 'Gemini Agent',
                  desc: 'Server-side tool declarations via /api/mindmap/chat',
                },
                {
                  id: 'claude' as ConnectedAgentId,
                  name: 'Claude Desktop / MCP',
                  desc: 'Real-time SSE & POST /api/mcp/command bridge',
                },
                {
                  id: 'mcp-bridge' as ConnectedAgentId,
                  name: 'Universal MCP Bridge',
                  desc: 'Direct 3D coordinate mutation via useAgentBridge',
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

            {/* Dispatch Structured MCP Commands */}
            <div>
              <div className="text-xs font-bold text-slate-700 mb-2">
                Dispatch Live MCP Tool Calls over <code className="font-mono">/api/mcp/command</code>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSheet('none');
                    handleDispatchMCP('sort_spheres', { formation: 'daily-flow' });
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-semibold transition-colors"
                >
                  sort_spheres({`{ formation: "daily-flow" }`})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSheet('none');
                    handleDispatchMCP('highlight_node', {
                      nodeId: files[0]?.id || 'work-gmail-proposal',
                    });
                  }}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-semibold transition-colors"
                >
                  highlight_node({`{ nodeId: "${files[0]?.id || 'work-gmail-proposal'}" }`})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSheet('none');
                    handleDispatchMCP('query_cluster', {
                      clusterId: 'work',
                      explosionLevel: 0.95,
                    });
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono font-semibold transition-colors"
                >
                  query_cluster({`{ clusterId: "work" }`})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSheet('none');
                    handleDispatchMCP('sort_spheres', { formation: 'kaleidoscope' });
                  }}
                  className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-mono font-semibold transition-colors"
                >
                  sort_spheres({`{ formation: "kaleidoscope" }`})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSheet('none');
                    handleMarkAllCaughtUp();
                  }}
                  className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-mono font-semibold transition-colors"
                >
                  sort_spheres({`{ formation: "caught-up-smile" }`})
                </button>
              </div>
            </div>

            {/* Recent Tool Execution Trace Log */}
            <div>
              <div className="text-xs font-bold text-slate-700 mb-2">
                Live MCP &amp; Location Engine Execution Log
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
                      {tr.matchedCount}/{tr.scannedCount} nodes · {tr.timestamp}
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
                          <span>{selectedFile.sizeLabel}</span>
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

                  {/* Descriptive Location & Real File Metadata Bar */}
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 mb-3">
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 truncate">
                      <FolderOpen size={15} className="shrink-0 text-blue-600" />
                      <span>
                        {selectedFile.metadata?.relativePath || selectedFile.locationPath}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyFilePath(
                          selectedFile.metadata?.relativePath || selectedFile.locationPath
                        )
                      }
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      {copiedPath ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      <span>{copiedPath ? 'Copied' : 'Copy Path'}</span>
                    </button>
                  </div>

                  {selectedFile.metadata && (
                    <div className="grid grid-cols-3 gap-2 mb-4 text-[11px] bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/60">
                      <div>
                        <span className="text-slate-400 block">MIME Type</span>
                        <span className="font-mono font-semibold text-slate-700">
                          {selectedFile.metadata.mimeType}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Exact Size</span>
                        <span className="font-mono font-semibold text-slate-700">
                          {selectedFile.metadata.sizeBytes.toLocaleString()} bytes
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Modified ISO</span>
                        <span className="font-mono font-semibold text-slate-700">
                          {selectedFile.metadata.lastModifiedISO.slice(0, 10)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Workload Status + Color Group Switcher */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">Workload:</span>
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
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-mono">
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
                  All Indexed Items &amp; Real File Metadata ({files.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Click any node to highlight it in 3D space, or press Cmd+K to search from anywhere.
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
                    placeholder="Filter files, paths, MIME..."
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
                          <span className="font-mono text-[11px]">
                            {file.metadata?.relativePath || file.locationPath}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                      <span className="font-mono text-[11px]">{file.sizeLabel}</span>
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
                  Customize Group Colors, Imported Directories &amp; 3D Ball Styles
                </h2>
                <p className="text-xs text-slate-500">
                  Every ball is color-coordinated with its group sphere.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSheet('none');
                    setIsConnectorsOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
                >
                  + Import Local Directory
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
                  Pick an app emblem and group color for the new 3D sphere.
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
                  placeholder="e.g. Tax Receipt, Mom's Recipe"
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

      {/*
        SECTION 1. UI REFACTOR: DOCKABLE DRAWER SYSTEM
        - Fixed at bottom center: fixed bottom-0 left-1/2 -translate-x-1/2 z-40
        - Smooth transition: transition-transform duration-300 ease-in-out
        - Collapsed: translate-y-[calc(100%-38px)] so only the 38px integrated header bar remains visible above viewport edge
        - Expanded: translate-y-0
      */}
      <div
        className={`fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-[min(940px,95vw)] transition-transform duration-300 ease-in-out ${
          isDockCollapsed ? 'translate-y-[calc(100%-38px)]' : 'translate-y-0'
        }`}
      >
        <div className="bg-white/95 backdrop-blur-xl border-t border-x border-slate-200/95 rounded-t-2xl shadow-2xl overflow-hidden">
          {/* Integrated 38px Header Bar attached flush to the top edge of the dock */}
          <button
            type="button"
            onClick={() => setIsDockCollapsed((prev) => !prev)}
            className="w-full h-[38px] px-4 bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-between gap-4 cursor-pointer select-none transition-colors"
            aria-expanded={!isDockCollapsed}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase bg-blue-600 text-white rounded">
                REACTIVE MIND DOCK
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300 truncate">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    sseConnected ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span>
                  {sseConnected
                    ? `MCP Ready · ${files.length} Nodes · ${formation}`
                    : `${files.length} Nodes Indexed`}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 shrink-0">
              <span className="hidden sm:inline text-[11px] text-slate-400">
                {isDockCollapsed ? 'Click to Expand Workspace Controls' : 'Click to Collapse Drawer'}
              </span>
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-800 text-white">
                {isDockCollapsed ? '▲' : '▼'}
              </span>
            </div>
          </button>

          {/* Dock Drawer Content Body */}
          <div className="p-4 space-y-3">
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
                  3D Structures &amp; Flow
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
                  Colors &amp; Connectors
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
                <div
                  ref={chatScrollRef}
                  className="max-h-32 overflow-y-auto space-y-2 pr-1"
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
                            Sorted &amp; Located Nodes:
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
                      {agentLabel} is sorting through the 3D spheres and resolving locations...
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
                    title="Open MCP & Agent Bridge"
                  >
                    <Cpu size={14} className="text-blue-600" />
                    <span>{agentLabel}</span>
                  </button>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask your connected agent to locate files, sort your daily workload, or press ⌘K..."
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
                    Choose Organizational Structure (Dispatches MCP <code className="font-mono">sort_spheres</code>)
                  </div>
                  <button
                    type="button"
                    onClick={handleMarkAllCaughtUp}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-xs whitespace-nowrap"
                  >
                    <Smile size={14} />
                    <span>Mark Everything Caught Up &amp; Smile!</span>
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
                      <span>Group Colors &amp; Connected Spheres</span>
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
                    <span>Data Connectors &amp; Ingestion</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsConnectorsOpen(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors whitespace-nowrap"
                    >
                      Import Directory / Gmail OAuth
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
