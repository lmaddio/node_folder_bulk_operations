/**
 * UI State Management
 */

import { state, resetState, deepClone } from './state.js';
import { elements } from './dom.js';
import { hasStructureChanged } from './folder.js';

/**
 * Update button state based on form validity
 */
export function updateButtonState() {
  const hasPath = elements.absolutePathInput.value.trim().length > 0;
  const hasFolder = state.folderStructure.length > 0;
  elements.startChangesBtn.disabled = !(hasPath && hasFolder);
}

/**
 * Update the submit button state based on changes
 */
export function updateSubmitButtonState() {
  if (!state.isValidated) {
    elements.submitChangesBtn.style.display = 'none';
    return;
  }

  elements.submitChangesBtn.style.display = 'inline-flex';
  
  const hasChanges = hasStructureChanged(state.originalStructure, state.folderStructure);
  elements.submitChangesBtn.disabled = !hasChanges;
  
  if (hasChanges) {
    elements.submitChangesBtn.classList.add('has-changes');
  } else {
    elements.submitChangesBtn.classList.remove('has-changes');
  }
}

/**
 * Reset the entire UI to initial state
 */
export function resetUI() {
  // Reset state
  resetState();

  // Reset inputs
  elements.absolutePathInput.value = '';
  elements.absolutePathInput.disabled = false;
  elements.folderInput.value = '';
  elements.folderInput.disabled = false;
  elements.selectFolderBtn.disabled = false;
  
  // Reset folder selection display
  elements.selectedFolderName.textContent = '';
  elements.selectedFolderName.classList.remove('active');

  // Hide preview
  elements.previewSection.style.display = 'none';
  elements.folderTree.innerHTML = '';
  elements.previewStats.innerHTML = '';

  // Reset buttons
  elements.startChangesBtn.disabled = true;
  elements.startChangesBtn.textContent = '🚀 Start Changes';
  elements.submitChangesBtn.style.display = 'none';
  elements.submitChangesBtn.disabled = true;
  elements.submitChangesBtn.classList.remove('has-changes');

  // Update button states
  updateButtonState();
  updateSubmitButtonState();
}

/**
 * Reset the UI after successful submit
 */
export function resetAfterSubmit() {
  state.originalStructure = deepClone(state.folderStructure);
  state.changeLog = [];
  updateSubmitButtonState();
}
