/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

interface SSEClient {
  id: string;
  res: express.Response;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Active SSE clients listening for Model Context Protocol (MCP) commands
  const mcpClients = new Set<SSEClient>();

  const broadcastMCPCommand = (payload: Record<string, unknown>) => {
    const serialized = `event: mcp_command\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of mcpClients) {
      try {
        client.res.write(serialized);
      } catch {
        mcpClients.delete(client);
      }
    }
  };

  // 1. Model Context Protocol (MCP) Real-Time SSE Stream
  app.get('/api/mcp/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientId = `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const client: SSEClient = { id: clientId, res };
    mcpClients.add(client);

    res.write(
      `event: connected\ndata: ${JSON.stringify({
        clientId,
        status: 'connected',
        supportedTools: ['sort_spheres', 'highlight_node', 'query_cluster'],
        timestamp: new Date().toISOString(),
      })}\n\n`
    );

    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat ${Date.now()}\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      mcpClients.delete(client);
    });
  });

  // 2. Model Context Protocol (MCP) Structured Tool Call Endpoint
  app.post('/api/mcp/command', (req, res) => {
    const { tool, params, agentName } = req.body || {};
    const validTools = ['sort_spheres', 'highlight_node', 'query_cluster'];

    if (!tool || !validTools.includes(tool)) {
      res.status(400).json({
        error: `Invalid MCP tool "${tool}". Expected one of: ${validTools.join(', ')}`,
      });
      return;
    }

    const commandEvent = {
      id: `cmd-${Date.now()}`,
      tool,
      params: params || {},
      agentName: agentName || 'External MCP Agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    broadcastMCPCommand(commandEvent);

    res.json({
      ok: true,
      deliveredToClients: mcpClients.size,
      command: commandEvent,
    });
  });

  // 3. Gmail OAuth 2.0 Configuration Status & Authenticated Message Query Endpoint
  app.get('/api/gmail/status', (_req, res) => {
    const envClientId = process.env.GOOGLE_CLIENT_ID || '';
    res.json({
      configured: Boolean(envClientId),
      clientId: envClientId,
      requiredScope: GMAIL_READONLY_SCOPE,
    });
  });

  app.get('/api/gmail/messages', async (req, res) => {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length).trim()
        : '';

      if (!token) {
        res.status(401).json({
          authenticated: false,
          requiredScope: GMAIL_READONLY_SCOPE,
          error:
            'Missing OAuth 2.0 Bearer access token. Configure your Google OAuth Client ID or provide a valid access token with https://www.googleapis.com/auth/gmail.readonly scope.',
        });
        return;
      }

      const maxResults = Math.min(Number(req.query.maxResults) || 10, 20);
      const q = typeof req.query.q === 'string' ? req.query.q : 'in:inbox';

      const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
      listUrl.searchParams.set('maxResults', String(maxResults));
      if (q) listUrl.searchParams.set('q', q);

      const listRes = await fetch(listUrl.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const listData: any = await listRes.json();

      if (!listRes.ok) {
        const googleErr =
          listData?.error?.message ||
          'Gmail API rejected the provided OAuth token. Ensure the token is valid and includes scope https://www.googleapis.com/auth/gmail.readonly.';
        res.status(listRes.status).json({
          authenticated: false,
          requiredScope: GMAIL_READONLY_SCOPE,
          error: googleErr,
        });
        return;
      }

      const rawMessages: Array<{ id: string; threadId: string }> = Array.isArray(
        listData.messages
      )
        ? listData.messages.slice(0, maxResults)
        : [];

      const detailedMessages = await Promise.all(
        rawMessages.map(async (m) => {
          const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(
            m.id
          )}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`;
          const dRes = await fetch(detailUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          });
          if (!dRes.ok) return null;
          const dJson: any = await dRes.json();
          const headers: Array<{ name: string; value: string }> =
            dJson?.payload?.headers || [];
          const getHeader = (name: string) =>
            headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

          return {
            id: dJson.id,
            threadId: dJson.threadId,
            subject: getHeader('Subject') || '(No Subject)',
            from: getHeader('From') || 'Unknown Sender',
            date: getHeader('Date') || new Date(Number(dJson.internalDate || Date.now())).toISOString(),
            snippet: dJson.snippet || '',
            sizeEstimate: Number(dJson.sizeEstimate || 1024),
            internalDate: Number(dJson.internalDate || Date.now()),
          };
        })
      );

      res.json({
        authenticated: true,
        scope: GMAIL_READONLY_SCOPE,
        messages: detailedMessages.filter(Boolean),
      });
    } catch (err: any) {
      res.status(500).json({
        authenticated: false,
        requiredScope: GMAIL_READONLY_SCOPE,
        error: err?.message || 'Failed to query Gmail API.',
      });
    }
  });

  // 4. 3P OAuth URL constructor for Discord
  app.get('/api/auth/discord/url', (req, res) => {
    const redirectUri =
      (req.query.redirectUri as string) || `${req.protocol}://${req.get('host')}/auth/callback`;
    const clientId = process.env.DISCORD_CLIENT_ID || (req.query.clientId as string) || '';

    if (!clientId) {
      res.status(400).json({
        configured: false,
        error:
          'DISCORD_CLIENT_ID is not configured. Provide a Discord Client ID or import a Discord channel JSON/TXT archive.',
      });
      return;
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify guilds messages.read',
    });

    const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
    res.json({ configured: true, url: authUrl });
  });

  // 5. OAuth popup callback handler (handles both OAuth2 implicit hash access_token for Gmail and query code for Discord)
  const callbackHandler: express.RequestHandler = async (req, res) => {
    const { code, state } = req.query;
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8" /><title>OAuth 2.0 Callback</title></head>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #F8FAFC; color: #0F172A;">
          <script>
            (function() {
              var hash = window.location.hash ? window.location.hash.substring(1) : '';
              var hashParams = new URLSearchParams(hash);
              var accessToken = hashParams.get('access_token');
              var scope = hashParams.get('scope');
              var stateVal = hashParams.get('state') || ${JSON.stringify(state || '')};
              var codeVal = ${JSON.stringify(code || '')};

              if (window.opener) {
                if (accessToken) {
                  window.opener.postMessage({
                    type: 'GMAIL_OAUTH_TOKEN',
                    accessToken: accessToken,
                    scope: scope || '${GMAIL_READONLY_SCOPE}',
                    state: stateVal
                  }, '*');
                } else if (codeVal) {
                  window.opener.postMessage({
                    type: 'OAUTH_AUTH_SUCCESS',
                    provider: stateVal || 'discord',
                    code: codeVal
                  }, '*');
                }
                window.close();
              } else {
                window.location.href = '/';
              }
            })();
          </script>
          <div style="text-align: center;">
            <h3 style="margin-bottom: 8px;">Authentication Complete</h3>
            <p style="font-size: 14px; color: #475569;">Returning to Reactive Mind...</p>
          </div>
        </body>
      </html>
    `);
  };

  app.get(['/auth/callback', '/auth/callback/'], callbackHandler);

  // 6. Descriptive Location Engine Conversational & Tool API
  app.post('/api/mindmap/chat', async (req, res) => {
    try {
      const { message, categories, files, history, connectedAgent } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message is required.' });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({
          error: 'GEMINI_API_KEY is not configured on the server.',
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const categoriesContext = (categories || [])
        .map((c: any) => `- Group "${c.id}" (${c.name}, color: ${c.color}): ${c.description}`)
        .join('\n');

      const filesContext = (files || [])
        .map(
          (f: any) =>
            `- Ball ID "${f.id}" | Title: "${f.title}" | Source App: ${f.appName} [${f.appSymbol}] | Group: "${f.categoryId}" | Priority: ${f.workloadPriority || 'today'} | Descriptive Location: "${f.locationPath}" | Summary: ${f.summary}`
        )
        .join('\n');

      const recentHistory = (history || [])
        .slice(-5)
        .map((m: any) => `${m.role.toUpperCase()}: ${m.text}`)
        .join('\n');

      const systemInstruction = `You are the Descriptive Location Engine for "Reactive Mind".
You are a spatial location & organization engine connected to AI agents (currently connected to: ${connectedAgent || 'Gemini'}).
Whenever a user or connected agent asks for something, you execute a visual 3D tool that physically sorts through the color-coordinated app balls and arranges them into a meaningful 3D structural formation:

Available 3D Structural Formations (choose the best one in "formation"):
- "clusters": Grouped into their color-coordinated spheres (Work, Personal, Skills, Storage, and imported directories).
- "daily-flow": Organizes balls into a 3-tier Daily Workload Runway (Urgent Today in the front row, On Deck Today in the middle arc, and Caught Up in the calm back arc).
- "app-grid": Snaps balls into clean vertical columns sorted by App/Connector Emblem.
- "kaleidoscope": Symmetrical geometric mandala ring sorted by color harmony.
- "caught-up-smile": Arranges all the balls into a cheerful 3D Smile & Eyes formation when everything is caught up!

Available Engine Tool Names (set in "toolCalled"):
- "sort_spheres"
- "highlight_node"
- "query_cluster"
- "locate_and_pull_balls"
- "sort_daily_workload"
- "align_app_columns"
- "form_kaleidoscope_mandala"
- "form_caught_up_smile"

Current Color-Coordinated Groups:
${categoriesContext}

Current Item Balls in Engine:
${filesContext}

Always state the exact Descriptive Location in plain, everyday human language (1-3 sentences).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `${recentHistory ? `Recent Engine Calls:\n${recentHistory}\n\n` : ''}Agent/User Request: ${message}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description:
                  'Descriptive location output explaining where the items live and how the 3D balls were organized.',
              },
              toolCalled: {
                type: Type.STRING,
              },
              action: {
                type: Type.STRING,
                description:
                  'One of: EXPLODE_ALL, CLUSTER_ALL, FOCUS_CATEGORY, RETRIEVE_FILE, CREATE_NODE, UPDATE_CATEGORY_COLOR, SET_FORMATION, NONE',
              },
              formation: {
                type: Type.STRING,
                description:
                  'One of: clusters, daily-flow, app-grid, kaleidoscope, caught-up-smile',
              },
              targetCategoryId: {
                type: Type.STRING,
              },
              primaryFileId: {
                type: Type.STRING,
              },
              retrievedFileIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              explosionLevel: {
                type: Type.NUMBER,
              },
              suggestedFollowUps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              newNode: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  categoryId: { type: Type.STRING },
                  appSymbol: { type: Type.STRING },
                  appName: { type: Type.STRING },
                  locationPath: { type: Type.STRING },
                  fileKind: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  content: { type: Type.STRING },
                },
              },
              categoryColorUpdate: {
                type: Type.OBJECT,
                properties: {
                  categoryId: { type: Type.STRING },
                  color: { type: Type.STRING },
                },
              },
            },
            required: [
              'reply',
              'toolCalled',
              'action',
              'formation',
              'retrievedFileIds',
              'suggestedFollowUps',
            ],
          },
        },
      });

      const rawText = response.text || '{}';
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (err: any) {
      console.error('Descriptive Location Engine Error:', err);
      res.status(500).json({
        error: err?.message || 'Failed to process location engine tool call.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Reactive Mind Descriptive Location Engine running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
