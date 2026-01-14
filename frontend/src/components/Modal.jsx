import React from 'react';

function Modal({ status, response, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {status === 'loading' && 'Validating...'}
            {status === 'success' && 'Validation Complete'}
            {status === 'error' && 'Validation Failed'}
          </h2>
          {status !== 'loading' && (
            <button className="modal-close" onClick={onClose}>
              ×
            </button>
          )}
        </div>

        <div className="modal-content">
          {status === 'loading' && (
            <>
              <div className="spinner"></div>
              <p className="loading-text">
                Validating folder contents with the server...
              </p>
            </>
          )}

          {status === 'success' && response && (
            <>
              <div className="success-icon">✅</div>
              <p className="success-message">{response.message}</p>
              <p className="validated-count">
                Total items validated: {response.totalItems}
              </p>
            </>
          )}

          {status === 'error' && response && (
            <>
              <div className="error-icon">❌</div>
              <p className="error-message">{response.error}</p>
              {response.details && Array.isArray(response.details) && response.details.length > 0 && (
                <div className="error-details">
                  <h4>Error Details:</h4>
                  <ul>
                    {response.details.map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Modal;
