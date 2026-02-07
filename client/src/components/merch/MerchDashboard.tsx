import { useState } from 'react';
import ProductManager from './ProductManager';
import OrderList from './OrderList';
import MerchAnalytics from './MerchAnalytics';

type MerchTab = 'products' | 'orders' | 'analytics';

export default function MerchDashboard() {
  const [activeTab, setActiveTab] = useState<MerchTab>('products');

  const tabs = [
    { id: 'products' as MerchTab, label: 'Products' },
    { id: 'orders' as MerchTab, label: 'Orders' },
    { id: 'analytics' as MerchTab, label: 'Analytics' },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-[#660033] text-[#F7E6CA]'
                : 'bg-white/40 text-[rgba(102,0,51,0.6)] hover:bg-white/60 hover:text-[#660033]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'products' && <ProductManager />}
      {activeTab === 'orders' && <OrderList />}
      {activeTab === 'analytics' && <MerchAnalytics />}
    </div>
  );
}
