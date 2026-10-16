/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { MCPCommandPayload, MCPToolName } from '../types';

export interface UseAgentBridgeOptions {
  onCommand: (command: MCPCommandPayload) => void;
  externalWsUrl?: string;
}

export function useAgentBridge({ onCommand, externalWsUrl }: UseAgentBridgeOptions) {
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<MCPCommandPayload | null>(null);

  const onCommandRef = useRef(onCommand);
  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  const wsRef = useRef<WebSocket | null>(null);

  // 1. Real Server-Sent Events (SSE) Listener to /api/mcp/stream
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/mcp/stream');

        eventSource.addEventListener('connected', (event: MessageEvent) => {
          setSseConnected(true);
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.clientId) setClientId(parsed.clientId);
          } catch {
            // ignore
          }
        });

        eventSource.addEventListener('mcp_command', (event: MessageEvent) => {
          try {
            const payload = JSON.parse(event.data) as MCPCommandPayload;
            if (
              payload &&
              (payload.tool === 'sort_spheres' ||
                payload.tool === 'highlight_node' ||
                payload.tool === 'query_cluster')
            ) {
              setLastCommand(payload);
              onCommandRef.current(payload);
            }
          } catch (err) {
            console.error('Failed to parse MCP SSE command:', err);
          }
        });

        eventSource.onerror = () => {
          setSseConnected(false);
          eventSource?.close();
          reconnectTimer = setTimeout(connectSSE, 3500);
        };
      } catch {
        setSseConnected(false);
      }
    };

    connectSSE();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      eventSource?.close();
    };
  }, []);

  // 2. Optional Local External MCP WebSocket Server Bridge
  useEffect(() => {
    if (!externalWsUrl || !externalWsUrl.trim().startsWith('ws')) {
      setWsConnected(false);
      return;
    }

    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(externalWsUrl.trim());
      wsRef.current = socket;

      socket.onopen = () => {
        setWsConnected(true);
        socket?.send(
          JSON.stringify({
            jsonrpc: '2.0',
            method: 'mcp/register',
            params: {
              client: 'reactive-mind-3d-engine',
              tools: ['sort_spheres', 'highlight_node', 'query_cluster'],
            },
          })
        );
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const toolName: MCPToolName | undefined =
            data.tool || data.method || data.params?.name;
          if (
            toolName === 'sort_spheres' ||
            toolName === 'highlight_node' ||
            toolName === 'query_cluster'
          ) {
            const cmd: MCPCommandPayload = {
              id: data.id || `ws-${Date.now()}`,
              tool: toolName,
              params: data.params?.arguments || data.params || {},
              agentName: data.agentName || 'Local MCP Socket',
              timestamp: new Date().toLocaleTimeString(),
            };
            setLastCommand(cmd);
            onCommandRef.current(cmd);
          }
        } catch (err) {
          console.error('Invalid WebSocket MCP message:', err);
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
      };

      socket.onerror = () => {
        setWsConnected(false);
      };
    } catch {
      setWsConnected(false);
    }

    return () => {
      socket?.close();
      wsRef.current = null;
    };
  }, [externalWsUrl]);

  // 3. Dispatch an MCP command through the server SSE bridge (and WebSocket if active)
  const dispatchMCPCommand = useCallback(
    async (
      tool: MCPToolName,
      params: MCPCommandPayload['params'],
      agentName = 'MCP Bridge'
    ) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            jsonrpc: '2.0',
            method: tool,
            params,
          })
        );
      }

      const res = await fetch('/api/mcp/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, params, agentName }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to dispatch MCP tool ${tool}`);
      }

      return res.json();
    },
    []
  );

  return {
    sseConnected,
    wsConnected,
    clientId,
    lastCommand,
    dispatchMCPCommand,
  };
}
