/**
 * Folder Structure Utilities
 */

import { state, deepClone } from './state.js';

/**
 * Build folder structure from FileList
 * @param {FileList} files - The files from the folder input
 * @returns {Array} Structured folder data
 */
export function buildFolderStructure(files) {
  const root = [];
  const directories = new Map();

  // Get the root folder name from the first file's path
  if (files.length > 0) {
    const firstPath = files[0].webkitRelativePath;
    state.rootFolderName = firstPath.split('/')[0];
  }

  // Process each file
  for (const file of files) {
    const pathParts = file.webkitRelativePath.split('/');
    // Remove root folder name from path
    pathParts.shift();
    
    if (pathParts.length === 0) continue;

    let currentLevel = root;
    let currentPath = '';

    // Process each part of the path
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const isFile = i === pathParts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (isFile) {
        // Add file
        currentLevel.push({
          name: part,
          isDirectory: false,
          size: file.size,
          lastModified: new Date(file.lastModified).toISOString()
        });
      } else {
        // Check if directory already exists
        let dir = currentLevel.find(item => item.name === part && item.isDirectory);
        
        if (!dir) {
          dir = {
            name: part,
            isDirectory: true,
            size: 0,
            lastModified: new Date(file.lastModified).toISOString(),
            children: []
          };
          currentLevel.push(dir);
          directories.set(currentPath, dir);
        }
        
        currentLevel = dir.children;
      }
    }
  }

  // Calculate directory sizes and sort
  recalculateSizes(root);
  sortItems(root);

  return root;
}

/**
 * Calculate folder statistics
 * @param {Array} structure - Folder structure
 * @returns {Object} Statistics object
 */
export function calculateStats(structure) {
  let fileCount = 0;
  let dirCount = 0;
  let totalSize = 0;

  function count(items) {
    for (const item of items) {
      if (item.isDirectory) {
        dirCount++;
        if (item.children) {
          count(item.children);
        }
      } else {
        fileCount++;
        totalSize += item.size;
      }
    }
  }

  count(structure);
  return { fileCount, dirCount, totalSize };
}

/**
 * Find an item by path in the folder structure
 * @param {Array} structure - Folder structure
 * @param {string} path - Path to find
 * @returns {Object|null} Found item or null
 */
export function findItemByPath(structure, path) {
  const parts = path.split('/').filter(p => p);
  let current = structure;
  let item = null;

  for (let i = 0; i < parts.length; i++) {
    item = current.find(it => it.name === parts[i]);
    if (!item) return null;
    if (i < parts.length - 1) {
      if (!item.children) return null;
      current = item.children;
    }
  }

  return item;
}

/**
 * Find parent array and index of an item by path
 * @param {Array} structure - Folder structure
 * @param {string} path - Path to find
 * @returns {Object|null} { parent: Array, index: number, item: Object } or null
 */
export function findItemLocation(structure, path) {
  const parts = path.split('/').filter(p => p);
  if (parts.length === 0) return null;

  let current = structure;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const parent = current.find(it => it.name === parts[i]);
    if (!parent || !parent.children) return null;
    current = parent.children;
  }

  const itemName = parts[parts.length - 1];
  const index = current.findIndex(it => it.name === itemName);
  
  if (index === -1) return null;
  
  return { parent: current, index, item: current[index] };
}

/**
 * Check if an item with the given name exists in the target array
 * @param {Array} targetArray - Array to check
 * @param {string} name - Name to check for
 * @param {Object} excludeItem - Item to exclude from check
 * @returns {Object|null} Existing item or null
 */
export function findConflict(targetArray, name, excludeItem = null) {
  return targetArray.find(it => it.name === name && it !== excludeItem) || null;
}

/**
 * Recalculate sizes for all directories in the structure
 * @param {Array} structure - Folder structure
 * @returns {number} Total size
 */
export function recalculateSizes(structure) {
  let totalSize = 0;
  
  for (const item of structure) {
    if (item.isDirectory && item.children) {
      item.size = recalculateSizes(item.children);
    }
    totalSize += item.size;
  }
  
  return totalSize;
}

/**
 * Sort items: directories first, then alphabetically
 * @param {Array} items - Items to sort
 */
export function sortItems(items) {
  items.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
  for (const item of items) {
    if (item.children) {
      sortItems(item.children);
    }
  }
}

/**
 * Compare two structures to detect changes
 * @param {Array} original - Original structure
 * @param {Array} current - Current structure
 * @param {string} path - Current path prefix
 * @returns {boolean} Whether structures are different
 */
export function hasStructureChanged(original, current, path = '') {
  if (original.length !== current.length) return true;

  const origMap = new Map(original.map(it => [it.name, it]));
  const currMap = new Map(current.map(it => [it.name, it]));

  for (const [name, origItem] of origMap) {
    if (!currMap.has(name)) return true;
    
    const currItem = currMap.get(name);
    if (origItem.isDirectory !== currItem.isDirectory) return true;
    
    if (origItem.isDirectory && currItem.isDirectory) {
      if (hasStructureChanged(origItem.children || [], currItem.children || [], `${path}/${name}`)) {
        return true;
      }
    }
  }

  for (const [name] of currMap) {
    if (!origMap.has(name)) return true;
  }

  return false;
}

/**
 * Generate a change summary object
 * @returns {Object} Change summary
 */
export function generateChangeSummary() {
  return {
    timestamp: new Date().toISOString(),
    absolutePath: document.getElementById('absolutePath').value.trim(),
    changeLog: [...state.changeLog],
    originalStructure: deepClone(state.originalStructure),
    newStructure: deepClone(state.folderStructure)
  };
}
