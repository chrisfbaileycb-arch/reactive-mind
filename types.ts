/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MaterialFinish = 'glass' | 'pearl' | 'metal' | 'matte';

export type FormationMode =
  | 'clusters'        // Grouped by Work, Personal, Skills, Storage, and Connected Directories
  | 'daily-flow'      // Sorted along a Today's Workload Priority Arc
  | 'app-grid'        // Organized into clean columns by App Emblem
  | 'kaleidoscope'    // Balanced symmetrical color mandala when organized
  | 'caught-up-smile'; // Peaceful 3D Smile formation when everything is caught up

export type ConnectedAgentId = 'gemini' | 'claude' | 'mcp-bridge';

export interface MindCategory {
  id: string;
  name: string;
  symbol: string;
  color: string;
  description: string;
  finish: MaterialFinish;
  orbitRadius: number;
  orbitAngle: number;
  elevation: number;
  isConnectorGroup?: boolean;
  connectorType?: 'local-folder' | 'gmail' | 'discord' | 'whatsapp' | 'email-archive' | 'cloud-mount';
}

export type FileKind = 'email' | 'document' | 'photo' | 'sheet' | 'note' | 'video' | 'folder' | 'chat';

export interface RealFileMetadata {
  name: string;
  relativePath: string;
  mimeType: string;
  sizeBytes: number;
  lastModified: number;
  lastModifiedISO: string;
}

export interface MindFileNode {
  id: string;
  title: string;
  categoryId: string;
  appSymbol: string;
  appName: string;
  locationPath: string;
  storageDrive: string;
  fileKind: FileKind;
  sizeLabel: string;
  updatedAt: string;
  summary: string;
  content: string;
  importance: number;
  workloadPriority: 'urgent' | 'today' | 'caught-up';
  metadata?: RealFileMetadata;
  coordinateOverride?: [number, number, number];
}

export interface StorageConnectorConfig {
  id: string;
  name: string;
  provider: 'local-folder' | 'gmail' | 'discord' | 'whatsapp' | 'email-vault';
  symbol: string;
  color: string;
  finish: MaterialFinish;
  categoryId: string;
  connected: boolean;
  accountOrPathLabel: string;
  itemCount: number;
  lastSynced: string;
}

export interface GmailOAuthConfig {
  clientId: string;
  accessToken: string;
  scope: string;
  userEmail?: string;
}

export type MCPToolName = 'sort_spheres' | 'highlight_node' | 'query_cluster';

export interface MCPCommandPayload {
  id?: string;
  tool: MCPToolName;
  params: {
    formation?: FormationMode;
    nodeId?: string;
    clusterId?: string;
    query?: string;
    coordinates?: Record<string, [number, number, number]>;
    explosionLevel?: number;
  };
  agentName?: string;
  timestamp?: string;
}

export type SpatialActionType =
  | 'EXPLODE_ALL'
  | 'CLUSTER_ALL'
  | 'FOCUS_CATEGORY'
  | 'RETRIEVE_FILE'
  | 'CREATE_NODE'
  | 'UPDATE_CATEGORY_COLOR'
  | 'SET_FORMATION'
  | 'NONE';

export interface AgentToolTrace {
  id: string;
  agentName: string;
  toolName: string;
  querySummary: string;
  scannedCount: number;
  matchedCount: number;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  agentName?: string;
  toolCalled?: string;
  text: string;
  timestamp: string;
  retrievedFileIds?: string[];
  actionTriggered?: SpatialActionType;
  formationTriggered?: FormationMode;
  suggestedFollowUps?: string[];
}