/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  HardDrive,
  FolderOpen,
  Mail,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Upload,
  RefreshCw,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import {
  MindCategory,
  MindFileNode,
  MaterialFinish,
  StorageConnectorConfig,
} from '../types';
import {
  ParsedDirectoryEntry,
  mapDirectoryEntriesToSceneNodes,
  formatFileSize,
} from '../data/initialData';

const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

const PRESET_COLORS = [
  '#06B6D4',
  '#2563EB',
  '#10B981',
  '#F97316',
  '#8B5CF6',
  '#EC4899',
  '#5865F2',
  '#EAB308',
];

const FINISH_OPTIONS: { value: MaterialFinish; label: string }[] = [
  { value: 'pearl', label: 'Glossy Pearl' },
  { value: 'glass', label: 'Clear Glass' },
  { value: 'metal', label: 'Polished Metallic' },
  { value: 'matte', label: 'Soft Matte' },
];

interface ConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: MindCategory[];
  connectors: StorageConnectorConfig[];
  onIngestDirectoryAndFiles: (
    connectorId: string,
    category: MindCategory,
    nodes: MindFileNode[],
    sourceLabel: string
  ) => void;
  onUpdateConnectorStyle: (
    connId: string,
    updates: Partial<Pick<StorageConnectorConfig, 'color' | 'finish' | 'symbol' | 'name'>>
  ) => void;
  onFocusCategory: (categoryId: string) => void;
}

async function readDirectoryHandleRecursively(
  dirHandle: any,
  parentPath: string,
  rootFolderName: string,
  collector: ParsedDirectoryEntry[],
  maxFiles = 40
): Promise<void> {
  for await (const entry of dirHandle.values()) {
    if (collector.length >= maxFiles) return;
    if (entry.name.startsWith('.')) continue;

    const currentRelativePath = parentPath ? `${parentPath}/${entry.name}` : entry.name;

    if (entry.kind === 'directory') {
      await readDirectoryHandleRecursively(
        entry,
        currentRelativePath,
        rootFolderName,
        collector,
        maxFiles
      );
    } else if (entry.kind === 'file') {
      const fileObj: File = await entry.getFile();
      let textPreview = '';
      if (
        fileObj.size > 0 &&
        fileObj.size < 120000 &&
        (fileObj.type.startsWith('text/') ||
          /\.(txt|md|json|csv|eml|log|ts|tsx|js|py|html|css)$/i.test(fileObj.name))
      ) {
        try {
          const text = await fileObj.text();
          textPreview = text.slice(0, 700);
        } catch {
          textPreview = '';
        }
      }

      collector.push({
        name: fileObj.name,
        relativePath: `${rootFolderName}/${currentRelativePath}`,
        topFolderName: rootFolderName,
        mimeType: fileObj.type || 'application/octet-stream',
        sizeBytes: fileObj.size,
        lastModified: fileObj.lastModified || Date.now(),
        textPreview,
      });
    }
  }
}

export const ConnectorsModal: React.FC<ConnectorsModalProps> = ({
  isOpen,
  onClose,
  categories,
  connectors,
  onIngestDirectoryAndFiles,
  onUpdateConnectorStyle,
  onFocusCategory,
}) => {
  const [activeTab, setActiveTab] = useState<'filesystem' | 'gmail' | 'archives'>('filesystem');

  // Local Directory Ingestion State
  const [isScanningDir, setIsScanningDir] = useState(false);
  const [dirError, setDirError] = useState<string | null>(null);
  const [dirSuccess, setDirSuccess] = useState<string | null>(null);
  const [recentIngestedEntries, setRecentIngestedEntries] = useState<ParsedDirectoryEntry[]>([]);
  const directoryInputRef = useRef<HTMLInputElement>(null);

  // Archive File Input State (.eml, .txt WhatsApp, .json Discord)
  const archiveFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingArchiveConnId, setPendingArchiveConnId] = useState<string>('conn-email-vault');

  // Gmail OAuth 2.0 & API State
  const [serverClientId, setServerClientId] = useState<string>('');
  const [customClientId, setCustomClientId] = useState<string>(() => {
    return sessionStorage.getItem('reactive_mind_gmail_client_id') || '';
  });
  const [accessToken, setAccessToken] = useState<string>('');
  const [gmailQuery, setGmailQuery] = useState<string>('in:inbox');
  const [isQueryingGmail, setIsQueryingGmail] = useState<boolean>(false);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [gmailSuccess, setGmailSuccess] = useState<string | null>(null);

  const localConn =
    connectors.find((c) => c.provider === 'local-folder') || connectors[0];
  const gmailConn =
    connectors.find((c) => c.provider === 'gmail') ||
    connectors.find((c) => c.provider === 'email-vault') ||
    connectors[0];

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/gmail/status')
      .then((r) => r.json())
      .then((data) => {
        if (data?.clientId) {
          setServerClientId(data.clientId);
          if (!customClientId) {
            setCustomClientId(data.clientId);
          }
        }
      })
      .catch(() => {
        // ignore
      });
  }, [isOpen]);

  // Listen for OAuth 2.0 popup postMessage returning an access_token for Gmail
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GMAIL_OAUTH_TOKEN' && event.data?.accessToken) {
        const token = String(event.data.accessToken);
        setAccessToken(token);
        setGmailError(null);
        void fetchGmailMessagesWithToken(token);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [gmailQuery, categories, connectors]);

  if (!isOpen) return null;

  const handleImportLocalDirectory = async () => {
    setDirError(null);
    setDirSuccess(null);

    if ('showDirectoryPicker' in window) {
      try {
        setIsScanningDir(true);
        const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
        const rootName = dirHandle.name || 'LocalDirectory';
        const collected: ParsedDirectoryEntry[] = [];

        await readDirectoryHandleRecursively(dirHandle, '', rootName, collected, 40);

        if (collected.length === 0) {
          setDirError(`Directory "${rootName}" contains no readable files.`);
          setIsScanningDir(false);
          return;
        }

        const { category, nodes } = mapDirectoryEntriesToSceneNodes(
          rootName,
          collected,
          categories,
          {
            customColor: localConn.color,
            customFinish: localConn.finish,
            customSymbol: localConn.symbol,
            targetCategoryId: localConn.categoryId,
          }
        );

        setRecentIngestedEntries(collected);
        onIngestDirectoryAndFiles(
          localConn.id,
          category,
          nodes,
          `${rootName} (${collected.length} files)`
        );
        setDirSuccess(
          `Ingested ${collected.length} real files from "${rootName}" into 3D sphere "${category.name}".`
        );
        setIsScanningDir(false);
        return;
      } catch (err: any) {
        setIsScanningDir(false);
        if (err?.name === 'AbortError') {
          return;
        }
        // Fall through to standard HTML5 <input webkitdirectory> fallback
      }
    }

    if (directoryInputRef.current) {
      directoryInputRef.current.value = '';
      directoryInputRef.current.click();
    }
  };

  const handleFallbackDirectoryInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsScanningDir(true);
    setDirError(null);
    setDirSuccess(null);

    try {
      const filesArray = Array.from(fileList)
        .filter((f) => !f.name.startsWith('.'))
        .slice(0, 40);

      if (filesArray.length === 0) {
        setDirError('No visible files found in the selected directory.');
        setIsScanningDir(false);
        return;
      }

      const firstRel = (filesArray[0] as any).webkitRelativePath || filesArray[0].name;
      const rootName = firstRel.includes('/')
        ? firstRel.split('/')[0]
        : 'ImportedDirectory';

      const collected: ParsedDirectoryEntry[] = [];
      for (const fileObj of filesArray) {
        const relPath =
          (fileObj as any).webkitRelativePath || `${rootName}/${fileObj.name}`;
        let textPreview = '';
        if (
          fileObj.size > 0 &&
          fileObj.size < 120000 &&
          (fileObj.type.startsWith('text/') ||
            /\.(txt|md|json|csv|eml|log|ts|tsx|js|py|html|css)$/i.test(fileObj.name))
        ) {
          try {
            const raw = await fileObj.text();
            textPreview = raw.slice(0, 700);
          } catch {
            textPreview = '';
          }
        }

        collected.push({
          name: fileObj.name,
          relativePath: relPath,
          topFolderName: rootName,
          mimeType: fileObj.type || 'application/octet-stream',
          sizeBytes: fileObj.size,
          lastModified: fileObj.lastModified || Date.now(),
          textPreview,
        });
      }

      const { category, nodes } = mapDirectoryEntriesToSceneNodes(
        rootName,
        collected,
        categories,
        {
          customColor: localConn.color,
          customFinish: localConn.finish,
          customSymbol: localConn.symbol,
          targetCategoryId: localConn.categoryId,
        }
      );

      setRecentIngestedEntries(collected);
      onIngestDirectoryAndFiles(
        localConn.id,
        category,
        nodes,
        `${rootName} (${collected.length} files)`
      );
      setDirSuccess(
        `Ingested ${collected.length} real files from "${rootName}" into 3D sphere "${category.name}".`
      );
    } catch (err: any) {
      setDirError(err?.message || 'Failed to parse selected directory.');
    } finally {
      setIsScanningDir(false);
    }
  };

  const handleStartGoogleOAuthFlow = () => {
    setGmailError(null);
    setGmailSuccess(null);

    const activeClientId = customClientId.trim() || serverClientId.trim();
    if (!activeClientId) {
      setGmailError(
        'OAuth 2.0 Client ID is required to initiate Google authentication. Enter your Google Cloud OAuth Client ID below or provide a valid Bearer Access Token with gmail.readonly scope.'
      );
      return;
    }

    sessionStorage.setItem('reactive_mind_gmail_client_id', activeClientId);
    const redirectUri = `${window.location.origin}/auth/callback`;
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', activeClientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('scope', GMAIL_READONLY_SCOPE);
    authUrl.searchParams.set('include_granted_scopes', 'true');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', 'gmail');

    window.open(authUrl.toString(), 'gmail_oauth_popup', 'width=540,height=660');
  };

  const fetchGmailMessagesWithToken = async (tokenOverride?: string) => {
    const tokenToUse = (tokenOverride ?? accessToken).trim();
    setGmailError(null);
    setGmailSuccess(null);

    if (!tokenToUse) {
      setGmailError(
        `No OAuth 2.0 access token present. Authenticate with Google OAuth (${GMAIL_READONLY_SCOPE}) or paste a valid Bearer token first.`
      );
      return;
    }

    setIsQueryingGmail(true);
    try {
      const res = await fetch(
        `/api/gmail/messages?maxResults=12&q=${encodeURIComponent(gmailQuery.trim() || 'in:inbox')}`,
        {
          headers: {
            Authorization: `Bearer ${tokenToUse}`,
          },
        }
      );

      const data = await res.json();
      if (!res.ok || !data.authenticated) {
        throw new Error(
          data.error ||
            `Gmail API returned HTTP ${res.status}. Verify your token has ${GMAIL_READONLY_SCOPE} permission.`
        );
      }

      const rawMessages: Array<{
        id: string;
        threadId: string;
        subject: string;
        from: string;
        date: string;
        snippet: string;
        sizeEstimate: number;
        internalDate: number;
      }> = data.messages || [];

      if (rawMessages.length === 0) {
        setGmailError(`Authenticated successfully, but no messages matched query "${gmailQuery}".`);
        setIsQueryingGmail(false);
        return;
      }

      const entries: ParsedDirectoryEntry[] = rawMessages.map((msg) => ({
        name: msg.subject,
        relativePath: `Gmail/${gmailQuery || 'Inbox'}/${msg.id}.eml`,
        topFolderName: 'Gmail Inbox',
        mimeType: 'message/rfc822',
        sizeBytes: msg.sizeEstimate || 2048,
        lastModified: msg.internalDate || Date.now(),
        textPreview: `From: ${msg.from}\nDate: ${msg.date}\nThread ID: ${msg.threadId}\n\n${msg.snippet}`,
      }));

      const { category, nodes } = mapDirectoryEntriesToSceneNodes(
        'Gmail Inbox',
        entries,
        categories,
        {
          customColor: gmailConn.color,
          customFinish: gmailConn.finish,
          customSymbol: 'G',
          targetCategoryId: gmailConn.categoryId,
        }
      );

      onIngestDirectoryAndFiles(
        gmailConn.id,
        category,
        nodes,
        `Gmail API (${nodes.length} messages)`
      );
      setGmailSuccess(
        `Imported ${nodes.length} live Gmail messages via ${GMAIL_READONLY_SCOPE} into the 3D scene.`
      );
    } catch (err: any) {
      setGmailError(err?.message || 'Failed to query /api/gmail/messages.');
    } finally {
      setIsQueryingGmail(false);
    }
  };

  const handleArchiveFilesImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const conn =
      connectors.find((c) => c.id === pendingArchiveConnId) || connectors[0];
    const uploaded = Array.from(fileList).slice(0, 25);
    const entries: ParsedDirectoryEntry[] = [];

    for (const fileObj of uploaded) {
      let textPreview = '';
      if (fileObj.size < 350000) {
        try {
          const raw = await fileObj.text();
          textPreview = raw.slice(0, 800);
        } catch {
          textPreview = '';
        }
      }

      entries.push({
        name: fileObj.name,
        relativePath: `${conn.name}/${fileObj.name}`,
        topFolderName: conn.name,
        mimeType: fileObj.type || 'text/plain',
        sizeBytes: fileObj.size,
        lastModified: fileObj.lastModified || Date.now(),
        textPreview,
      });
    }

    const { category, nodes } = mapDirectoryEntriesToSceneNodes(
      conn.name,
      entries,
      categories,
      {
        customColor: conn.color,
        customFinish: conn.finish,
        customSymbol: conn.symbol,
        targetCategoryId: conn.categoryId,
      }
    );

    onIngestDirectoryAndFiles(
      conn.id,
      category,
      nodes,
      `${conn.name} (${nodes.length} files)`
    );
  };

  const redirectUriDisplay = `${window.location.origin}/auth/callback`;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden Native Directory & File Fallback Inputs */}
        <input
          ref={directoryInputRef}
          type="file"
          multiple
          // @ts-expect-error standard HTML5 directory attributes
          webkitdirectory=""
          directory=""
          className="hidden"
          onChange={handleFallbackDirectoryInput}
        />
        <input
          ref={archiveFileInputRef}
          type="file"
          multiple
          accept=".eml,.mbox,.txt,.json,.csv,.md,.pdf"
          className="hidden"
          onChange={handleArchiveFilesImport}
        />

        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Data Connectors & Real Filesystem Ingestion
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingest real local directories with native File System Access API or configure OAuth 2.0 credentials for Gmail.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 bg-slate-50/60 border-b border-slate-200 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('filesystem')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'filesystem'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HardDrive size={14} />
            <span>1. Local Filesystem Ingestion (Web Native)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gmail')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'gmail'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mail size={14} />
            <span>2. Gmail OAuth 2.0 Configuration</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('archives')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'archives'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare size={14} />
            <span>3. Chat & Email File Archives (.eml / .txt / .json)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'filesystem' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-12 h-12 rounded-2xl text-white font-display font-extrabold text-xl flex items-center justify-center shadow-sm shrink-0"
                      style={{ backgroundColor: localConn.color }}
                    >
                      {localConn.symbol}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-slate-900">
                        Import Local Directory (File System Access API)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                        Uses <code className="font-mono text-slate-700">window.showDirectoryPicker()</code> with automatic fallback to standard HTML5 directory input. Recursively parses real filenames, relative paths, MIME types, byte sizes, and modification timestamps into 3D spheres.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isScanningDir}
                    onClick={handleImportLocalDirectory}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-sm shrink-0"
                  >
                    <FolderOpen size={15} />
                    <span>
                      {isScanningDir ? 'Scanning Directory...' : 'Import Local Directory'}
                    </span>
                  </button>
                </div>

                {/* Sphere Color & Finish Customizer */}
                <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Directory Sphere Color:
                    </span>
                    {PRESET_COLORS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => onUpdateConnectorStyle(localConn.id, { color: hex })}
                        className={`w-5 h-5 rounded-full transition-transform ${
                          localConn.color.toLowerCase() === hex.toLowerCase()
                            ? 'scale-125 ring-2 ring-slate-900 ring-offset-1'
                            : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      3D Material Finish:
                    </span>
                    <select
                      value={localConn.finish}
                      onChange={(e) =>
                        onUpdateConnectorStyle(localConn.id, {
                          finish: e.target.value as MaterialFinish,
                        })
                      }
                      className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
                    >
                      {FINISH_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {dirError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2.5">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{dirError}</span>
                </div>
              )}

              {dirSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span className="font-semibold">{dirSuccess}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onFocusCategory(localConn.categoryId);
                      onClose();
                    }}
                    className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 shrink-0"
                  >
                    Focus 3D Sphere →
                  </button>
                </div>
              )}

              {/* Live Ingested File Metadata Table */}
              {recentIngestedEntries.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Parsed Real File Metadata ({recentIngestedEntries.length} nodes)</span>
                    <span className="font-mono text-[11px] text-slate-500">
                      Mapped to initialData.ts 3D Schema
                    </span>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {recentIngestedEntries.map((entry, idx) => (
                      <div
                        key={`${entry.relativePath}-${idx}`}
                        className="px-4 py-2.5 flex items-center justify-between gap-4 bg-white hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">
                            {entry.name}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 truncate">
                            {entry.relativePath}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 shrink-0 tabular-nums">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-700">
                            {entry.mimeType}
                          </span>
                          <span>{formatFileSize(entry.sizeBytes)}</span>
                          <span>
                            {new Date(entry.lastModified).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'gmail' && (
            <div className="space-y-4">
              {/* Configuration Status Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  serverClientId || customClientId || accessToken
                    ? 'bg-blue-50/70 border-blue-200 text-slate-800'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <KeyRound
                  size={18}
                  className={
                    serverClientId || customClientId || accessToken
                      ? 'text-blue-600 shrink-0 mt-0.5'
                      : 'text-amber-600 shrink-0 mt-0.5'
                  }
                />
                <div className="text-xs space-y-1">
                  <div className="font-bold">
                    {serverClientId
                      ? 'Server GOOGLE_CLIENT_ID Detected'
                      : 'Gmail OAuth 2.0 Configuration Required'}
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Server endpoint <code className="font-mono font-semibold">/api/gmail/messages</code> queries real messages using the{' '}
                    <code className="font-mono font-semibold text-blue-700">
                      {GMAIL_READONLY_SCOPE}
                    </code>{' '}
                    scope. Provide your Google OAuth 2.0 Client ID (with Authorized Redirect URI{' '}
                    <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {redirectUriDisplay}
                    </code>
                    ) or paste an OAuth 2.0 Bearer Access Token to ingest real messages.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    Option A: Google OAuth 2.0 Client ID (Popup Flow)
                  </label>
                  <input
                    type="text"
                    value={customClientId}
                    onChange={(e) => setCustomClientId(e.target.value)}
                    placeholder="e.g. 1234567890-abc.apps.googleusercontent.com"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleStartGoogleOAuthFlow}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                  >
                    <ExternalLink size={14} />
                    <span>Authorize with Google OAuth 2.0</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    Option B: Direct OAuth 2.0 Bearer Access Token
                  </label>
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Paste ya29... token with gmail.readonly scope"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={gmailQuery}
                      onChange={(e) => setGmailQuery(e.target.value)}
                      placeholder="Gmail query (e.g. in:inbox, is:starred)"
                      className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      disabled={isQueryingGmail}
                      onClick={() => fetchGmailMessagesWithToken()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors shrink-0"
                    >
                      <RefreshCw size={13} className={isQueryingGmail ? 'animate-spin' : ''} />
                      <span>{isQueryingGmail ? 'Querying...' : 'Query Gmail API'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {gmailError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Gmail Authentication / Query Error</div>
                    <div className="mt-0.5">{gmailError}</div>
                  </div>
                </div>
              )}

              {gmailSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span className="font-semibold">{gmailSuccess}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500"
                  >
                    View in 3D Scene →
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'archives' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {connectors
                .filter((c) => c.provider !== 'local-folder')
                .map((conn) => (
                  <div
                    key={conn.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl text-white font-display font-extrabold text-base flex items-center justify-center shrink-0"
                        style={{ backgroundColor: conn.color }}
                      >
                        {conn.symbol}
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-sm text-slate-900">
                          {conn.name}
                        </h4>
                        <p className="text-[11px] text-slate-500">{conn.accountOrPathLabel}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPendingArchiveConnId(conn.id);
                        if (archiveFileInputRef.current) {
                          archiveFileInputRef.current.value = '';
                          archiveFileInputRef.current.click();
                        }
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold transition-colors"
                    >
                      <Upload size={13} />
                      <span>Select Real Files (.eml / .txt / .json)</span>
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
