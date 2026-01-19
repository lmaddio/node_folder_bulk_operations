/**
 * Event Handlers
 */

import { state, deepClone } from './state.js';
import { elements } from './dom.js';
import { escapeHtml, formatSize } from './utils.js';
import { buildFolderStructure, calculateStats, hasStructureChanged, generateChangeSummary } from './folder.js';
import { showModal, hideModal, showLoading, showSuccess, showError } from './modal.js';
import { renderTree, refreshTreeAndStats } from './tree.js';
import { updateButtonState, updateSubmitButtonState, resetUI, resetAfterSubmit } from './ui.js';
import * as api from './api.js';

/**
 * Handle folder selection
 * @param {Event} event - Change event
 */
export function handleFolderSelect(event) {
  const files = event.target.files;
  
  if (!files.length) {
    state.folderStructure = [];
    elements.selectedFolderName.textContent = '';
    elements.selectedFolderName.classList.remove('active');
    elements.previewSection.style.display = 'none';
    updateButtonState();
    return;
  }

  // Build folder structure
  state.folderStructure = buildFolderStructure(files);

  // Update UI
  elements.selectedFolderName.textContent = `✓ ${state.rootFolderName} (${files.length} files)`;
  elements.selectedFolderName.classList.add('active');

  // Calculate and display stats
  const stats = calculateStats(state.folderStructure);
  elements.previewStats.innerHTML = `
    <span>📁 ${stats.dirCount} folders</span>
    <span>📄 ${stats.fileCount} files</span>
    <span>💾 ${formatSize(stats.totalSize)}</span>
  `;

  // Render tree
  renderTree(state.folderStructure, elements.folderTree);
  elements.previewSection.style.display = 'block';

  updateButtonState();
}

/**
 * Handle form submission (validation)
 */
export async function handleSubmit() {
  const absolutePath = elements.absolutePathInput.value.trim();

  if (!absolutePath) {
    showError('Please enter an absolute path');
    return;
  }

  if (state.folderStructure.length === 0) {
    showError('Please select a folder');
    return;
  }

  showLoading('Validating folder structure...');

  try {
    const data = await api.validateFolder(absolutePath, state.folderStructure);

    if (data.ok) {
      // Store original structure for comparison
      state.originalStructure = deepClone(state.folderStructure);
      state.isValidated = true;
      state.changeLog = [];
      
      // Re-render tree with editing capabilities
      renderTree(state.folderStructure, elements.folderTree);
      updateSubmitButtonState();
      
      // Disable path input and folder selection after validation
      elements.absolutePathInput.disabled = true;
      elements.folderInput.disabled = true;
      elements.selectFolderBtn.disabled = true;
      elements.startChangesBtn.disabled = true;
      elements.startChangesBtn.textContent = '✓ Validated';
      
      showSuccess(data.message || 'Folder structure validated successfully!', true);
    } else {
      showError(data.error || 'Validation failed', data.details);
    }
  } catch (err) {
    showError(`Network error: ${err.message}`);
  }
}

/**
 * Generate diff HTML for displaying changes
 */
function generateDiffHtml() {
  if (state.changeLog.length === 0) {
    return '<p class="no-changes">No changes to apply</p>';
  }

  const items = state.changeLog.map((c, index) => {
    let description = '';
    let icon = '';
    
    if (c.type === 'move') {
      icon = '📦';
      description = `<strong>Move:</strong> ${escapeHtml(c.from)} → ${escapeHtml(c.to)}`;
      if (c.override) {
        description += ' <span class="override-badge">Override</span>';
      }
    } else if (c.type === 'rename') {
      icon = '✏️';
      description = `<strong>Rename:</strong> ${escapeHtml(c.oldName)} → ${escapeHtml(c.newName)}`;
      if (c.override) {
        description += ' <span class="override-badge">Override</span>';
      }
    } else if (c.type === 'delete') {
      icon = '🗑️';
      description = `<strong>Delete:</strong> ${escapeHtml(c.path)}`;
    }
    
    return `
      <div class="diff-item">
        <span class="diff-number">${index + 1}</span>
        <span class="diff-icon">${icon}</span>
        <span class="diff-description">${description}</span>
      </div>
    `;
  }).join('');

  return `<div class="diff-list">${items}</div>`;
}

/**
 * Handle submit changes - show confirmation modal
 */
export function handleSubmitChanges() {
  if (!state.isValidated) return;
  
  const hasChanges = hasStructureChanged(state.originalStructure, state.folderStructure);
  if (!hasChanges) {
    showError('No changes to submit');
    return;
  }

  // Log to console
  const changeSummary = generateChangeSummary();
  console.log('=== FOLDER CHANGES SUMMARY ===');
  console.log(changeSummary);
  console.log('=== END OF CHANGES ===');
  
  // Show confirmation modal with diff
  showModal(`
    <div class="submit-modal">
      <h3>📋 Review Changes</h3>
      <p class="submit-subtitle">The following changes will be applied to:</p>
      <p class="submit-path">${escapeHtml(elements.absolutePathInput.value)}</p>
      
      <div class="diff-container">
        <div class="diff-header">
          <span>Changes (${state.changeLog.length})</span>
        </div>
        ${generateDiffHtml()}
      </div>
      
      <div class="safe-clone-option">
        <label class="checkbox-label">
          <input type="checkbox" id="safeCloneCheckbox" checked />
          <span class="checkbox-custom"></span>
          <span class="checkbox-text">
            <strong>Safe clone</strong>
            <small>Create a backup before applying changes. Allows rollback on error.</small>
          </span>
        </label>
      </div>
      
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="submitCancelBtn">Cancel</button>
        <button type="button" class="btn btn-primary" id="submitConfirmBtn">Confirm</button>
      </div>
    </div>
  `, false);

  document.getElementById('submitCancelBtn').addEventListener('click', hideModal);
  document.getElementById('submitConfirmBtn').addEventListener('click', () => {
    const safeClone = document.getElementById('safeCloneCheckbox').checked;
    applyChangesToServer(safeClone);
  });
}

/**
 * Apply changes to server
 */
async function applyChangesToServer(clone) {
  const absolutePath = elements.absolutePathInput.value.trim();
  
  showModal(`
    <div class="processing-modal">
      <div class="spinner"></div>
      <h3>Applying Changes...</h3>
      <p>${clone ? 'Creating backup and applying changes...' : 'Applying changes directly...'}</p>
      <p class="processing-note">Please wait, do not close this window.</p>
    </div>
  `, false);

  try {
    const data = await api.applyChanges(absolutePath, state.changeLog, clone);

    if (data.ok) {
      if (data.clone) {
        showModal(`
          <div class="status status-success">
            <div class="status-icon">✅</div>
            <h3>Changes Applied Successfully!</h3>
            <p>${escapeHtml(data.message)}</p>
            <div class="backup-info">
              <p>📁 A backup was created at:</p>
              <code>${escapeHtml(data.tmpPath)}</code>
              <p class="backup-note">You can remove the backup once you've verified the changes.</p>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="keepBackupBtn">Keep Backup</button>
            <button type="button" class="btn btn-danger" id="removeBackupBtn">🗑️ Remove Backup</button>
          </div>
        `, false);

        document.getElementById('keepBackupBtn').addEventListener('click', () => {
          hideModal();
          resetAfterSubmit();
        });
        
        document.getElementById('removeBackupBtn').addEventListener('click', () => {
          handleRemoveBackup(absolutePath);
        });
      } else {
        showModal(`
          <div class="status status-success">
            <div class="status-icon">✅</div>
            <h3>Changes Applied Successfully!</h3>
            <p>${escapeHtml(data.message)}</p>
            <p>All ${state.changeLog.length} changes have been applied to the folder.</p>
          </div>
        `, true);
        
        elements.modalCloseBtn.addEventListener('click', resetAfterSubmit, { once: true });
      }
    } else {
      showError(data.error || 'Failed to apply changes');
    }
  } catch (err) {
    showError(`Network error: ${err.message}`);
  }
}

/**
 * Handle remove backup
 */
async function handleRemoveBackup(absolutePath) {
  showModal(`
    <div class="processing-modal">
      <div class="spinner"></div>
      <h3>Removing Backup...</h3>
      <p>Please wait...</p>
    </div>
  `, false);

  try {
    const data = await api.removeBackup(absolutePath);

    if (data.ok) {
      showModal(`
        <div class="status status-success">
          <div class="status-icon">🗑️</div>
          <h3>Backup Removed!</h3>
          <p>${escapeHtml(data.message)}</p>
        </div>
      `, true);
      
      elements.modalCloseBtn.addEventListener('click', resetAfterSubmit, { once: true });
    } else {
      showError(data.error || 'Failed to remove backup');
    }
  } catch (err) {
    showError(`Network error: ${err.message}`);
  }
}

/**
 * Handle reset button click
 */
export function handleReset() {
  if (state.isValidated && state.changeLog.length > 0) {
    showModal(`
      <div class="status status-warning">
        <div class="status-icon">⚠️</div>
        <h3>Reset Changes?</h3>
        <p>You have unsaved changes. Are you sure you want to reset?</p>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="resetCancelBtn">Cancel</button>
        <button type="button" class="btn btn-danger" id="resetConfirmBtn">Reset</button>
      </div>
    `, false);
    
    document.getElementById('resetCancelBtn').addEventListener('click', hideModal);
    document.getElementById('resetConfirmBtn').addEventListener('click', () => {
      hideModal();
      resetUI();
    });
  } else {
    resetUI();
  }
}
