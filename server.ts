import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '10mb' }));

  // API endpoint: Execute user Python 3.10 code
  app.post('/api/python/run', async (req, res) => {
    try {
      const { code, state, timeoutMs = 8000 } = req.body;

      if (typeof code !== 'string') {
        res.status(400).json({ error: 'Code must be a string' });
        return;
      }

      // If simulated topology state was sent, write it to a session temporary state file
      const stateFile = path.resolve('/tmp', `netkings_state_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
      if (state) {
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
      }

      const pythonEnvPath = path.resolve(__dirname, 'python_env');
      const startTime = Date.now();

      const env = {
        ...process.env,
        PYTHONPATH: pythonEnvPath,
        NETKINGS_STATE_FILE: stateFile,
        PYTHONUNBUFFERED: '1',
      };

      const pyProcess = spawn('python3', ['-c', code], {
        env,
        timeout: timeoutMs,
      });

      let stdout = '';
      let stderr = '';

      pyProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pyProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pyProcess.on('close', (exitCode) => {
        const executionTime = Date.now() - startTime;
        let updatedState = null;

        if (fs.existsSync(stateFile)) {
          try {
            updatedState = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
            fs.unlinkSync(stateFile);
          } catch {
            // ignore
          }
        }

        res.json({
          stdout,
          stderr,
          exitCode: exitCode ?? 0,
          executionTime,
          updatedState,
        });
      });

      pyProcess.on('error', (err) => {
        if (fs.existsSync(stateFile)) {
          try { fs.unlinkSync(stateFile); } catch {}
        }
        res.status(500).json({
          error: err.message,
          stdout,
          stderr: stderr + '\n' + err.message,
          exitCode: -1,
        });
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Healthcheck & Python version info
  app.get('/api/python/version', (req, res) => {
    res.json({
      status: 'ok',
      pythonVersion: 'Python 3.10.12',
      features: ['netkings', 'netmiko', 'ipaddress', 're', 'json', 'socket', 'urllib', 'math'],
    });
  });

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
