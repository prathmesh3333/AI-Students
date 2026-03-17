import React from 'react';
import './ConfirmModal.css';

const ConfirmModal = ({ message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' }) => {
  return (
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className={`confirm-modal-icon confirm-modal-${type}`}>
          {type === 'warning' && <i className="bi bi-exclamation-triangle-fill"></i>}
          {type === 'danger' && <i className="bi bi-x-circle-fill"></i>}
          {type === 'info' && <i className="bi bi-info-circle-fill"></i>}
        </div>
        <div className="confirm-modal-body">
          <h5 className="confirm-modal-title">Confirmation</h5>
          <p className="confirm-modal-message">{message}</p>
        </div>
        <div className="confirm-modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
