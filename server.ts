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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // 3P OAuth URL constructor for Discord (following oauth-integration skill)
  app.get('/api/auth/discord/url', (req, res) => {
    const redirectUri = (req.query.redirectUri as string) || `${req.protocol}://${req.get('host')}/auth/callback`;
    const clientId = process.env.DISCORD_CLIENT_ID || '';

    if (!clientId) {
      res.status(400).json({
        configured: false,
        error: 'DISCORD_CLIENT_ID is not set in environment variables.',
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

  // OAuth popup callback handler (sends postMessage to opener inside iframe)
  const callbackHandler: express.RequestHandler = async (req, res) => {
    const { code } = req.query;
    res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #F8FAFC; color: #0F172A;">
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'discord', code: ${JSON.stringify(code || '')} }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <div style="text-align: center;">
            <h3 style="margin-bottom: 8px;">Account Connected</h3>
            <p style="font-size: 14px; color: #475569;">This window will close automatically.</p>
          </div>
        </body>
      </html>
    `);
  };

  app.get(['/auth/callback', '/auth/callback/'], callbackHandler);

  // Descriptive Location Engine API
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
Whenever a user or connected agent asks for something (via the dock or the Cmd+K quick-launch bar), you execute a visual 3D tool that physically sorts through the color-coordinated app balls and arranges them into a meaningful 3D structural formation:

Available 3D Structural Formations (choose the best one in "formation"):
- "clusters": Grouped into their color-coordinated spheres (Work, Personal, Skills, Storage, Discord, WhatsApp, Local Folders).
- "daily-flow": Organizes balls into a 3-tier Daily Workload Runway (Urgent Today in the front row, On Deck Today in the middle arc, and Caught Up in the calm back arc).
- "app-grid": Snaps balls into clean vertical columns sorted by App/Connector Emblem.
- "kaleidoscope": Symmetrical geometric mandala ring sorted by color harmony.
- "caught-up-smile": Arranges all the balls into a cheerful 3D Smile & Eyes formation when everything is caught up!

Available Engine Tool Names (set in "toolCalled"):
- "locate_and_pull_balls"
- "sort_daily_workload"
- "align_app_columns"
- "form_kaleidoscope_mandala"
- "form_caught_up_smile"
- "break_apart_all_clusters"
- "index_new_ball"

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
                description: 'Descriptive location output explaining where the items live and how the 3D balls were organized.',
              },
              toolCalled: {
                type: Type.STRING,
              },
              action: {
                type: Type.STRING,
                description: 'One of: EXPLODE_ALL, CLUSTER_ALL, FOCUS_CATEGORY, RETRIEVE_FILE, CREATE_NODE, UPDATE_CATEGORY_COLOR, SET_FORMATION, NONE',
              },
              formation: {
                type: Type.STRING,
                description: 'One of: clusters, daily-flow, app-grid, kaleidoscope, caught-up-smile',
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
            required: ['reply', 'toolCalled', 'action', 'formation', 'retrievedFileIds', 'suggestedFollowUps'],
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
