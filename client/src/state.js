/**
 * Application State Management
 */

// Application state
export const state = {
  folderStructure: [],
  originalStructure: [],
  rootFolderName: '',
  isValidated: false,
  draggedItem: null,
  draggedItemPath: null,
  changeLog: []
};

/**
 * Reset state to initial values
 */
export function resetState() {
  state.folderStructure = [];
  state.originalStructure = [];
  state.rootFolderName = '';
  state.isValidated = false;
  state.draggedItem = null;
  state.draggedItemPath = null;
  state.changeLog = [];
}

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
