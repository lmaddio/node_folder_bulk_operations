/**
 * Tree Rendering and Manipulation
 */

import { state } from './state.js';
import { elements } from './dom.js';
import { formatSize, formatDate, escapeHtml, getParentPath } from './utils.js';
import { findItemByPath, findItemLocation, findConflict, recalculateSizes, sortItems, calculateStats } from './folder.js';
import { showModal, hideModal, showError } from './modal.js';
import { updateSubmitButtonState } from './ui.js';

/**
 * Render folder tree
 * @param {Array} items - Items to render
 * @param {HTMLElement} container - Container element
 * @param {string} currentPath - Current path prefix
 */
export function renderTree(items, container, currentPath = '') {
  container.innerHTML = '';

  // Add drop zone for root level if this is the root container
  if (currentPath === '' && state.isValidated) {
    const rootDropZone = document.createElement('div');
    rootDropZone.className = 'drop-zone drop-zone-root';
    rootDropZone.dataset.targetPath = '';
    rootDropZone.innerHTML = '<span>Drop here to move to root</span>';
    setupDropZone(rootDropZone, '');
    container.appendChild(rootDropZone);
  }

  for (const item of items) {
    const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
    const itemEl = document.createElement('div');
    itemEl.className = 'tree-item';
    itemEl.dataset.path = itemPath;

    const headerEl = document.createElement('div');
    headerEl.className = 'tree-item-header';

    const hasChildren = item.isDirectory && item.children && item.children.length > 0;

    // Create elements
    const toggleEl = document.createElement('span');
    toggleEl.className = `tree-toggle ${hasChildren ? '' : 'hidden'}`;
    toggleEl.style.visibility = hasChildren ? 'visible' : 'hidden';
    toggleEl.textContent = '▶';

    const iconEl = document.createElement('span');
    iconEl.className = 'tree-icon';
    iconEl.textContent = item.isDirectory ? '📁' : '📄';

    const nameEl = document.createElement('span');
    nameEl.className = 'tree-name';
    nameEl.textContent = item.name;

    const metaEl = document.createElement('span');
    metaEl.className = 'tree-meta';
    metaEl.innerHTML = `
      <span class="tree-size">${formatSize(item.size)}</span>
      <span class="tree-date">${formatDate(new Date(item.lastModified))}</span>
    `;

    headerEl.appendChild(toggleEl);
    headerEl.appendChild(iconEl);
    headerEl.appendChild(nameEl);
    headerEl.appendChild(metaEl);

    // Add edit and delete buttons if validated
    if (state.isValidated) {
      // Double-click on name to rename
      nameEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        startRename(itemPath, nameEl, item);
      });
      nameEl.classList.add('editable');

      const actionsEl = document.createElement('span');
      actionsEl.className = 'tree-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'tree-action-btn tree-edit-btn';
      editBtn.textContent = '✏️';
      editBtn.title = 'Rename';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startRename(itemPath, nameEl, item);
      });
      actionsEl.appendChild(editBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'tree-action-btn tree-delete-btn';
      deleteBtn.textContent = '🗑️';
      deleteBtn.title = 'Remove';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDelete(itemPath, item);
      });
      actionsEl.appendChild(deleteBtn);

      headerEl.appendChild(actionsEl);

      // Make draggable
      headerEl.draggable = true;
      headerEl.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        state.draggedItem = item;
        state.draggedItemPath = itemPath;
        headerEl.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', itemPath);
      });

      headerEl.addEventListener('dragend', () => {
        headerEl.classList.remove('dragging');
        state.draggedItem = null;
        state.draggedItemPath = null;
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
      });

      // If this is a directory, make it a drop target
      if (item.isDirectory) {
        setupDirectoryDropTarget(headerEl, itemEl, item, itemPath);
      }
    }

    itemEl.appendChild(headerEl);

    // Handle directory children and drop zones
    if (item.isDirectory) {
      const childrenEl = document.createElement('div');
      childrenEl.className = 'tree-children';
      
      if (state.isValidated) {
        const dropZone = document.createElement('div');
        dropZone.className = 'drop-zone';
        dropZone.dataset.targetPath = itemPath;
        dropZone.innerHTML = `<span>Drop here to move into "${escapeHtml(item.name)}"</span>`;
        setupDropZone(dropZone, itemPath);
        childrenEl.appendChild(dropZone);
      }

      if (hasChildren) {
        renderTree(item.children, childrenEl, itemPath);
      }
      
      itemEl.appendChild(childrenEl);

      // Toggle expand/collapse
      const toggleClick = (e) => {
        if (e.target.closest('.tree-edit-btn') || e.target.closest('.tree-delete-btn')) return;
        toggleEl.classList.toggle('expanded');
        childrenEl.classList.toggle('expanded');
      };
      
      toggleEl.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleClick(e);
      });
      
      iconEl.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleClick(e);
      });
    }

    container.appendChild(itemEl);
  }
}

/**
 * Set up a directory header as a drop target
 */
function setupDirectoryDropTarget(headerEl, itemEl, item, itemPath) {
  headerEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!state.draggedItem || !state.draggedItemPath) return;
    if (state.draggedItemPath === itemPath) return;
    if (itemPath.startsWith(state.draggedItemPath + '/')) return;
    
    const draggedParentPath = getParentPath(state.draggedItemPath);
    if (draggedParentPath === itemPath) return;
    
    headerEl.classList.add('drop-target');
    e.dataTransfer.dropEffect = 'move';
  });

  headerEl.addEventListener('dragleave', (e) => {
    headerEl.classList.remove('drop-target');
  });

  headerEl.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    headerEl.classList.remove('drop-target');

    if (!state.draggedItem || !state.draggedItemPath) return;
    if (state.draggedItemPath === itemPath) return;
    
    if (itemPath.startsWith(state.draggedItemPath + '/')) {
      showError('Cannot move a folder into itself');
      return;
    }

    const draggedParentPath = getParentPath(state.draggedItemPath);
    if (draggedParentPath === itemPath) return;

    const targetChildren = item.children || [];
    const conflict = findConflict(targetChildren, state.draggedItem.name);
    
    if (conflict) {
      showConflictModal(state.draggedItem, state.draggedItemPath, itemPath, conflict);
    } else {
      performMove(state.draggedItemPath, itemPath);
    }
  });
}

/**
 * Set up a drop zone for drag and drop
 */
function setupDropZone(dropZone, targetPath) {
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!state.draggedItem || !state.draggedItemPath) return;
    if (targetPath && targetPath.startsWith(state.draggedItemPath + '/')) return;
    if (state.draggedItemPath === targetPath) return;
    
    const draggedParentPath = getParentPath(state.draggedItemPath);
    if (draggedParentPath === targetPath) return;
    
    dropZone.classList.add('drag-over');
    e.dataTransfer.dropEffect = 'move';
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');

    if (!state.draggedItem || !state.draggedItemPath) return;

    if (targetPath && targetPath.startsWith(state.draggedItemPath + '/')) {
      showError('Cannot move a folder into itself');
      return;
    }

    const draggedParentPath = getParentPath(state.draggedItemPath);
    if (draggedParentPath === targetPath) return;

    let currentTargetArray;
    if (targetPath === '') {
      currentTargetArray = state.folderStructure;
    } else {
      const targetItem = findItemByPath(state.folderStructure, targetPath);
      currentTargetArray = targetItem?.children || [];
    }

    const conflict = findConflict(currentTargetArray, state.draggedItem.name);
    
    if (conflict) {
      showConflictModal(state.draggedItem, state.draggedItemPath, targetPath, conflict);
    } else {
      performMove(state.draggedItemPath, targetPath);
    }
  });
}

/**
 * Perform the move operation
 */
export function performMove(sourcePath, targetPath, override = false) {
  const sourceLocation = findItemLocation(state.folderStructure, sourcePath);
  if (!sourceLocation) return;

  const movedItem = JSON.parse(JSON.stringify(sourceLocation.item));
  sourceLocation.parent.splice(sourceLocation.index, 1);

  let targetArray;
  if (targetPath === '') {
    targetArray = state.folderStructure;
  } else {
    const targetItem = findItemByPath(state.folderStructure, targetPath);
    if (!targetItem || !targetItem.isDirectory) return;
    if (!targetItem.children) targetItem.children = [];
    targetArray = targetItem.children;
  }

  if (override) {
    const existingIndex = targetArray.findIndex(it => it.name === movedItem.name);
    if (existingIndex !== -1) {
      targetArray.splice(existingIndex, 1);
    }
  }

  targetArray.push(movedItem);
  sortItems(targetArray);
  recalculateSizes(state.folderStructure);

  state.changeLog.push({
    type: 'move',
    timestamp: new Date().toISOString(),
    from: sourcePath,
    to: targetPath ? `${targetPath}/${movedItem.name}` : movedItem.name,
    override
  });

  refreshTreeAndStats();
}

/**
 * Start renaming an item
 */
export function startRename(itemPath, nameEl, item) {
  const currentName = item.name;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'tree-name-input';
  input.value = currentName;
  
  nameEl.textContent = '';
  nameEl.appendChild(input);
  input.focus();
  input.select();

  const finishRename = () => {
    const newName = input.value.trim();
    
    if (!newName || newName === currentName) {
      nameEl.textContent = currentName;
      return;
    }

    const location = findItemLocation(state.folderStructure, itemPath);
    if (!location) {
      nameEl.textContent = currentName;
      return;
    }

    const conflict = findConflict(location.parent, newName, item);
    
    if (conflict) {
      showRenameConflictModal(item, itemPath, newName, conflict, nameEl);
    } else {
      performRename(itemPath, newName);
    }
  };

  input.addEventListener('blur', finishRename);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur();
    } else if (e.key === 'Escape') {
      nameEl.textContent = currentName;
    }
  });
}

/**
 * Perform the rename operation
 */
export function performRename(itemPath, newName, override = false) {
  const location = findItemLocation(state.folderStructure, itemPath);
  if (!location) return;

  const oldName = location.item.name;

  if (override) {
    const existingIndex = location.parent.findIndex(it => it.name === newName && it !== location.item);
    if (existingIndex !== -1) {
      location.parent.splice(existingIndex, 1);
    }
  }

  location.item.name = newName;
  sortItems(location.parent);

  state.changeLog.push({
    type: 'rename',
    timestamp: new Date().toISOString(),
    path: itemPath,
    oldName,
    newName,
    override
  });

  refreshTreeAndStats();
}

/**
 * Confirm deletion of an item
 */
function confirmDelete(itemPath, item) {
  const itemType = item.isDirectory ? 'folder' : 'file';
  const childWarning = item.isDirectory && item.children && item.children.length > 0
    ? `<p class="delete-warning">⚠️ This folder contains ${item.children.length} item(s) that will also be removed.</p>`
    : '';

  showModal(`
    <div class="status status-warning">
      <div class="status-icon">🗑️</div>
      <h3>Remove ${itemType}?</h3>
      <p>Are you sure you want to remove "<strong>${escapeHtml(item.name)}</strong>"?</p>
      ${childWarning}
    </div>
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary" id="deleteCancelBtn">Cancel</button>
      <button type="button" class="btn btn-danger" id="deleteConfirmBtn">Remove</button>
    </div>
  `, false);

  document.getElementById('deleteCancelBtn').addEventListener('click', hideModal);
  document.getElementById('deleteConfirmBtn').addEventListener('click', () => {
    hideModal();
    performDelete(itemPath, item);
  });
}

/**
 * Perform the delete operation
 */
function performDelete(itemPath, item) {
  const location = findItemLocation(state.folderStructure, itemPath);
  if (!location) return;

  location.parent.splice(location.index, 1);
  recalculateSizes(state.folderStructure);

  state.changeLog.push({
    type: 'delete',
    timestamp: new Date().toISOString(),
    path: itemPath,
    itemName: item.name,
    isDirectory: item.isDirectory
  });

  refreshTreeAndStats();
}

/**
 * Show conflict modal for move operations
 */
function showConflictModal(movedItem, sourcePath, targetPath, existingItem) {
  const targetDisplay = targetPath || 'root';
  
  showModal(`
    <div class="status status-warning">
      <div class="status-icon">⚠️</div>
      <h3>Name Conflict</h3>
      <p>A ${existingItem.isDirectory ? 'folder' : 'file'} named "<strong>${escapeHtml(movedItem.name)}</strong>" already exists in "${escapeHtml(targetDisplay)}".</p>
      <p>Do you want to replace it?</p>
    </div>
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary" id="conflictCancelBtn">Cancel</button>
      <button type="button" class="btn btn-danger" id="conflictConfirmBtn">Replace</button>
    </div>
  `, false);

  document.getElementById('conflictCancelBtn').addEventListener('click', hideModal);
  document.getElementById('conflictConfirmBtn').addEventListener('click', () => {
    hideModal();
    performMove(sourcePath, targetPath, true);
  });
}

/**
 * Show conflict modal for rename operations
 */
function showRenameConflictModal(item, itemPath, newName, existingItem, nameEl) {
  showModal(`
    <div class="status status-warning">
      <div class="status-icon">⚠️</div>
      <h3>Name Conflict</h3>
      <p>A ${existingItem.isDirectory ? 'folder' : 'file'} named "<strong>${escapeHtml(newName)}</strong>" already exists in this location.</p>
      <p>Do you want to replace it?</p>
    </div>
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary" id="conflictCancelBtn">Cancel</button>
      <button type="button" class="btn btn-danger" id="conflictConfirmBtn">Replace</button>
    </div>
  `, false);

  document.getElementById('conflictCancelBtn').addEventListener('click', () => {
    hideModal();
    nameEl.textContent = item.name;
  });
  document.getElementById('conflictConfirmBtn').addEventListener('click', () => {
    hideModal();
    performRename(itemPath, newName, true);
  });
}

/**
 * Refresh the tree display and stats
 */
export function refreshTreeAndStats() {
  const stats = calculateStats(state.folderStructure);
  elements.previewStats.innerHTML = `
    <span>📁 ${stats.dirCount} folders</span>
    <span>📄 ${stats.fileCount} files</span>
    <span>💾 ${formatSize(stats.totalSize)}</span>
  `;

  renderTree(state.folderStructure, elements.folderTree);
  updateSubmitButtonState();
}
