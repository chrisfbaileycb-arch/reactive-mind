/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MaterialFinish = 'glass' | 'pearl' | 'metal' | 'matte';

export type FormationMode =
  | 'clusters'        // Grouped by Work, Personal, Skills, Storage, and Connected Sources
  | 'daily-flow'      // Sorted along a Today's Workload Priority Arc
  | 'app-grid'        // Organized into clean columns by App Emblem
  | 'kaleidoscope'    // Balanced symmetrical color mandala when organized
  | 'caught-up-smile'; // Peaceful 3D Smile formation when everything is caught up!

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
  connectorType?: 'local-folder' | 'discord' | 'whatsapp' | 'email-archive' | 'cloud-mount';
}

export type FileKind = 'email' | 'document' | 'photo' | 'sheet' | 'note' | 'video' | 'folder' | 'chat';

export interface MindFileNode {
  id: string;
  title: string;
  categoryId: string;
  appSymbol: string;    // 'D' for Discord, 'W' for WhatsApp, 'F' for Folder, etc.
  appName: string;      // 'Discord', 'WhatsApp', 'Local Folder', 'Notes', 'Calendar'
  locationPath: string; // Descriptive human location
  storageDrive: string;
  fileKind: FileKind;
  sizeLabel: string;
  updatedAt: string;
  summary: string;
  content: string;
  importance: number;
  workloadPriority: 'urgent' | 'today' | 'caught-up';
}

export interface StorageConnectorConfig {
  id: string;
  name: string;
  provider: 'local-folder' | 'discord' | 'whatsapp' | 'email-vault' | 'cloud-folder';
  symbol: string;
  color: string;
  finish: MaterialFinish;
  categoryId: string;
  connected: boolean;
  accountOrPathLabel: string;
  itemCount: number;
  lastSynced: string;
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