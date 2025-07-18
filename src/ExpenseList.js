import React, {useState, useEffect, useRef} from 'react';
import {db} from './firebase';
import {collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc} from 'firebase/firestore';
import {Timestamp} from 'firebase/firestore';

const ExpenseList = ({user}) => {
  const [expenses, setExpenses] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({amount: '', category: '', date: '', note: ''});
  const [message, setMessage] = useState('');
  const messageRef = useRef(null);

  useEffect(() => {
    if (!user) {
      setExpenses([]);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'expenses'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const expensesArr = [];
        querySnapshot.forEach(doc => {
          const data = doc.data();
          expensesArr.push({
            id: doc.id,
            ...data,
            // Convert Firestore Timestamp to ISO date string for input fields and display
            date: data.date && data.date.toDate ? data.date.toDate().toISOString().slice(0, 10) : ''
          });
        });
        setExpenses(expensesArr);
      },
      (error) => {
        console.error('Error fetching expenses:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'expenses', id));
      showMessage('Expense deleted successfully!');
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const startEditing = (expense) => {
    setEditId(expense.id);
    setEditData({
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      note: expense.note || ''
    });
  };

  const handleEditChange = (e) => {
    setEditData({...editData, [e.target.name]: e.target.value});
  };

  const saveEdit = async () => {
    try {
      // Convert date string back to Firestore Timestamp
      const updatedDate = editData.date ? Timestamp.fromDate(new Date(editData.date)) : null;

      await updateDoc(doc(db, 'users', user.uid, 'expenses', editId), {
        amount: parseFloat(editData.amount),
        category: editData.category,
        date: updatedDate,
        note: editData.note
      });
      setEditId(null);
      setEditData({amount: '', category: '', date: '', note: ''});
      showMessage('Expense updated successfully!');
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditData({amount: '', category: '', date: '', note: ''});
  };

  const showMessage = (msg) => {
    setMessage(msg);
    if (messageRef.current) clearTimeout(messageRef.current);
    messageRef.current = setTimeout(() => setMessage(''), 6000);
  };

  if (expenses.length === 0) return <p>No expenses found.</p>;

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-semibold mb-4">Your Expenses</h2>
      {message && <p className="text-green-600 mb-2 transition-opacity duration-500">{message}</p>}
      <ul>
        {expenses.map((expense) => (
          <li key={expense.id} className="border p-2 mb-2 rounded">
            {editId === expense.id ? (
              <>
                <input
                  type="number"
                  name="amount"
                  value={editData.amount}
                  onChange={handleEditChange}
                  className="border p-1 rounded w-full mb-1"
                />
                <input
                  type="text"
                  name="category"
                  value={editData.category}
                  onChange={handleEditChange}
                  className="border p-1 rounded w-full mb-1"
                />
                <input
                  type="date"
                  name="date"
                  value={editData.date}
                  onChange={handleEditChange}
                  className="border p-1 rounded w-full mb-1"
                />
                <input
                  type="text"
                  name="note"
                  value={editData.note}
                  onChange={handleEditChange}
                  className="border p-1 rounded w-full mb-1"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    className="bg-green-500 text-white p-1 rounded text-sm flex-1"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="bg-gray-500 text-white p-1 rounded text-sm flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div><strong>Amount:</strong> ₹{expense.amount}</div>
                <div><strong>Category:</strong> {expense.category}</div>
                <div><strong>Date:</strong> {expense.date}</div>
                {expense.note && <div><strong>Note:</strong> {expense.note}</div>}
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => startEditing(expense)}
                    className="bg-blue-500 text-white p-1 rounded text-sm flex-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="bg-red-500 text-white p-1 rounded text-sm flex-1"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ExpenseList;
