import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { Pool, QueryResult } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Create a rate limiter that allows 10 requests per minute
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests, please try again later.',
  handler: (req, res) => {
    console.error(`Rate limit exceeded for IP: ${req.ip} on path: ${req.path}`);
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
});

// Apply rate limiter to all routes
app.use(limiter);

// Database connection
let pool: Pool | null = null;
try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  console.log('Database connection established');
} catch (error) {
  console.error('Failed to connect to database:', error instanceof Error ? error.message : String(error));
}

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

// Liveness probe endpoint
app.get('/live', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

// Main endpoint
app.get('/', (_req: Request, res: Response) => {
  res.send('Hello from the debug pod application! Try accessing <a href="/greeting">/greeting</a> to see a message from the database.');
});


// Greeting endpoint - fetches the greeting from the database
app.get('/greeting', async (_req: Request, res: Response) => {
  if (!pool) {
    return res.status(500).send('Database connection not established');
  }

  try {
    const result: QueryResult = await pool.query('SELECT value FROM assignment2 WHERE key = $1', ['greeting']);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Greeting not found in database' });
    }

    res.json({ greeting: result.rows[0].value });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Download endpoint - redirects to a specific file
app.get('/download', (_req: Request, res: Response) => {
  const downloadsDir = path.join(__dirname, '..', 'downloads');

  // Check if the downloads directory exists
  if (!fs.existsSync(downloadsDir)) {
    console.error(`Error: Downloads directory ${downloadsDir} not found`);
    process.exit(1); // Crash the application if downloads directory doesn't exist
  }

  try {
    const files = fs.readdirSync(downloadsDir);

    if (files.length === 0) {
      return res.status(200).json({ message: 'empty' });
    }

    const randomFile = files[Math.floor(Math.random() * files.length)];

    // Redirect to the specific file path
    res.redirect(302, `/download/${randomFile}`);
  } catch (error) {
    console.error('Error reading downloads directory:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to read downloads directory' });
  }
});

// Specific file download endpoint
app.get('/download/:filename', (req: Request, res: Response) => {
  const downloadsDir = path.join(__dirname, '..', 'downloads');

  // Check if the downloads directory exists
  if (!fs.existsSync(downloadsDir)) {
    console.error(`Error: Downloads directory ${downloadsDir} not found`);
    process.exit(1);
  }

  try {
    const filename = req.params.filename;
    const filePath = path.join(downloadsDir, filename);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get file stats
    const stats = fs.statSync(filePath);

    // Determine the correct MIME type based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';

    // Map common extensions to MIME types
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.zip': 'application/zip',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip'
    };

    if (mimeTypes[ext]) {
      contentType = mimeTypes[ext];
    }

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Handle errors in the stream
    fileStream.on('error', (error) => {
      console.error(`Error streaming file ${filename}:`, error instanceof Error ? error.message : String(error));
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream file' });
      }
    });
  } catch (error) {
    console.error('Error reading file:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
