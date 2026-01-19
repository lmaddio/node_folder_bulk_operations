/**
 * Modal Management
 */

import { elements } from './dom.js';
import { escapeHtml } from './utils.js';

/**
 * Show modal with content
 * @param {string} content - HTML content for modal
 * @param {boolean} showClose - Show close button
 */
export function showModal(content, showClose = false) {
  elements.modalContent.innerHTML = content;
  elements.modalCloseBtn.style.display = showClose ? 'block' : 'none';
  elements.modalOverlay.style.display = 'flex';
}

/**
 * Hide modal
 */
export function hideModal() {
  elements.modalOverlay.style.display = 'none';
}

/**
 * Show loading modal
 * @param {string} message - Loading message
 */
export function showLoading(message = 'Processing...') {
  showModal(`
    <div class="spinner"></div>
    <h3>${message}</h3>
    <p>Please wait while we validate your folder structure...</p>
  `, false);
}

/**
 * Show success modal
 * @param {string} message - Success message
 * @param {boolean} showEditHint - Whether to show edit hint
 */
export function showSuccess(message, showEditHint = false) {
  let editHintHtml = '';
  if (showEditHint) {
    editHintHtml = `
      <div class="edit-hint">
        <h4>🎉 You can now edit the folder structure!</h4>
        <ul>
          <li><strong>Drag & Drop:</strong> Move files and folders by dragging them</li>
          <li><strong>Rename:</strong> Click the ✏️ button or double-click the name</li>
          <li><strong>Delete:</strong> Click the 🗑️ button to remove items</li>
          <li><strong>Submit:</strong> Click "Submit Changes" when you're done</li>
        </ul>
      </div>
    `;
  }
  
  showModal(`
    <div class="status status-success">
      <div class="status-icon">✅</div>
      <h3>Success!</h3>
      <p>${escapeHtml(message)}</p>
      ${editHintHtml}
    </div>
  `, true);
}

/**
 * Show error modal
 * @param {string} error - Error message
 * @param {Array} details - Error details
 */
export function showError(error, details = []) {
  let detailsHtml = '';
  if (details && details.length > 0) {
    detailsHtml = `
      <div class="error-details">
        <strong>Details:</strong>
        <ul>
          ${details.slice(0, 10).map(d => `<li>${escapeHtml(d.message)}</li>`).join('')}
          ${details.length > 10 ? `<li>...and ${details.length - 10} more differences</li>` : ''}
        </ul>
      </div>
    `;
  }

  showModal(`
    <div class="status status-error">
      <div class="status-icon">❌</div>
      <h3>Validation Failed</h3>
      <p>${escapeHtml(error)}</p>
      ${detailsHtml}
    </div>
  `, true);
}
