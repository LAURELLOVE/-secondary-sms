import { useState } from 'react';
import { formatFCFA } from '../currency';

export default function PaymentForm({ balance, onSave, onCancel }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    const n = Number(amount);
    if (!n || n <= 0) return setError('Enter a valid amount');
    if (n > balance) return setError(`Cannot exceed balance of ${formatFCFA(balance)}`);
    onSave({ amount: n, method });
  }

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <h3>Record payment</h3>
        <p>Outstanding balance: {formatFCFA(balance)}</p>
        <label>
          Payment amount (FCFA)
          <input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        {error && <p className="error-text">{error}</p>}
        <label>
          Payment method
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>Cash</option>
            <option>Bank Transfer</option>
            <option>Mobile Money</option>
            <option>Card</option>
          </select>
        </label>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary">Record payment</button>
        </div>
      </form>
    </div>
  );
}
