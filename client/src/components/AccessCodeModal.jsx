import { useState } from 'react';

export default function AccessCodeModal({ teacher, accessCode, onClose }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = `Phone: ${teacher.phone}\nAccess code: ${accessCode}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context) - the code is still visible to copy manually.
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Access code for {teacher.fullName}</h3>
        <p className="hint">
          Share this phone number and code with the teacher — they'll use both to sign in.
          For security this code will not be shown again after you close this window.
        </p>
        <div className="access-code-row">
          <span className="info-label">Phone</span>
          <strong>{teacher.phone}</strong>
        </div>
        <div className="access-code-display">{accessCode}</div>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={copy}>
            {copied ? 'Copied!' : 'Copy phone + code'}
          </button>
          <button type="button" className="btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
