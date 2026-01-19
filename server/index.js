import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

/**
 * Recursively reads directory structure and returns file/folder info
 * @param {string} dirPath - The directory path to scan
 * @returns {Promise<Array>} Array of file/folder objects
 */
async function getDirectoryStructure(dirPath) {
  const items = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      try {
        const stats = await fs.stat(fullPath);
        
        const item = {
          name: entry.name,
          isDirectory: entry.isDirectory(),
          size: stats.size,
          lastModified: stats.mtime.toISOString()
        };
        
        if (entry.isDirectory()) {
          item.children = await getDirectoryStructure(fullPath);
          // Calculate directory size as sum of all children
          item.size = calculateDirectorySize(item.children);
        }
        
        items.push(item);
      } catch (err) {
        // Skip files we can't access
        console.warn(`Cannot access ${fullPath}: ${err.message}`);
      }
    }
  } catch (err) {
    throw new Error(`Cannot read directory: ${err.message}`);
  }
  
  return items.sort((a, b) => {
    // Directories first, then alphabetically
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Calculate total size of directory from its children
 * @param {Array} children - Array of child items
 * @returns {number} Total size in bytes
 */
function calculateDirectorySize(children) {
  return children.reduce((total, child) => total + child.size, 0);
}

/**
 * Compare two folder structures for equality
 * @param {Array} clientStructure - Structure from client
 * @param {Array} serverStructure - Structure from server
 * @returns {Object} Comparison result with details
 */
function compareStructures(clientStructure, serverStructure) {
  const differences = [];

  function compare(clientItems, serverItems, pathPrefix = '') {
    // Create maps for easier lookup
    const clientMap = new Map(clientItems.map(item => [item.name, item]));
    const serverMap = new Map(serverItems.map(item => [item.name, item]));

    // Check for items in client but not in server
    for (const [name, clientItem] of clientMap) {
      const currentPath = pathPrefix ? `${pathPrefix}/${name}` : name;
      
      if (!serverMap.has(name)) {
        differences.push({
          type: 'missing_on_server',
          path: currentPath,
          message: `File/folder "${currentPath}" exists in uploaded structure but not on server`
        });
        continue;
      }

      const serverItem = serverMap.get(name);

      // Check if type matches (file vs directory)
      if (clientItem.isDirectory !== serverItem.isDirectory) {
        differences.push({
          type: 'type_mismatch',
          path: currentPath,
          message: `"${currentPath}" is a ${clientItem.isDirectory ? 'directory' : 'file'} in upload but a ${serverItem.isDirectory ? 'directory' : 'file'} on server`
        });
        continue;
      }

      // For directories, recursively compare children
      if (clientItem.isDirectory && serverItem.isDirectory) {
        compare(clientItem.children || [], serverItem.children || [], currentPath);
      }
    }

    // Check for items in server but not in client
    for (const [name, serverItem] of serverMap) {
      if (!clientMap.has(name)) {
        const currentPath = pathPrefix ? `${pathPrefix}/${name}` : name;
        differences.push({
          type: 'missing_on_client',
          path: currentPath,
          message: `File/folder "${currentPath}" exists on server but not in uploaded structure`
        });
      }
    }
  }

  compare(clientStructure, serverStructure);

  return {
    isMatch: differences.length === 0,
    differences
  };
}

/**
 * POST /api/validate
 * Validates that the absolute path is accessible and folder structure matches
 */
app.post('/api/validate', async (req, res) => {
  try {
    const { absolutePath, folderStructure } = req.body;

    // Validate input
    if (!absolutePath || typeof absolutePath !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'Absolute path is required'
      });
    }

    if (!folderStructure || !Array.isArray(folderStructure)) {
      return res.status(400).json({
        ok: false,
        error: 'Folder structure is required and must be an array'
      });
    }

    // Check if path is absolute
    if (!path.isAbsolute(absolutePath)) {
      return res.status(400).json({
        ok: false,
        error: 'Path must be an absolute path'
      });
    }

    // Check if path exists and is accessible
    try {
      const stats = await fs.stat(absolutePath);
      if (!stats.isDirectory()) {
        return res.status(400).json({
          ok: false,
          error: 'Path exists but is not a directory'
        });
      }
    } catch (err) {
      return res.status(400).json({
        ok: false,
        error: `Path is not accessible: ${err.message}`
      });
    }

    // Get server-side folder structure
    const serverStructure = await getDirectoryStructure(absolutePath);

    // Compare structures
    const comparison = compareStructures(folderStructure, serverStructure);

    if (!comparison.isMatch) {
      return res.status(400).json({
        ok: false,
        error: 'Folder structure mismatch',
        details: comparison.differences
      });
    }

    // Success!
    return res.json({
      ok: true,
      message: 'Validation successful! Folder structure matches.'
    });

  } catch (err) {
    console.error('Validation error:', err);
    return res.status(500).json({
      ok: false,
      error: `Server error: ${err.message}`
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Generate a unique tmp folder path
 * @param {string} originalPath - Original folder path
 * @returns {string} Tmp folder path
 */
function getTmpFolderPath(originalPath) {
  const parentDir = path.dirname(originalPath);
  const folderName = path.basename(originalPath);
  return path.join(parentDir, `.${folderName}_backup_${Date.now()}`);
}

/**
 * Copy directory recursively
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Remove directory recursively
 * @param {string} dirPath - Directory to remove
 */
async function removeDirectory(dirPath) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (err) {
    console.error(`Error removing directory ${dirPath}:`, err);
    throw err;
  }
}

/**
 * Apply changes to the folder structure
 * @param {string} basePath - Base path of the folder
 * @param {Array} changeLog - Array of changes to apply
 */
async function applyChanges(basePath, changeLog) {
  for (const change of changeLog) {
    if (change.type === 'move') {
      const fromPath = path.join(basePath, change.from);
      const toPath = path.join(basePath, change.to);
      
      // Ensure target directory exists
      const toDir = path.dirname(toPath);
      await fs.mkdir(toDir, { recursive: true });
      
      // If override, remove existing
      if (change.override) {
        try {
          const stats = await fs.stat(toPath);
          if (stats.isDirectory()) {
            await removeDirectory(toPath);
          } else {
            await fs.unlink(toPath);
          }
        } catch (err) {
          // File doesn't exist, that's fine
        }
      }
      
      // Move the file/folder
      await fs.rename(fromPath, toPath);
      
    } else if (change.type === 'rename') {
      const oldPath = path.join(basePath, change.path);
      const parentDir = path.dirname(oldPath);
      const newPath = path.join(parentDir, change.newName);
      
      // If override, remove existing
      if (change.override) {
        try {
          const stats = await fs.stat(newPath);
          if (stats.isDirectory()) {
            await removeDirectory(newPath);
          } else {
            await fs.unlink(newPath);
          }
        } catch (err) {
          // File doesn't exist, that's fine
        }
      }
      
      // Rename the file/folder
      await fs.rename(oldPath, newPath);
      
    } else if (change.type === 'delete') {
      const deletePath = path.join(basePath, change.path);
      
      try {
        const stats = await fs.stat(deletePath);
        if (stats.isDirectory()) {
          await removeDirectory(deletePath);
        } else {
          await fs.unlink(deletePath);
        }
      } catch (err) {
        console.warn(`Could not delete ${deletePath}: ${err.message}`);
        // Continue with other changes
      }
    }
  }
}

// Store active tmp folders for cleanup
const activeTmpFolders = new Map();

/**
 * POST /api/apply-changes
 * Apply changes to the folder structure
 */
app.post('/api/apply-changes', async (req, res) => {
  const { absolutePath, changeLog, clone } = req.body;
  let tmpPath = null;

  try {
    // Validate input
    if (!absolutePath || typeof absolutePath !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'Absolute path is required'
      });
    }

    if (!changeLog || !Array.isArray(changeLog) || changeLog.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Change log is required and must not be empty'
      });
    }

    // Check if path exists
    try {
      await fs.access(absolutePath);
    } catch (err) {
      return res.status(400).json({
        ok: false,
        error: 'Path is not accessible'
      });
    }

    // If clone is true, create a backup first
    if (clone) {
      tmpPath = getTmpFolderPath(absolutePath);
      console.log(`Creating backup at: ${tmpPath}`);
      
      try {
        await copyDirectory(absolutePath, tmpPath);
        console.log('Backup created successfully');
      } catch (err) {
        return res.status(500).json({
          ok: false,
          error: `Failed to create backup: ${err.message}`
        });
      }
    }

    // Apply changes
    try {
      console.log(`Applying ${changeLog.length} changes...`);
      await applyChanges(absolutePath, changeLog);
      console.log('Changes applied successfully');
    } catch (err) {
      console.error('Error applying changes:', err);
      
      // If clone was enabled, restore from backup
      if (clone && tmpPath) {
        console.log('Restoring from backup...');
        try {
          await removeDirectory(absolutePath);
          await copyDirectory(tmpPath, absolutePath);
          await removeDirectory(tmpPath);
          console.log('Restored from backup successfully');
        } catch (restoreErr) {
          console.error('Error during restore:', restoreErr);
          return res.status(500).json({
            ok: false,
            error: `Failed to apply changes and restore failed: ${err.message}. Backup still exists at: ${tmpPath}`
          });
        }
      }
      
      return res.status(500).json({
        ok: false,
        error: `Failed to apply changes: ${err.message}`
      });
    }

    // Success response
    if (clone && tmpPath) {
      // Store tmp path for later cleanup
      activeTmpFolders.set(absolutePath, tmpPath);
      
      return res.json({
        ok: true,
        message: 'Changes applied successfully! Backup is available.',
        tmpPath,
        clone: true
      });
    } else {
      return res.json({
        ok: true,
        message: 'Changes applied successfully!',
        clone: false
      });
    }

  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({
      ok: false,
      error: `Server error: ${err.message}`
    });
  }
});

/**
 * POST /api/remove-backup
 * Remove the temporary backup folder
 */
app.post('/api/remove-backup', async (req, res) => {
  const { absolutePath } = req.body;

  try {
    if (!absolutePath) {
      return res.status(400).json({
        ok: false,
        error: 'Absolute path is required'
      });
    }

    const tmpPath = activeTmpFolders.get(absolutePath);
    
    if (!tmpPath) {
      return res.status(400).json({
        ok: false,
        error: 'No backup found for this path'
      });
    }

    // Check if tmp folder exists
    try {
      await fs.access(tmpPath);
    } catch (err) {
      activeTmpFolders.delete(absolutePath);
      return res.status(400).json({
        ok: false,
        error: 'Backup folder no longer exists'
      });
    }

    // Remove the backup
    console.log(`Removing backup: ${tmpPath}`);
    await removeDirectory(tmpPath);
    activeTmpFolders.delete(absolutePath);
    console.log('Backup removed successfully');

    return res.json({
      ok: true,
      message: 'Backup removed successfully!'
    });

  } catch (err) {
    console.error('Error removing backup:', err);
    return res.status(500).json({
      ok: false,
      error: `Failed to remove backup: ${err.message}`
    });
  }
});

const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
