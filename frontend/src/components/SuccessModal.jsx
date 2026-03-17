import React from "react";
import "./SuccessModal.css";

const SuccessModal = ({ show, onClose, message, title }) => {
  if (!show) return null;

  return (
    <div className="success-modal-overlay" onClick={onClose}>
      <div className="success-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="success-icon-wrapper">
          <svg className="success-svg" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle className="success-svg-circle" cx="55" cy="55" r="50" stroke="#10b981" strokeWidth="3" strokeLinecap="round"/>
            <polyline className="success-svg-check" points="32,57 47,72 78,40" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h2 className="success-title">{title || "Success!"}</h2>
        <p className="success-message">{message || "Operation completed successfully"}</p>

        <button className="success-btn" onClick={onClose}>
          Continue
        </button>
      </div>
    </div>
  );
};

export default SuccessModal;
