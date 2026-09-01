import React, { useEffect, useState } from 'react';
export {};
import { useNavigate } from 'react-router-dom';
import { loadOwnerItems, saveOwnerItems, OwnerItem, OwnerItemStatus } from '../owner/ownerStorage';

const AdminDashboard: React.FC = () => {
  const [pendingItems, setPendingItems] = useState<OwnerItem[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const items = loadOwnerItems();
    const pending = items.filter(item => item.status === 'Pending');
    setPendingItems(pending);
  }, []);

  const approveItem = (id: string) => {
    const items = loadOwnerItems();
    const updated: OwnerItem[] = items.map(item =>
      item.id === id ? { ...item, status: 'Active' as OwnerItemStatus } : item
    );
    saveOwnerItems(updated);
    setPendingItems(updated.filter(item => item.status === 'Pending'));
  };

  const viewItem = (id: string) => {
    navigate(`/admin/item/${id}`);
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Pending Approvals</h1>
      {pendingItems.length === 0 ? (
        <p className="text-gray-600">No pending items.</p>
      ) : (
        <div className="grid gap-4">
          {pendingItems.map(item => (
            <div key={item.id} className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-slate-900">
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="text-sm text-gray-600">{item.description}</p>
              <p className="mt-2 text-sm">Price: ETB {item.price.toLocaleString()}</p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => approveItem(item.id)}
                  className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => viewItem(item.id)}
                  className="px-4 py-2 bg-slate-200 text-slate-800 rounded hover:bg-slate-300"
                >
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
