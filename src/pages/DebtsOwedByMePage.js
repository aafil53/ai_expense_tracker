import React, {useState, useEffect, useRef} from 'react';
import {db} from '../firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';

const DebtsOwedByMePage = ({user}) => {
  const [debts, setDebts] = useState([]);
  const [formData, setFormData] = useState({amount: '', debtorName: '', dueDate: '', note: ''});
  const [editId, setEditId] = useState(null);
  const [message, setMessage] = useState('');
  const messageRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const debtsRef = collection(db, 'users', user.uid, 'debtsOwedByMe');
    const q = query(debtsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, snapshot => {
      const data = [];
      snapshot.forEach(doc => data.push({id: doc.id, ...doc.data()}));
      setDebts(data);
    }, error => console.error('Error fetching debts:', error));

    return () => unsubscribe();
  }, [user]);

  const showMessage = (msg) => {
    setMessage(msg);
    if (messageRef.current) clearTimeout(messageRef.current);
    messageRef.current = setTimeout(() => setMessage(''), 4000);
  };

  const handleInputChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleAddDebt = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'users', user.uid, 'debtsOwedByMe'), {
        amount: parseFloat(formData.amount),
        debtorName: formData.debtorName,
        dueDate: formData.dueDate,
        note: formData.note,
        status: 'Unpaid',
        createdAt: Timestamp.now()
      });
      setFormData({amount: '', debtorName: '', dueDate: '', note: ''});
      showMessage('Debt added successfully!');
    } catch (error) {
      console.error('Error adding debt:', error);
      showMessage('Error adding debt.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'debtsOwedByMe', id));
      showMessage('Debt deleted successfully!');
    } catch (error) {
      console.error('Error deleting debt:', error);
    }
  };

  const startEditing = (debt) => {
    setEditId(debt.id);
    setFormData({
      amount: debt.amount,
      debtorName: debt.debtorName,
      dueDate: debt.dueDate,
      note: debt.note || ''
    });
  };

  const saveEdit = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid, 'debtsOwedByMe', editId), {
        amount: parseFloat(formData.amount),
        debtorName: formData.debtorName,
        dueDate: formData.dueDate,
        note: formData.note
      });
      setEditId(null);
      setFormData({amount: '', debtorName: '', dueDate: '', note: ''});
      showMessage('Debt updated successfully!');
    } catch (error) {
      console.error('Error updating debt:', error);
      showMessage('Error updating debt.');
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setFormData({amount: '', debtorName: '', dueDate: '', note: ''});
  };

  const markAsPaid = async (id) => {
    try {
      await updateDoc(doc(db, 'users', user.uid, 'debtsOwedByMe', id), {
        status: 'Paid'
      });
      showMessage('Marked as Paid!');
    } catch (error) {
      console.error('Error marking as paid:', error);
      showMessage('Error marking as paid.');
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-semibold mb-4">Debts Owed By Me</h2>
      {message && <p className="text-green-600 mb-2">{message}</p>}

      <form onSubmit={editId ? (e) => { e.preventDefault(); saveEdit(); } : handleAddDebt} className="flex flex-col gap-2 mb-4">
        <input
          type="number"
          name="amount"
          placeholder="Amount"
          value={formData.amount}
          onChange={handleInputChange}
          required
          className="border p-2 rounded"
        />
        <input
          type="text"
          name="debtorName"
          placeholder="Debtor's Name"
          value={formData.debtorName}
          onChange={handleInputChange}
          required
          className="border p-2 rounded"
        />
        <input
          type="date"
          name="dueDate"
          value={formData.dueDate}
          onChange={handleInputChange}
          required
          className="border p-2 rounded"
        />
        <input
          type="text"
          name="note"
          placeholder="Note (optional)"
          value={formData.note}
          onChange={handleInputChange}
          className="border p-2 rounded"
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          {editId ? 'Save Changes' : 'Add Debt'}
        </button>
        {editId && (
          <button
            type="button"
            onClick={cancelEdit}
            className="bg-gray-500 text-white p-2 rounded mt-2"
          >
            Cancel
          </button>
        )}
      </form>

      <ul>
        {debts.length === 0 && <p>No debts recorded.</p>}
        {debts.map(debt => (
          <li key={debt.id} className="border p-3 mb-2 rounded">
            <div className="flex items-center gap-2 mb-2">
              <div><strong>Amount:</strong> ₹{debt.amount}</div>
              {debt.status === 'Paid' ? (
                <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold">✔️ Paid</span>
              ) : (
                <span className="ml-2 px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs font-semibold">Pending</span>
              )}
            </div>
            <div><strong>Debtor:</strong> {debt.debtorName}</div>
            <div><strong>Due Date:</strong> {debt.dueDate}</div>
            {debt.note && <div><strong>Note:</strong> {debt.note}</div>}
            <div className="flex gap-2 mt-1">
              {debt.status !== 'Paid' && (
                <button
                  onClick={() => markAsPaid(debt.id)}
                  className="bg-green-500 hover:bg-green-600 text-white p-1 rounded text-sm flex-1 flex items-center justify-center gap-1"
                >
                  <span role="img" aria-label="paid">✔️</span> Mark as Paid
                </button>
              )}
              <button
                onClick={() => startEditing(debt)}
                className="bg-blue-500 text-white p-1 rounded text-sm flex-1"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(debt.id)}
                className="bg-red-500 text-white p-1 rounded text-sm flex-1"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DebtsOwedByMePage;
