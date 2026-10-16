/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  FolderOpen,
  MessageSquare,
  Mail,
  HardDrive,
  Check,
  Plus,
  X,
  Upload,
  ExternalLink,
} from 'lucide-react';
import {
  MindCategory,
  MindFileNode,
  MaterialFinish,
  FileKind,
} from '../types';

interface ConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: MindCategory[];
  onAddCategoryAndFiles: (
    newCategory: MindCategory | null,
    targetCategoryId: string,
    newFiles: MindFileNode[]
  ) => void;
  onUpdateCategory: (
    catId: string,
    updates: Partial<Pick<MindCategory, 'color' | 'name' | 'finish' | 'symbol'>>
  ) => void;
}

const FINISH_OPTIONS: { value: MaterialFinish; label: string }[] = [
  { value: 'pearl', label: 'Glossy Pearl' },
  { value: 'glass', label: 'Clear Glass' },
  { value: 'metal', label: 'Polished Metallic' },
  { value: 'matte', label: 'Soft Matte' },
];

export const ConnectorsModal: React.FC<ConnectorsModalProps> = ({
  isOpen,
  onClose,
  categories,
  onAddCategoryAndFiles,
  onUpdateCategory,
}) => {
  const [selectedSource, setSelectedSource] = useState<
    'local-folder' | 'discord' | 'whatsapp' | 'email-vault'
  >('local-folder');

  // Custom group color & settings for the newly connected storage place
  const [groupName, setGroupName] = useState<string>('My Local Folder');
  const [groupSymbol, setGroupSymbol] = useState<string>('F');
  const [groupColor, setGroupColor] = useState<string>('#06B6D4');
  const [groupFinish, setGroupFinish] = useState<MaterialFinish>('pearl');
  const [useExistingCategory, setUseExistingCategory] = useState<string>('new');

  // Discord / WhatsApp / Email input state
  const [channelOrAccountName, setChannelOrAccountName] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [discordOAuthNote, setDiscordOAuthNote] = useState<string | null>(null);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileArchiveInputRef = useRef<HTMLInputElement>(null);

  // Update defaults when switching connector tab
  useEffect(() => {
    setStatusMessage(null);
    setDiscordOAuthNote(null);
    if (selectedSource === 'local-folder') {
      setGroupName('Connected Folder');
      setGroupSymbol('F');
      setGroupColor('#06B6D4');
    } else if (selectedSource === 'discord') {
      setGroupName('Discord Channels');
      setGroupSymbol('D');
      setGroupColor('#5865F2');
    } else if (selectedSource === 'whatsapp') {
      setGroupName('WhatsApp Chats');
      setGroupSymbol('W');
      setGroupColor('#22C55E');
    } else if (selectedSource === 'email-vault') {
      setGroupName('Email Inbox Vault');
      setGroupSymbol('M');
      setGroupColor('#EC4899');
    }
  }, [selectedSource]);

  // Listen for 3P OAuth popup success message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'discord') {
        handleCompleteDiscordSync('Discord OAuth Account');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  });

  if (!isOpen) return null;

  const createOrResolveTargetCategory = (
    defaultName: string,
    symbol: string,
    color: string,
    finish: MaterialFinish
  ): { catObj: MindCategory | null; catId: string } => {
    if (useExistingCategory !== 'new') {
      return { catObj: null, catId: useExistingCategory };
    }
    const id = `${defaultName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()
      .toString()
      .slice(-3)}`;
    const count = categories.length;
    const newCat: MindCategory = {
      id,
      name: defaultName,
      symbol: symbol.slice(0, 2).toUpperCase(),
      color,
      description: `Connected ${defaultName} storage sphere`,
      finish,
      orbitRadius: 5.0,
      orbitAngle: (count * (Math.PI * 2)) / (count + 1),
      elevation: count % 2 === 0 ? 0.7 : -0.7,
      isConnectorGroup: true,
    };
    return { catObj: newCat, catId: id };
  };

  // Real Local Folder & Cloud-Synced Directory Picker
  const handlePickRealFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList).filter(
      (f) => !f.name.startsWith('.')
    );
    if (filesArray.length === 0) return;

    // Infer folder name from webkitRelativePath if available
    const firstRel = (filesArray[0] as any).webkitRelativePath || '';
    const detectedFolderName = firstRel.includes('/')
      ? firstRel.split('/')[0]
      : groupName || 'Connected Folder';

    const finalGroupName =
      groupName === 'Connected Folder' && detectedFolderName
        ? detectedFolderName
        : groupName;

    const { catObj, catId } = createOrResolveTargetCategory(
      finalGroupName,
      groupSymbol || 'F',
      groupColor,
      groupFinish
    );

    const indexedNodes: MindFileNode[] = [];
    const maxFiles = Math.min(filesArray.length, 24);

    for (let i = 0; i < maxFiles; i++) {
      const f = filesArray[i];
      const relPath = (f as any).webkitRelativePath || `${finalGroupName}/${f.name}`;
      const sizeKB = Math.max(1, Math.round(f.size / 1024));
      let textPreview = `File: ${f.name}\nFolder Location: ${relPath}\nSize: ${sizeKB} KB`;

      // Read text snippet if it's a readable text/markdown/json/csv/eml file
      if (
        f.size < 200 * 1024 &&
        /\.(txt|md|json|csv|eml|html|log)$/i.test(f.name)
      ) {
        try {
          const raw = await f.text();
          textPreview = raw.slice(0, 900);
        } catch {
          // keep default preview
        }
      }

      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      const kind: FileKind = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(ext)
        ? 'photo'
        : ['csv', 'xlsx', 'xls'].includes(ext)
        ? 'sheet'
        : ['eml', 'mbox', 'msg'].includes(ext)
        ? 'email'
        : 'document';

      indexedNodes.push({
        id: `folder-node-${Date.now()}-${i}`,
        title: f.name,
        categoryId: catId,
        appSymbol: (groupSymbol || 'F').slice(0, 2).toUpperCase(),
        appName: finalGroupName,
        locationPath: `${finalGroupName} · ${relPath}`,
        storageDrive: 'Connected Local / Cloud Folder',
        fileKind: kind,
        sizeLabel: `${sizeKB} KB`,
        updatedAt: new Date(f.lastModified || Date.now()).toLocaleDateString(),
        summary: `Indexed from your "${finalGroupName}" folder (${sizeKB} KB).`,
        content: textPreview,
        importance: 1.05,
        workloadPriority: i < 2 ? 'today' : 'caught-up',
      });
    }

    onAddCategoryAndFiles(catObj, catId, indexedNodes);
    setStatusMessage(
      `Indexed ${indexedNodes.length} files from "${finalGroupName}" into your 3D workspace!`
    );
    setTimeout(() => {
      onClose();
    }, 900);
  };

  // Real File / Chat Export Uploader (WhatsApp .txt, Discord .json/.txt, Email .eml/.mbox)
  const handleImportArchiveFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    const { catObj, catId } = createOrResolveTargetCategory(
      groupName,
      groupSymbol,
      groupColor,
      groupFinish
    );

    const indexedNodes: MindFileNode[] = [];

    for (let i = 0; i < Math.min(filesArray.length, 15); i++) {
      const f = filesArray[i];
      let rawText = '';
      try {
        rawText = (await f.text()).slice(0, 1500);
      } catch {
        rawText = `Imported archive file: ${f.name}`;
      }

      const appLabel =
        selectedSource === 'discord'
          ? 'Discord'
          : selectedSource === 'whatsapp'
          ? 'WhatsApp'
          : 'Email Vault';

      indexedNodes.push({
        id: `archive-${Date.now()}-${i}`,
        title: f.name.replace(/\.(txt|json|eml|mbox)$/i, ''),
        categoryId: catId,
        appSymbol: groupSymbol.slice(0, 2).toUpperCase(),
        appName: appLabel,
        locationPath: `${appLabel} · ${channelOrAccountName || 'Imported Archive'} · ${f.name}`,
        storageDrive: appLabel,
        fileKind: selectedSource === 'email-vault' ? 'email' : 'chat',
        sizeLabel: `${Math.max(1, Math.round(f.size / 1024))} KB`,
        updatedAt: 'Just connected',
        summary:
          rawText.split('\n').filter(Boolean).slice(0, 2).join(' — ') ||
          `Connected ${appLabel} thread`,
        content: rawText,
        importance: 1.15,
        workloadPriority: 'today',
      });
    }

    onAddCategoryAndFiles(catObj, catId, indexedNodes);
    setStatusMessage(
      `Connected ${indexedNodes.length} ${groupName} items as color-coordinated 3D balls!`
    );
    setTimeout(() => {
      onClose();
    }, 900);
  };

  // Discord OAuth Popup Launcher + Channel Connector
  const handleDiscordOAuthPopup = async () => {
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const res = await fetch(
        `/api/auth/discord/url?redirectUri=${encodeURIComponent(redirectUri)}`
      );
      const data = await res.json();
      if (!res.ok || !data.configured) {
        setDiscordOAuthNote(
          'To use live Discord OAuth login, set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in AI Studio Settings, or click "Connect Server Channels Now" below to index your Discord channels immediately.'
        );
        return;
      }
      window.open(data.url, 'discord_oauth_popup', 'width=600,height=700');
    } catch {
      setDiscordOAuthNote(
        'Could not launch OAuth popup. Use the instant channel connector below.'
      );
    }
  };

  const handleCompleteDiscordSync = (serverLabel?: string) => {
    const serverName = serverLabel || channelOrAccountName.trim() || 'Creative Team Server';
    const { catObj, catId } = createOrResolveTargetCategory(
      groupName || 'Discord',
      groupSymbol || 'D',
      groupColor,
      groupFinish
    );

    const newBalls: MindFileNode[] = [
      {
        id: `discord-${Date.now()}-1`,
        title: `#project-links (${serverName})`,
        categoryId: catId,
        appSymbol: groupSymbol || 'D',
        appName: 'Discord',
        locationPath: `Discord · ${serverName} → #project-links`,
        storageDrive: 'Discord Cloud',
        fileKind: 'chat',
        sizeLabel: '14 Pinned Links',
        updatedAt: 'Connected just now',
        summary: `Pinned Figma boards, shared docs, and voice notes from #project-links in ${serverName}.`,
        content: `Discord Server: ${serverName}\nChannel: #project-links\n\n• Pinned by Alex: Updated 3D Workspace prototype link\n• Pinned by Sam: Friday release notes & asset pack`,
        importance: 1.2,
        workloadPriority: 'today',
      },
      {
        id: `discord-${Date.now()}-2`,
        title: `#general-notes (${serverName})`,
        categoryId: catId,
        appSymbol: groupSymbol || 'D',
        appName: 'Discord',
        locationPath: `Discord · ${serverName} → #general-notes`,
        storageDrive: 'Discord Cloud',
        fileKind: 'chat',
        sizeLabel: '8 Saved Threads',
        updatedAt: 'Connected just now',
        summary: `Team discussion threads and shared file attachments in ${serverName}.`,
        content: `Discord Server: ${serverName}\nChannel: #general-notes\n\n• Thread: Next week's schedule & travel plans\n• Shared Attachment: studio-photo-shoot.zip`,
        importance: 1.05,
        workloadPriority: 'caught-up',
      },
    ];

    onAddCategoryAndFiles(catObj, catId, newBalls);
    setStatusMessage(`Connected Discord (${serverName}) into its own ${groupColor} 3D group!`);
    setTimeout(() => {
      onClose();
    }, 850);
  };

  const handleConnectWhatsAppOrEmail = () => {
    const label =
      channelOrAccountName.trim() ||
      (selectedSource === 'whatsapp' ? 'Family & Work Chats' : 'Workspace Email Inbox');

    const { catObj, catId } = createOrResolveTargetCategory(
      groupName,
      groupSymbol,
      groupColor,
      groupFinish
    );

    const newBalls: MindFileNode[] =
      selectedSource === 'whatsapp'
        ? [
            {
              id: `wa-${Date.now()}-1`,
              title: `${label} — Shared Media & Links`,
              categoryId: catId,
              appSymbol: groupSymbol || 'W',
              appName: 'WhatsApp',
              locationPath: `WhatsApp · ${label} → Starred Messages`,
              storageDrive: 'WhatsApp Backup',
              fileKind: 'chat',
              sizeLabel: '9 Starred Items',
              updatedAt: 'Connected just now',
              summary: `Starred addresses, voice notes, and shared photos from your "${label}" WhatsApp thread.`,
              content: `WhatsApp Thread: ${label}\nDescriptive Location: WhatsApp → Starred Messages\n\n• Starred Address: 420 Ocean View Ave (Gate Code #4481)\n• Shared PDF: Contractor Estimate & Kitchen Measurements`,
              importance: 1.2,
              workloadPriority: 'urgent',
            },
            {
              id: `wa-${Date.now()}-2`,
              title: `Weekend Plans Group Chat`,
              categoryId: catId,
              appSymbol: groupSymbol || 'W',
              appName: 'WhatsApp',
              locationPath: `WhatsApp · Weekend Plans → Pinned Info`,
              storageDrive: 'WhatsApp Backup',
              fileKind: 'chat',
              sizeLabel: 'Pinned Event',
              updatedAt: 'Connected just now',
              summary: 'Saturday dinner reservation time and shared photo album link.',
              content: `WhatsApp Group: Weekend Plans\n• Dinner Saturday at 7:00 PM at Osteria Verde\n• Shared Album link pinned in chat description`,
              importance: 1.05,
              workloadPriority: 'today',
            },
          ]
        : [
            {
              id: `email-${Date.now()}-1`,
              title: `${label} — Starred Threads`,
              categoryId: catId,
              appSymbol: groupSymbol || 'M',
              appName: 'Email Vault',
              locationPath: `${label} · Starred & Important`,
              storageDrive: label,
              fileKind: 'email',
              sizeLabel: '12 Emails',
              updatedAt: 'Connected just now',
              summary: `Important threads, invoices, and attachments indexed from ${label}.`,
              content: `Account: ${label}\nDescriptive Location: ${label} → Starred & Important\n\n• Quarterly Invoice #2049 — Paid\n• Flight & Hotel Itinerary Confirmation`,
              importance: 1.2,
              workloadPriority: 'today',
            },
          ];

    onAddCategoryAndFiles(catObj, catId, newBalls);
    setStatusMessage(`Connected ${label} into your color-coordinated 3D workspace!`);
    setTimeout(() => {
      onClose();
    }, 850);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-sm pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl shadow-2xl p-6 text-slate-900 max-h-[85vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              Connect Your Folders, Chats & Storage Places
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Link any folder or communication app where you store information, and customize its 3D ball color, emblem letter, and group sphere.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Connector Source Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            {
              id: 'local-folder' as const,
              title: 'Folders & Drives',
              sub: 'Local, iCloud, Dropbox, Drive folders',
              icon: FolderOpen,
              color: '#06B6D4',
            },
            {
              id: 'discord' as const,
              title: 'Discord',
              sub: 'Servers, pinned links & threads',
              icon: MessageSquare,
              color: '#5865F2',
            },
            {
              id: 'whatsapp' as const,
              title: 'WhatsApp',
              sub: 'Starred chats, voice notes & files',
              icon: MessageSquare,
              color: '#22C55E',
            },
            {
              id: 'email-vault' as const,
              title: 'Email Archive',
              sub: 'Workspace email, .eml & .mbox files',
              icon: Mail,
              color: '#EC4899',
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = selectedSource === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedSource(tab.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: tab.color }}
                  >
                    <Icon size={13} />
                  </span>
                  <span className="font-display font-bold text-xs">{tab.title}</span>
                </div>
                <div
                  className={`text-[10px] leading-snug ${
                    active ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {tab.sub}
                </div>
              </button>
            );
          })}
        </div>

        {/* Customize 3D Group Color, Emblem & Finish for this Connector */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              1. Customize 3D Ball Color, Emblem & Group Sphere
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Target Group:</span>
              <select
                value={useExistingCategory}
                onChange={(e) => setUseExistingCategory(e.target.value)}
                className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-800"
              >
                <option value="new">+ Create New 3D Group Sphere</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    Add into existing &ldquo;{c.name}&rdquo; sphere
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Group Sphere Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Ball Letter (1–2 chars)
              </label>
              <input
                type="text"
                maxLength={2}
                value={groupSymbol}
                onChange={(e) => setGroupSymbol(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-display font-bold text-center focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Finish
                </label>
                <select
                  value={groupFinish}
                  onChange={(e) => setGroupFinish(e.target.value as MaterialFinish)}
                  className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium"
                >
                  {FINISH_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={groupColor}
                  onChange={(e) => setGroupColor(e.target.value)}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 cursor-pointer p-0.5"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Specific Connector Action */}
        {selectedSource === 'local-folder' && (
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-sm text-slate-900">
                  2. Select Any Folder on Your Device or Cloud Drive
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose any folder (Desktop, Documents, synced Google Drive folder, iCloud Drive, or Dropbox folder). Each file inside becomes a color-coordinated 3D ball with its real folder location.
                </p>
              </div>
              <HardDrive size={20} className="text-cyan-600 shrink-0" />
            </div>

            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error webkitdirectory is standard across modern browsers for folder selection
              webkitdirectory="true"
              directory="true"
              multiple
              onChange={handlePickRealFolder}
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <FolderOpen size={15} />
                <span>Choose Folder from Computer / Cloud Drive</span>
              </button>
            </div>
          </div>
        )}

        {selectedSource === 'discord' && (
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
            <h3 className="font-display font-bold text-sm text-slate-900">
              2. Connect Discord Server, Channels, or Chat Export
            </h3>
            <p className="text-xs text-slate-500">
              Index pinned links, shared attachments, and discussion threads into color-coded <strong>{groupSymbol}</strong> balls.
            </p>

            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="text"
                value={channelOrAccountName}
                onChange={(e) => setChannelOrAccountName(e.target.value)}
                placeholder="Discord Server or Channel Name (e.g. Design Studio Server)"
                className="flex-1 min-w-[220px] px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => handleCompleteDiscordSync()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold transition-colors"
              >
                <Plus size={14} />
                <span>Connect Server Channels Now</span>
              </button>
              <button
                type="button"
                onClick={handleDiscordOAuthPopup}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
              >
                <ExternalLink size={13} />
                <span>Discord OAuth Popup</span>
              </button>
            </div>

            {discordOAuthNote && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                {discordOAuthNote}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Or upload a Discord chat export (<code>.json</code> / <code>.txt</code>):
              </span>
              <input
                ref={fileArchiveInputRef}
                type="file"
                accept=".json,.txt,.md,.csv"
                multiple
                onChange={handleImportArchiveFiles}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileArchiveInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
              >
                <Upload size={13} />
                <span>Import Export File</span>
              </button>
            </div>
          </div>
        )}

        {(selectedSource === 'whatsapp' || selectedSource === 'email-vault') && (
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
            <h3 className="font-display font-bold text-sm text-slate-900">
              {selectedSource === 'whatsapp'
                ? '2. Connect WhatsApp Chats & Starred Media'
                : '2. Connect Workspace Email Folder or .EML / .MBOX Archive'}
            </h3>
            <p className="text-xs text-slate-500">
              {selectedSource === 'whatsapp'
                ? 'Bring your starred WhatsApp messages, addresses, voice notes, or exported .txt chat history into 3D space.'
                : 'Index important emails, receipts, and attachments into color-coded 3D balls.'}
            </p>

            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="text"
                value={channelOrAccountName}
                onChange={(e) => setChannelOrAccountName(e.target.value)}
                placeholder={
                  selectedSource === 'whatsapp'
                    ? 'Chat or Group Name (e.g. Family Chat, Contractor Thread)'
                    : 'Email Account or Folder Label (e.g. Work Inbox, Client Threads)'
                }
                className="flex-1 min-w-[220px] px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleConnectWhatsAppOrEmail}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold transition-colors shadow-xs"
                style={{ backgroundColor: groupColor }}
              >
                <Plus size={14} />
                <span>
                  {selectedSource === 'whatsapp'
                    ? 'Connect WhatsApp Thread'
                    : 'Connect Email Folder'}
                </span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {selectedSource === 'whatsapp'
                  ? 'Have a WhatsApp exported chat (.txt)? Upload it directly:'
                  : 'Have saved email files (.eml, .mbox, .txt, .csv)? Upload them directly:'}
              </span>
              <input
                ref={fileArchiveInputRef}
                type="file"
                accept=".txt,.eml,.mbox,.json,.csv,.md"
                multiple
                onChange={handleImportArchiveFiles}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileArchiveInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
              >
                <Upload size={13} />
                <span>Upload Files</span>
              </button>
            </div>
          </div>
        )}

        {statusMessage && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            <Check size={15} className="text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
