import React, { useEffect, useState } from 'react';
import { useCredits, CreditHistory, CreditPurchase } from '@/lib/credits';
import { format } from 'date-fns';

export const CreditHistory: React.FC = () => {
  const { getCreditHistory, getCreditPurchases, isLoading, error } = useCredits();
  const [history, setHistory] = useState<CreditHistory[]>([]);
  const [purchases, setPurchases] = useState<CreditPurchase[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'purchases'>('history');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [historyData, purchasesData] = await Promise.all([
      getCreditHistory(),
      getCreditPurchases()
    ]);
    setHistory(historyData);
    setPurchases(purchasesData);
  };

  const renderHistoryItem = (item: CreditHistory) => (
    <div key={item.id} className="border-b py-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-semibold capitalize">{item.credit_type.replace('_', ' ')}</div>
          <div className="text-sm text-gray-600">{item.description}</div>
        </div>
        <div className="text-right">
          <div className={`font-bold ${item.action === 'use' ? 'text-red-500' : 'text-green-500'}`}>
            {item.action === 'use' ? '-' : '+'}{item.amount}
          </div>
          <div className="text-sm text-gray-500">
            {format(new Date(item.created_at), 'MMM d, yyyy')}
          </div>
        </div>
      </div>
      {item.expires_at && (
        <div className="text-sm text-gray-500 mt-1">
          Expires: {format(new Date(item.expires_at), 'MMM d, yyyy')}
        </div>
      )}
    </div>
  );

  const renderPurchaseItem = (item: CreditPurchase) => (
    <div key={item.id} className="border-b py-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-semibold capitalize">{item.credit_type.replace('_', ' ')}</div>
          <div className="text-sm text-gray-600">{item.amount} credits</div>
        </div>
        <div className="text-right">
          <div className="font-bold">${item.price}</div>
          <div className="text-sm text-gray-500">
            {format(new Date(item.created_at), 'MMM d, yyyy')}
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center mt-2">
        <div className={`text-sm ${
          item.status === 'completed' ? 'text-green-500' :
          item.status === 'failed' ? 'text-red-500' :
          item.status === 'refunded' ? 'text-yellow-500' :
          'text-gray-500'
        }`}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </div>
        {item.expires_at && (
          <div className="text-sm text-gray-500">
            Expires: {format(new Date(item.expires_at), 'MMM d, yyyy')}
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded ${
            activeTab === 'history'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Credit History
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 rounded ${
            activeTab === 'purchases'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Purchase History
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        {activeTab === 'history' ? (
          history.length > 0 ? (
            history.map(renderHistoryItem)
          ) : (
            <div className="p-4 text-center text-gray-500">No credit history found</div>
          )
        ) : (
          purchases.length > 0 ? (
            purchases.map(renderPurchaseItem)
          ) : (
            <div className="p-4 text-center text-gray-500">No purchase history found</div>
          )
        )}
      </div>
    </div>
  );
}; 