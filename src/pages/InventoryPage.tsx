import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Calendar, ChevronDown, Edit2, Trash2, Plus } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import Modal from '@/components/Modal';
import { storage } from '@/utils/storage';
import type { InventoryItem as StorageInventoryItem } from '@/utils/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface PaymentMethod {
  name: string;
  color: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: string;
  price: number;
  paymentMode: string;
  notes?: string;
  date: string;
  isSale?: boolean;
}

interface FormItem {
  name: string;
  quantity: string;
  price: string;
  paymentMode: string;
  notes?: string;
  date: string;
}

type SortOrder = 'none' | 'asc' | 'desc';

const styles = `
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

const InventoryPage = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [removeSales, setRemoveSales] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [lastUsedDate, setLastUsedDate] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('');
  const [priceSort, setPriceSort] = useState<SortOrder>('none');
  const [showPaymentModeDropdown, setShowPaymentModeDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [newItem, setNewItem] = useState<FormItem>({
    name: '',
    quantity: '',
    price: '',
    paymentMode: 'Cash',
    notes: '',
    date: ''
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const [sortDropdownPos, setSortDropdownPos] = useState<{top: number, left: number} | null>(null);
  const paymentButtonRef = useRef<HTMLButtonElement>(null);
  const [paymentDropdownPos, setPaymentDropdownPos] = useState<{top: number, left: number} | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const paymentMethods: PaymentMethod[] = [
    { name: 'Paytm', color: 'bg-[#f8f9fa]' },
    { name: 'B.H Account', color: 'bg-pink-50' },
    { name: 'C.H Account', color: 'bg-pink-50' },
    { name: 'RS Account', color: 'bg-red-50' },
    { name: 'RH Account', color: 'bg-green-50' },
    { name: 'MS Account', color: 'bg-orange-50' },
    { name: 'SS Account', color: 'bg-orange-50' },
    { name: 'Cash', color: 'bg-blue-50' },
    { name: 'Cash Exchange', color: 'bg-purple-50' }
  ];

  // Load inventory items from localStorage
  useEffect(() => {
    const savedItems = localStorage.getItem('inventoryItems');
    if (savedItems) {
      try {
        setInventoryItems(JSON.parse(savedItems));
      } catch (error) {
        console.error('Error parsing saved inventory:', error);
      }
    }
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    if (inventoryItems.length > 0) {
      localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
    } else {
      // Clear localStorage when no items remain
      localStorage.removeItem('inventoryItems');
    }
  }, [inventoryItems]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let filtered = [...inventoryItems];

    // Remove sales if filter is active
    if (removeSales) {
      filtered = filtered.filter(item => !item.isSale);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.notes?.toLowerCase().includes(query) ||
        item.paymentMode.toLowerCase().includes(query)
      );
    }

    // Date range filter
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.date.split('/').reverse().join('-'));
        return itemDate >= start && itemDate <= end;
      });
    }

    // Payment mode filter
    if (selectedPaymentMode) {
      filtered = filtered.filter(item => 
        item.paymentMode === selectedPaymentMode
      );
    }

    // Price sorting
    if (priceSort !== 'none') {
      filtered.sort((a, b) => {
        if (priceSort === 'asc') {
          return a.price - b.price;
        } else {
          return b.price - a.price;
        }
      });
    }

    return filtered;
  }, [inventoryItems, searchQuery, startDate, endDate, selectedPaymentMode, priceSort, removeSales]);

  // Calculate totals from filtered items
  const expensesTotal = filteredItems.filter(item => !item.isSale).reduce((total, item) => total + item.price, 0);
  const salesTotal = filteredItems.filter(item => item.isSale).reduce((total, item) => total + item.price, 0);
  const difference = salesTotal - expensesTotal;

  const resetFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setSelectedPaymentMode('');
    setPriceSort('none');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewItem(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setNewItem({
      ...item,
      quantity: item.quantity.toString(),
      price: item.price.toString()
    });
    setIsModalOpen(true);
  };

  // Function to sync inventory items to IndexedDB
  const syncToIndexedDB = async (items: InventoryItem[]) => {
    try {
      // Transform items to match IndexedDB structure
      const transformedItems = items.map(item => ({
        id: Number(item.id) || Date.now(),
        name: item.name,
        quantity: typeof item.quantity === 'string' ? Number(item.quantity) || 0 : item.quantity,
        price: item.price,
        paymentMode: item.paymentMode,
        notes: item.notes || '',
        date: item.date,
        timestamp: new Date().toISOString() // Add timestamp for chart display
      }));
      
      // Save to IndexedDB
      await storage.setItem('inventory_items', transformedItems);
      console.log('Synced inventory to IndexedDB');
    } catch (error) {
      console.error('Error syncing to IndexedDB:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let updatedItems: InventoryItem[] = [];
    
    if (editingItem) {
      // Update existing item
      updatedItems = inventoryItems.map(item => 
        item.id === editingItem.id 
          ? {
              ...item,
              name: newItem.name || '',
              quantity: newItem.quantity || '0',
              price: Number(newItem.price) || 0,
              paymentMode: newItem.paymentMode || 'Cash',
              notes: newItem.notes || '',
              date: newItem.date || lastUsedDate || new Date().toLocaleDateString('en-IN')
            }
          : item
      );
      setInventoryItems(updatedItems);
    } else {
      // Add new item
      const itemDate = newItem.date || lastUsedDate || new Date().toLocaleDateString('en-IN');
      const item: InventoryItem = {
        id: Date.now().toString(),
        name: newItem.name || '',
        quantity: newItem.quantity || '0',
        price: Number(newItem.price) || 0,
        paymentMode: newItem.paymentMode || 'Cash',
        notes: newItem.notes || '',
        date: itemDate
      };
      updatedItems = [...inventoryItems, item];
      setInventoryItems(updatedItems);
    }

    // Sync with IndexedDB
    syncToIndexedDB(updatedItems);
    
    // Save last used date
    setLastUsedDate(newItem.date);
    
    // Reset form and close modal
    setNewItem({
      name: '',
      quantity: '',
      price: '',
      paymentMode: 'Cash',
      notes: '',
      date: ''
    });
    setEditingItem(null);
    setIsModalOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setNewItem({
      name: '',
      quantity: '',
      price: '',
      paymentMode: 'Cash',
      notes: '',
      date: lastUsedDate
    });
  };

  const handleDelete = (itemId: string) => {
    setDeleteItemId(itemId);
    setIsDeleteConfirmOpen(true);
  };

  useEffect(() => {
    if (showSortDropdown && sortButtonRef.current) {
      const rect = sortButtonRef.current.getBoundingClientRect();
      setSortDropdownPos({
        top: rect.bottom + window.scrollY + 8, // 8px margin
        left: rect.left + window.scrollX
      });
    }
  }, [showSortDropdown]);

  useEffect(() => {
    if (showPaymentModeDropdown && paymentButtonRef.current) {
      const rect = paymentButtonRef.current.getBoundingClientRect();
      setPaymentDropdownPos({
        top: rect.bottom + window.scrollY + 8, // 8px margin
        left: rect.left + window.scrollX
      });
    }
  }, [showPaymentModeDropdown]);

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
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Inventory Expenses</h1>
            <button 
              onClick={() => {
                setEditingItem(null);
                setNewItem({
                  name: '',
                  quantity: '',
                  price: '',
                  paymentMode: 'Cash',
                  notes: '',
                  date: lastUsedDate
                });
                setIsModalOpen(true);
              }}
              className="bg-black text-white px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-black/90 transition-colors text-sm"
            >
              <Plus size={16} />
              Record Purchase
            </button>
          </div>

          {/* Modal */}
          <Modal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            title={editingItem ? 'Edit Purchase' : 'Record Purchase'}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Item</label>
                  <input
                    type="text"
                    name="name"
                    value={newItem.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Quantity</label>
                  <input
                    type="text"
                    name="quantity"
                    value={newItem.quantity}
                    onChange={handleInputChange}
                    placeholder="e.g. 5, 2kg, 500g, 1 dozen"
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Price</label>
                  <input
                    type="number"
                    name="price"
                    value={newItem.price}
                    onChange={handleInputChange}
                    placeholder="Enter price"
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Payment Mode</label>
                  <select
                    name="paymentMode"
                    value={newItem.paymentMode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                  >
                    {paymentMethods.map(method => (
                      <option key={method.name} value={method.name}>{method.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={newItem.date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Notes</label>
                  <input
                    type="text"
                    name="notes"
                    value={newItem.notes}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-black text-white hover:bg-black/90 text-sm"
                >
                  Save
                </button>
              </div>
            </form>
          </Modal>

          {/* Payment Methods */}
          <div className="flex flex-wrap gap-2 mb-8">
            {paymentMethods.map((method) => (
              <button
                key={method.name}
                onClick={() => setSelectedPaymentMode(method.name)}
                className={`${method.color} px-3 py-2 rounded-full hover:opacity-80 transition-opacity text-gray-700 text-sm`}
              >
                <span className="font-medium">{method.name}</span>
              </button>
            ))}
          </div>

          {/* Search and Filters */}
          <div className="space-y-4 mb-8 overflow-visible">
            {/* Search Bar and Reset Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search inventory items..."
                  className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-gray-700"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button 
                onClick={resetFilters}
                className="px-4 py-3 rounded-full border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors whitespace-nowrap"
              >
                Reset Filters
              </button>
            </div>

            {/* Filters Row */}
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto hide-scrollbar -mx-8 px-8">
              {/* Date Range */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="relative">
                  <input
                    type="date"
                    className="pl-3 pr-8 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-gray-700 text-sm w-[140px]"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                </div>
                <span className="text-gray-500 text-sm">to</span>
                <div className="relative">
                  <input
                    type="date"
                    className="pl-3 pr-8 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-gray-700 text-sm w-[140px]"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                </div>
              </div>

              {/* Payment Mode Filter */}
              <div className="relative flex-shrink-0" ref={dropdownRef}>
                <button 
                  ref={paymentButtonRef}
                  className="min-w-[160px] px-4 py-2 rounded-full border border-gray-200 flex items-center justify-between text-gray-700 hover:bg-gray-50 text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPaymentModeDropdown(!showPaymentModeDropdown);
                    setShowSortDropdown(false);
                  }}
                >
                  <span className="truncate">{selectedPaymentMode || 'All Payment Modes'}</span>
                  <ChevronDown size={14} className="flex-shrink-0 ml-2" />
                </button>
                {showPaymentModeDropdown && paymentDropdownPos && createPortal(
                  <AnimatePresence>
                    <motion.div
                      key="payment-dropdown"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.18, ease: 'easeInOut' }}
                      className="w-[160px] bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-[9999]"
                      style={{
                        position: 'absolute',
                        top: paymentDropdownPos.top,
                        left: paymentDropdownPos.left,
                      }}
                    >
                      <button
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPaymentMode('');
                          setShowPaymentModeDropdown(false);
                        }}
                      >
                        All Payment Modes
                      </button>
                      <div className="h-px bg-gray-100 my-1" />
                      {paymentMethods.map(method => (
                        <button
                          key={method.name}
                          className={`w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 ${method.color}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPaymentMode(method.name);
                            setShowPaymentModeDropdown(false);
                          }}
                        >
                          {method.name}
                        </button>
                      ))}
                    </motion.div>
                  </AnimatePresence>,
                  document.body
                )}
              </div>

              {/* Sort by Price */}
              <div className="relative flex-shrink-0">
                <button 
                  ref={sortButtonRef}
                  className="whitespace-nowrap px-4 py-2 rounded-full border border-gray-200 flex items-center justify-between text-gray-700 hover:bg-gray-50 text-sm"
                  onClick={() => {
                    setShowSortDropdown(!showSortDropdown);
                    setShowPaymentModeDropdown(false);
                  }}
                >
                  Sort by Price
                  <ChevronDown size={14} className="ml-2" />
                </button>
                {showSortDropdown && sortDropdownPos && createPortal(
                  <AnimatePresence>
                    <motion.div
                      key="sort-dropdown"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.18, ease: 'easeInOut' }}
                      className="w-40 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-[9999]"
                      style={{
                        position: 'absolute',
                        top: sortDropdownPos.top,
                        left: sortDropdownPos.left,
                      }}
                    >
                      <button
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setPriceSort('none');
                          setShowSortDropdown(false);
                        }}
                      >
                        Default
                      </button>
                      <button
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setPriceSort('asc');
                          setShowSortDropdown(false);
                        }}
                      >
                        Low to High
                      </button>
                      <button
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setPriceSort('desc');
                          setShowSortDropdown(false);
                        }}
                      >
                        High to Low
                      </button>
                    </motion.div>
                  </AnimatePresence>,
                  document.body
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={removeSales}
                  onChange={(e) => setRemoveSales(e.target.checked)}
                  className="rounded border-gray-300 text-black focus:ring-black w-4 h-4"
                />
                <span className="text-gray-700 text-sm whitespace-nowrap">Remove Sales</span>
              </label>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-[32px] overflow-hidden border border-gray-200 shadow-sm flex flex-col relative">
            {/* Table Header */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-200 w-full">
              <div className="min-w-full">
                <div className="grid grid-cols-7 md:grid-cols-7 gap-2 px-6 py-3 bg-gray-50/50">
                  <div className="text-xs font-medium text-gray-500 col-span-2 md:col-span-1">ITEM</div>
                  <div className="hidden md:block text-xs font-medium text-gray-500">QUANTITY</div>
                  <div className="text-xs font-medium text-gray-500">PRICE</div>
                  <div className="hidden md:block text-xs font-medium text-gray-500">PAYMENT MODE</div>
                  <div className="hidden md:block text-xs font-medium text-gray-500">NOTES</div>
                  <div className="text-xs font-medium text-gray-500">DATE</div>
                  <div className="text-xs font-medium text-gray-500">ACTIONS</div>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(100vh-400px)] w-full">
              <div className="min-w-full">
                {filteredItems.map((item) => (
                  <div 
                    key={item.id} 
                    className={`grid grid-cols-7 md:grid-cols-7 gap-2 px-6 py-3 hover:bg-gray-50/50 border-b border-gray-100 items-center ${
                      item.isSale ? 'bg-gray-100' : ''
                    }`}
                  >
                    <div className="col-span-2 md:col-span-1 text-sm text-gray-900" title={item.name}>
                      {item.isSale ? 'Sales' : item.name}
                    </div>
                    <div className="hidden md:block text-sm text-gray-600 truncate" title={item.quantity}>
                      {item.quantity}
                    </div>
                    <div className="text-sm text-gray-900">₹{item.price.toFixed(2)}</div>
                    <div className="hidden md:block">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${paymentMethods.find(m => m.name === item.paymentMode)?.color || 'bg-gray-50'}`}>
                        {item.paymentMode}
                      </span>
                    </div>
                    <div className="hidden md:block text-sm text-gray-500 truncate" title={item.notes}>
                      {item.notes || '-'}
                    </div>
                    <div className="text-sm text-gray-600">{item.date}</div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleEdit(item)}
                        className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-colors duration-200"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sticky Totals Footer */}
            <div className="px-6 py-3 bg-white border-t border-gray-200 sticky bottom-0 left-0 right-0 z-20">
              <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-3 md:gap-6">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">Sales Total:</span>
                  <span className="text-sm font-medium text-gray-900">₹{salesTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">Expenses Total:</span>
                  <span className="text-sm font-medium text-gray-900">₹{expensesTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">Difference:</span>
                  <span className={`text-sm font-medium ${difference < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {difference < 0 ? '-' : ''}₹{Math.abs(difference).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          <Modal
            isOpen={isDeleteConfirmOpen}
            onClose={() => { setIsDeleteConfirmOpen(false); setDeleteItemId(null); }}
            title="Delete Inventory Item"
          >
            <div className="space-y-4">
              <p>Are you sure you want to delete this inventory item? This action cannot be undone.</p>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setIsDeleteConfirmOpen(false); setDeleteItemId(null); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-red-600 text-white rounded-full text-sm hover:bg-red-700 transition-colors"
                  onClick={() => {
                    if (deleteItemId) {
                      const updatedItems = inventoryItems.filter(item => item.id !== deleteItemId);
                      setInventoryItems(updatedItems);
                      syncToIndexedDB(updatedItems);
                      if (updatedItems.length === 0) {
                        localStorage.removeItem('inventoryItems');
                      }
                    }
                    setIsDeleteConfirmOpen(false);
                    setDeleteItemId(null);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </Modal>
        </div>
      </motion.div>
    </PageLayout>
  );
};

export default InventoryPage;
