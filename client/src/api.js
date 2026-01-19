/**
 * API Communication
 */

/**
 * Validate folder structure with server
 * @param {string} absolutePath - Server path
 * @param {Array} folderStructure - Folder structure to validate
 * @returns {Promise<Object>} Response data
 */
export async function validateFolder(absolutePath, folderStructure) {
  const response = await fetch('/api/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      absolutePath,
      folderStructure
    })
  });

  return response.json();
}

/**
 * Apply changes to server
 * @param {string} absolutePath - Server path
 * @param {Array} changeLog - Changes to apply
 * @param {boolean} clone - Whether to create backup
 * @returns {Promise<Object>} Response data
 */
export async function applyChanges(absolutePath, changeLog, clone) {
  const response = await fetch('/api/apply-changes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      absolutePath,
      changeLog,
      clone
    })
  });

  return response.json();
}

/**
 * Remove backup folder
 * @param {string} absolutePath - Original folder path
 * @returns {Promise<Object>} Response data
 */
export async function removeBackup(absolutePath) {
  const response = await fetch('/api/remove-backup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ absolutePath })
  });

  return response.json();
}
