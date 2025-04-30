import React, { useState, useEffect, useRef } from 'react';
import { Search, Calendar, ChevronDown, Edit2, Trash2, Plus } from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface InventoryItem {
  id: string;
  item: string;
  quantity: number;
  price: number;
  paymentMode: string;
  notes: string;
  date: string;
}

// DIRECT DOM SOLUTION - No React rendering for dropdowns
// This bypasses all React rendering and CSS issues
document.addEventListener('DOMContentLoaded', () => {
  // Create style element for our custom CSS
  const style = document.createElement('style');
  style.textContent = `
    .fixed-dropdown {
      position: fixed !important;
      background: white !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 8px !important;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2) !important;
      padding: 8px 0 !important;
      min-width: 200px !important;
      max-width: 300px !important;
      z-index: 999999999 !important;
      transform: none !important;
      opacity: 1 !important;
      visibility: visible !important;
      display: block !important;
      pointer-events: auto !important;
    }
    
    .fixed-dropdown-option {
      display: block !important;
      width: 100% !important;
      text-align: left !important;
      padding: 8px 16px !important;
      background: none !important;
      border: none !important;
      cursor: pointer !important;
      font-size: 14px !important;
      color: #000 !important;
    }
    
    .fixed-dropdown-option:hover {
      background-color: #f5f5f5 !important;
    }
    
    .fixed-dropdown-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      background: transparent !important;
      z-index: 999999998 !important;
    }
  `;
  document.head.appendChild(style);
  
  // Create container for our dropdowns
  const dropdownContainer = document.createElement('div');
  dropdownContainer.id = 'fixed-dropdown-container';
  document.body.appendChild(dropdownContainer);
  
  // Global function to create dropdown
  window.createFixedDropdown = function(buttonId, options, position) {
    // Remove any existing dropdowns
    window.removeAllDropdowns();
    
    // Get button position
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    const rect = button.getBoundingClientRect();
    
    // Create overlay to catch clicks outside
    const overlay = document.createElement('div');
    overlay.className = 'fixed-dropdown-overlay';
    overlay.addEventListener('click', window.removeAllDropdowns);
    
    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'fixed-dropdown';
    dropdown.style.top = `${rect.bottom + window.scrollY}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    
    // Add options
    options.forEach(option => {
      const button = document.createElement('button');
      button.className = 'fixed-dropdown-option';
      button.textContent = option.text;
      if (option.selected) {
        button.style.backgroundColor = '#f5f5f5';
      }
      button.addEventListener('click', () => {
        if (option.onClick) option.onClick();
        window.removeAllDropdowns();
      });
      dropdown.appendChild(button);
    });
    
    // Add to container
    dropdownContainer.appendChild(overlay);
    dropdownContainer.appendChild(dropdown);
  };
  
  // Global function to remove dropdowns
  window.removeAllDropdowns = function() {
    const container = document.getElementById('fixed-dropdown-container');
    if (container) {
      container.innerHTML = '';
    }
  };
});

const InventoryExpenses = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [removeSales, setRemoveSales] = useState(false);
  const [sortOrder, setSortOrder] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('All Payment Modes');
  
  // Special IDs for our dropdown buttons
  const PRICE_BUTTON_ID = 'sort-by-price-button';
  const PAYMENT_BUTTON_ID = 'payment-mode-button';
  
  // Set up event listeners
  useEffect(() => {
    // Cleanup function
    return () => {
      if (window.removeAllDropdowns) {
        window.removeAllDropdowns();
      }
    };
  }, []);
  
  const handleSortChange = (order) => {
    setSortOrder(order);
    if (window.removeAllDropdowns) {
      window.removeAllDropdowns();
    }
  };
  
  const handlePaymentModeChange = (mode) => {
    setSelectedPaymentMode(mode);
    if (window.removeAllDropdowns) {
      window.removeAllDropdowns();
    }
  };
  
  const showPriceDropdown = () => {
    if (!window.createFixedDropdown) return;
    
    window.createFixedDropdown(PRICE_BUTTON_ID, [
      { 
        text: 'Low to High',
        selected: sortOrder === 'low-to-high',
        onClick: () => handleSortChange('low-to-high')
      },
      { 
        text: 'High to Low',
        selected: sortOrder === 'high-to-low',
        onClick: () => handleSortChange('high-to-low')
      }
    ]);
  };
  
  const showPaymentModeDropdown = () => {
    if (!window.createFixedDropdown) return;
    
    const options = [
      {
        text: 'All Payment Modes',
        selected: selectedPaymentMode === 'All Payment Modes',
        onClick: () => handlePaymentModeChange('All Payment Modes')
      },
      ...paymentMethods.map(method => ({
        text: method.name,
        selected: selectedPaymentMode === method.name,
        onClick: () => handlePaymentModeChange(method.name)
      }))
    ];
    
    window.createFixedDropdown(PAYMENT_BUTTON_ID, options);
  };

  const paymentMethods: PaymentMethod[] = [
    { id: 'paytm', name: 'Paytm', icon: '💳', color: 'bg-gray-100' },
    { id: 'bh', name: 'B.H Account', icon: '💳', color: 'bg-pink-50' },
    { id: 'ch', name: 'C.H Account', icon: '💳', color: 'bg-pink-50' },
    { id: 'rs', name: 'RS Account', icon: '💳', color: 'bg-red-50' },
    { id: 'rh', name: 'RH Account', icon: '💳', color: 'bg-green-50' },
    { id: 'ms', name: 'MS Account', icon: '💳', color: 'bg-orange-50' },
    { id: 'ss', name: 'SS Account', icon: '💳', color: 'bg-orange-50' },
    { id: 'cash', name: 'Cash', icon: '💵', color: 'bg-blue-50' },
  ];

  const inventoryItems: InventoryItem[] = [
    {
      id: '1',
      item: 'Salary Payment - RAJESH PUNJABI',
      quantity: 1,
      price: 500.00,
      paymentMode: 'Cash',
      notes: 'Salary payment for PACKAGING & SERVICE',
      date: '28/4/2025'
    },
    {
      id: '2',
      item: 'Vegetables Stock',
      quantity: 15,
      price: 2500.00,
      paymentMode: 'Cash',
      notes: 'Weekly vegetable supply',
      date: '28/4/2025'
    },
    {
      id: '3',
      item: 'Kitchen Equipment',
      quantity: 2,
      price: 15000.00,
      paymentMode: 'Paytm',
      notes: 'New cooking range',
      date: '27/4/2025'
    },
    {
      id: '4',
      item: 'Cleaning Supplies',
      quantity: 10,
      price: 750.00,
      paymentMode: 'Cash',
      notes: 'Monthly cleaning supplies',
      date: '27/4/2025'
    },
    {
      id: '5',
      item: 'Spices and Seasonings',
      quantity: 8,
      price: 1200.00,
      paymentMode: 'Cash',
      notes: 'Bulk purchase of spices',
      date: '26/4/2025'
    }
  ];

  // Sort items if needed
  const sortedInventoryItems = React.useMemo(() => {
    if (!sortOrder) return inventoryItems;
    
    return [...inventoryItems].sort((a, b) => {
      if (sortOrder === 'low-to-high') {
        return a.price - b.price;
      } else if (sortOrder === 'high-to-low') {
        return b.price - a.price;
      }
      return 0;
    });
  }, [inventoryItems, sortOrder]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Inventory Purchases</h1>
        <button className="bg-black text-white px-4 py-2 rounded-full flex items-center gap-2">
          <Plus size={20} />
          Record Purchase
        </button>
      </div>

      {/* Payment Methods */}
      <div className="flex flex-wrap gap-3 mb-6">
        {paymentMethods.map((method) => (
          <button
            key={method.id}
            className={`${method.color} px-4 py-2 rounded-full flex items-center gap-2 hover:opacity-80 transition-opacity`}
          >
            <span>{method.icon}</span>
            <span>{method.name}</span>
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search inventory items..."
            className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700">
            Reset Filters
          </button>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="date"
                className="pl-4 pr-10 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Calendar className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            </div>
            <span>to</span>
            <div className="relative">
              <input
                type="date"
                className="pl-4 pr-10 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <Calendar className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>

          <button 
            id={PAYMENT_BUTTON_ID}
            className="px-4 py-2 rounded-full border border-gray-200 flex items-center gap-2"
            onClick={showPaymentModeDropdown}
          >
            {selectedPaymentMode}
            <ChevronDown size={16} />
          </button>

          <button 
            id={PRICE_BUTTON_ID}
            className="px-4 py-2 rounded-full border border-gray-200 flex items-center gap-2"
            onClick={showPriceDropdown}
          >
            Sort by Price
            <ChevronDown size={16} />
          </button>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={removeSales}
              onChange={(e) => setRemoveSales(e.target.checked)}
              className="rounded border-gray-300 text-black focus:ring-black"
            />
            Remove Sales
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 bg-white rounded-[32px] overflow-hidden border border-gray-100">
        <table className="w-full">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-600">Item</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-600">Quantity</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-600">Price</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-600">Payment Mode</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-600">Notes</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-600">Date</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedInventoryItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4">{item.item}</td>
                <td className="px-6 py-4">{item.quantity}</td>
                <td className="px-6 py-4">₹{item.price.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50">
                    💵 {item.paymentMode}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{item.notes}</td>
                <td className="px-6 py-4">{item.date}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Edit2 size={16} />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
          <div className="flex justify-end items-center gap-8">
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Sales Total:</span>
              <span className="font-medium">₹0.00</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Expenses Total:</span>
              <span className="font-medium">₹10,175.00</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Difference:</span>
              <span className="font-medium text-red-500">-₹10,175.00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add global type definitions
declare global {
  interface Window {
    createFixedDropdown: (buttonId: string, options: any[], position?: any) => void;
    removeAllDropdowns: () => void;
  }
}

export default InventoryExpenses; 