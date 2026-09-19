import { formatFCFA } from '../currency';

export default function Receipt({ student, fee, payment, onClose }) {
  return (
    <div className="modal-backdrop print-backdrop">
      <div className="modal">
        <div className="print-area receipt">
          <div className="report-header">
            <h2>Secondary School Management System</h2>
            <p>Payment Receipt</p>
          </div>
          <div className="receipt-number">{payment.receiptNumber}</div>
          <div className="info-row"><span className="info-label">Date</span><span>{new Date(payment.date).toLocaleString()}</span></div>
          <div className="info-row"><span className="info-label">Received from</span><span>{student.fullName}</span></div>
          <div className="info-row"><span className="info-label">Admission No</span><span>{student.admissionNumber}</span></div>
          <div className="info-row">
            <span className="info-label">Class</span>
            <span>{student.className}{student.section}{student.branch ? ` (${student.branch})` : ''}</span>
          </div>
          <div className="info-row"><span className="info-label">For</span><span>{fee.academicYear} • {fee.term}</span></div>
          <div className="info-row"><span className="info-label">Method</span><span>{payment.method}</span></div>
          <div className="receipt-amount">{formatFCFA(payment.amount)}</div>
          <div className="info-row"><span className="info-label">Fee for term</span><span>{formatFCFA(fee.amountDue)}</span></div>
          <div className="info-row"><span className="info-label">Paid to date</span><span>{formatFCFA(fee.amountPaid)}</span></div>
          <div className="info-row"><span className="info-label">Balance</span><span>{formatFCFA(fee.balance)}</span></div>
          <div className="report-signatures"><span>Received by (signature)</span></div>
        </div>
        <div className="modal-actions no-print">
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
          <button type="button" className="btn-primary" onClick={() => window.print()}>Print</button>
        </div>
      </div>
    </div>
  );
}
