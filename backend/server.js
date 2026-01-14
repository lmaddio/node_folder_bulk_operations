import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

/**
 * Validates folder path and its contents
 * POST /api/validate-folder
 * Body: { absolutePath: string, folderData: Array<{ name, size, type, lastModified }> }
 */
app.post('/api/validate-folder', async (req, res) => {
  try {
    const { absolutePath, folderData } = req.body;

    // Validate required fields
    if (!absolutePath) {
      return res.status(400).json({
        success: false,
        error: 'Absolute path is required'
      });
    }

    if (!folderData || !Array.isArray(folderData)) {
      return res.status(400).json({
        success: false,
        error: 'Folder data must be an array'
      });
    }

    // Check if path is absolute
    if (!path.isAbsolute(absolutePath)) {
      return res.status(400).json({
        success: false,
        error: 'Path must be an absolute path'
      });
    }

    // Check if folder exists
    if (!fs.existsSync(absolutePath)) {
      return res.status(400).json({
        success: false,
        error: `Folder does not exist: ${absolutePath}`
      });
    }

    // Check if it's a directory
    const stats = fs.statSync(absolutePath);
    if (!stats.isDirectory()) {
      return res.status(400).json({
        success: false,
        error: 'Path is not a directory'
      });
    }

    // Check read permissions
    try {
      fs.accessSync(absolutePath, fs.constants.R_OK);
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: 'No read permission for this folder'
      });
    }

    // Validate each item in folderData exists in the folder
    const errors = [];
    const validatedItems = [];

    for (const item of folderData) {
      const itemPath = path.join(absolutePath, item.name);

      if (!fs.existsSync(itemPath)) {
        errors.push(`Item not found: ${item.name}`);
        continue;
      }

      try {
        const itemStats = fs.statSync(itemPath);
        const expectedType = item.type === 'folder' ? 'directory' : 'file';
        const actualType = itemStats.isDirectory() ? 'directory' : 'file';

        if (expectedType !== actualType) {
          errors.push(`Type mismatch for ${item.name}: expected ${expectedType}, got ${actualType}`);
          continue;
        }

        validatedItems.push({
          name: item.name,
          exists: true,
          type: actualType,
          size: itemStats.size,
          lastModified: itemStats.mtime
        });
      } catch (err) {
        errors.push(`Error reading ${item.name}: ${err.message}`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
        validatedItems
      });
    }

    return res.json({
      success: true,
      message: 'All items validated successfully',
      validatedItems,
      totalItems: folderData.length
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
