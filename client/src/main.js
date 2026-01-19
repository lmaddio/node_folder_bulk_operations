/**
 * Folder Bulk Operations - Main Entry Point
 */

import { elements } from './dom.js';
import { hideModal } from './modal.js';
import { updateButtonState, updateSubmitButtonState } from './ui.js';
import { handleFolderSelect, handleSubmit, handleSubmitChanges, handleReset } from './handlers.js';

/**
 * Initialize event listeners
 */
function initEventListeners() {
  // Folder selection
  elements.selectFolderBtn.addEventListener('click', () => {
    elements.folderInput.click();
  });

  elements.folderInput.addEventListener('change', handleFolderSelect);

  // Path input
  elements.absolutePathInput.addEventListener('input', updateButtonState);

  // Action buttons
  elements.startChangesBtn.addEventListener('click', handleSubmit);
  elements.submitChangesBtn.addEventListener('click', handleSubmitChanges);
  elements.resetBtn.addEventListener('click', handleReset);

  // Modal
  elements.modalCloseBtn.addEventListener('click', hideModal);

  elements.modalOverlay.addEventListener('click', (event) => {
    if (event.target === elements.modalOverlay && elements.modalCloseBtn.style.display !== 'none') {
      hideModal();
    }
  });

  // Keyboard support
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && elements.modalOverlay.style.display !== 'none') {
      if (elements.modalCloseBtn.style.display !== 'none') {
        hideModal();
      }
    }
  });
}

/**
 * Initialize application
 */
function init() {
  initEventListeners();
  updateButtonState();
  updateSubmitButtonState();
  console.log('Folder Bulk Operations initialized');
}

// Start the application
init();
