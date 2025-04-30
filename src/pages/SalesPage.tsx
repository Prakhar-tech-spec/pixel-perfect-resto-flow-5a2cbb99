import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

interface AccountSale {
  account: string;
  amount: string;
}

interface InventoryItem {
  id: string;
  item: string;
  quantity: number;
  price: number;
  paymentMode: string;
  notes: string;
  date: string;
  isSale?: boolean;
}

const accounts = [
  'Paytm',
  'B.H Account',
  'C.H Account',
  'RS Account',
  'RH Account',
  'MS Account',
  'SS Account',
  'Cash',
  'Cash Exchange'
];

const SalesPage = () => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [accountSales, setAccountSales] = useState<AccountSale[]>(
    accounts.map(account => ({ account, amount: '' }))
  );

  // Load saved sales data when date changes
  useEffect(() => {
    const savedSales = localStorage.getItem(`sales_${selectedDate}`);
    if (savedSales) {
      setAccountSales(JSON.parse(savedSales));
    } else {
      setAccountSales(accounts.map(account => ({ account, amount: '' })));
    }
  }, [selectedDate]);

  // Calculate total sales
  const totalSales = accountSales.reduce((sum, sale) => {
    const amount = parseFloat(sale.amount) || 0;
    return sum + amount;
  }, 0);

  // Handle amount change for an account
  const handleAmountChange = (account: string, amount: string) => {
    const newSales = accountSales.map(sale => 
      sale.account === account ? { ...sale, amount } : sale
    );
    setAccountSales(newSales);
    localStorage.setItem(`sales_${selectedDate}`, JSON.stringify(newSales));
  };

  // Handle update sales button click
  const handleUpdateSales = () => {
    // Save current state to localStorage
    localStorage.setItem(`sales_${selectedDate}`, JSON.stringify(accountSales));

    // Get existing inventory items
    const savedInventory = localStorage.getItem('inventoryItems') || '[]';
    let inventoryItems: InventoryItem[] = JSON.parse(savedInventory);

    // Add sales entries to inventory
    const salesEntries: InventoryItem[] = accountSales
      .filter(sale => parseFloat(sale.amount) > 0)
      .map(sale => ({
        id: `sale_${Date.now()}_${Math.random()}`,
        item: `Sales - ${sale.account}`,
        quantity: 1,
        price: parseFloat(sale.amount),
        paymentMode: sale.account,
        notes: `Sales entry for ${format(new Date(selectedDate), 'dd/MM/yyyy')}`,
        date: format(new Date(selectedDate), 'dd/MM/yyyy'),
        isSale: true
      }));

    // Add new sales to inventory items
    inventoryItems = [...salesEntries, ...inventoryItems];
    localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));

    // Clear account-wise sales input fields and remove from localStorage
    setAccountSales(accounts.map(account => ({ account, amount: '' })));
    localStorage.removeItem(`sales_${selectedDate}`);

    // Show success message
    alert('Sales updated successfully!');
  };

  // Get background color for account icon
  const getAccountIconBg = (account: string) => {
    switch (account) {
      case 'Paytm':
        return 'bg-gray-100';
      case 'B.H Account':
      case 'C.H Account':
      case 'RS Account':
        return 'bg-pink-50';
      case 'RH Account':
        return 'bg-green-50';
      case 'MS Account':
      case 'SS Account':
        return 'bg-orange-50';
      case 'Cash':
      case 'Cash Exchange':
        return 'bg-blue-50';
      default:
        return 'bg-gray-50';
    }
  };

  return (
    <PageLayout>
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        className="h-full"
      >
        <div className="p-8 max-w-[1600px] mx-auto">
          {/* Header with Update Sales Button */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Sales</h1>
            <button 
              onClick={handleUpdateSales}
              className="bg-black text-white px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-black/90 transition-colors text-sm"
            >
              <Plus size={16} />
              Update Sales
            </button>
          </div>

          {/* Total Sales Section */}
          <div className="bg-white rounded-[20px] p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Total Sales</h2>
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-gray-500">₹</span>
                <span className="text-3xl font-semibold text-gray-900">
                  {totalSales.toFixed(2)}
                </span>
                <span className="text-sm text-gray-500">(Auto-calculated)</span>
              </div>
              <div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>
            </div>
          </div>

          {/* Account-wise Sales Section */}
          <div className="bg-white rounded-[20px] p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Account-wise Sales</h2>
            <div className="space-y-4">
              {accountSales.map((sale) => (
                <div key={sale.account} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${getAccountIconBg(sale.account)}`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M3 7L12 13L21 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-gray-900">{sale.account}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">₹</span>
                    <input
                      type="number"
                      value={sale.amount}
                      onChange={(e) => handleAmountChange(sale.account, e.target.value)}
                      placeholder="Enter amount"
                      className="w-[150px] px-3 py-1.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </PageLayout>
  );
};

export default SalesPage;
