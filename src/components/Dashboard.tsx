import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';
import { useDatabase } from '@/lib/db';
import { storage } from '@/utils/storage';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryItem as StorageInventoryItem } from '@/utils/storage';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';
import { groupAndOrderInventoryItems } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Helper function to format time
const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Helper function to generate empty chart data
const generateEmptyChartData = () => {
  const data = [];
  for (let i = 0; i < 24; i += 2) {
    const hour = i.toString().padStart(2, '0');
    data.push({
      time: `${hour}:00`,
      value: 0
    });
  }
  return data;
};

interface TimeFilterProps {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
}

const TimeFilter: React.FC<TimeFilterProps> = ({ activeFilter, setActiveFilter }) => {
  const filters = ['Today', 'This Week', 'This Month'];

  return (
    <div className="bg-white rounded-full p-1 inline-flex">
      {filters.map((filter) => (
        <button
          key={filter}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
            activeFilter === filter 
              ? 'bg-black text-white' 
              : 'text-neutral-800 hover:bg-neutral-50'
          }`}
          onClick={() => setActiveFilter(filter)}
        >
          {filter}
        </button>
      ))}
    </div>
  );
};

interface TabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
  const tabs = ['Inventory Expenses', 'Total Sales'];

  return (
    <div className="bg-white rounded-full p-1 inline-flex">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
            activeTab === tab 
              ? 'bg-black text-white' 
              : 'text-neutral-800 hover:bg-neutral-50'
          }`}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

// Add a function to filter expenses based on the active time filter
const filterExpensesByTimeRange = (expenses: StorageInventoryItem[], timeFilter: string) => {
  if (!expenses || !expenses.length) return [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  return expenses.filter(item => {
    if (!item.date) return false;
    
    let itemDate;
    if (item.date.includes('/')) {
      const [day, month, year] = item.date.split('/').map(Number);
      itemDate = new Date(year, month - 1, day);
    } else {
      itemDate = new Date(item.date);
    }
    
    itemDate.setHours(0, 0, 0, 0);
    
    switch (timeFilter) {
      case 'Today':
        return itemDate.getTime() === today.getTime();
      case 'This Week':
        return itemDate >= startOfWeek;
      case 'This Month':
        return itemDate >= startOfMonth;
      default:
        return true;
    }
  });
};

// Add function to process sales data into time-based chart data
const processSalesData = (salesItems: StorageInventoryItem[]) => {
  console.log("Processing sales data for chart:", salesItems.length, salesItems);
  const timeBasedData = generateEmptyChartData();
  
  if (!salesItems || salesItems.length === 0) {
    console.log("No sales items to process");
    return timeBasedData;
  }
  
  salesItems.forEach(item => {
    if (item.date) {
      let itemTime;
      if (item.timestamp) {
        itemTime = new Date(item.timestamp);
      } else {
        itemTime = new Date(item.date.includes('/') ? 
          item.date.split('/').reverse().join('-') : 
          item.date);
        
        itemTime.setHours(new Date().getHours());
        itemTime.setMinutes(0);
      }
      
      const timeKey = formatTime(itemTime);
      console.log(`Processing sales item: ${item.name}, date: ${item.date}, time key: ${timeKey}, price: ${item.price}`);
      
      const slot = timeBasedData.find(d => d.time === timeKey) ||
                  timeBasedData.find(d => {
                    const [slotHour] = d.time.split(':').map(Number);
                    const itemHour = itemTime.getHours();
                    return Math.abs(slotHour - itemHour) <= 1;
                  });
                  
      if (slot) {
        slot.value += item.price;
        console.log(`Added ${item.price} to slot ${slot.time}, new total: ${slot.value}`);
      }
    }
  });
  
  console.log("Final chart data:", timeBasedData);
  return timeBasedData;
};

// Update the interfaces to handle both types of IDs
interface BaseItem {
  id: string | number;
  name: string;
  item?: string;  // Add optional item field
  quantity: number;
  price: number;
  paymentMode: string;
  notes?: string;
  date: string;
  isSale?: boolean;
  timestamp?: string;
}

interface SalesItem extends BaseItem {
  id: string;
}

interface DashboardInventoryItem extends BaseItem {
  id: number;
}

// Add a function to convert SalesItem to StorageInventoryItem
const convertToInventoryItem = (item: SalesItem): StorageInventoryItem => {
  return {
    id: typeof item.id === 'string' ? parseInt(item.id, 10) || Date.now() : item.id,
    name: item.name || item.item || 'Sales',  // Ensure name is always present
    quantity: Number(item.quantity) || 1,
    price: Number(item.price) || 0,
    paymentMode: item.paymentMode || 'Cash',
    notes: item.notes || '',
    date: item.date,
    timestamp: item.timestamp || new Date().toISOString(),
    isSale: true
  };
};

// Improve isSalesItem helper for better sales detection
const isSalesItem = (item: any): boolean => {
  if (!item) return false;
  
  // Check if the item has an explicit isSale flag
  if (item.isSale === true) {
    return true;
  }
  
  // Check the name field
  if (item.name && typeof item.name === 'string' && 
     item.name.toLowerCase().includes('sale')) {
    return true;
  }
  
  // Check the item field
  if (item.item && typeof item.item === 'string' && 
     item.item.toLowerCase().includes('sale')) {
    return true;
  }
  
  return false;
};

const Dashboard: React.FC = () => {
  const { stats, isLoading } = useDatabase();
  const [activeFilter, setActiveFilter] = useState('Today');
  const [activeTab, setActiveTab] = useState('Inventory Expenses');
  const [chartData, setChartData] = useState(generateEmptyChartData());
  const [dashboardData, setDashboardData] = useState<{
    inventoryItems: StorageInventoryItem[];
    staffMembers: any[];
    attendanceRecords: any[];
    salesRecords: any[];
    notes: any[];
  }>({
    inventoryItems: [],
    staffMembers: [],
    attendanceRecords: [],
    salesRecords: [],
    notes: []
  });

  const [totalExpenses, setTotalExpenses] = useState(0);
  const [filteredExpenses, setFilteredExpenses] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [filteredSales, setFilteredSales] = useState(0);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  // Update the loadSalesDataDirectly function
  const loadSalesDataDirectly = useCallback(async () => {
    try {
      console.log("Attempting to load sales data directly from localStorage");
      const localInventoryItems = localStorage.getItem('inventoryItems');
      
      if (!localInventoryItems) {
        console.log("No inventory items found in localStorage");
        setTotalSales(0);
        setFilteredSales(0);
        setChartData(generateEmptyChartData());
        return [];
      }
      
      let parsedItems: SalesItem[];
      try {
        parsedItems = JSON.parse(localInventoryItems);
        if (!Array.isArray(parsedItems)) {
          throw new Error("Invalid data format");
        }
      } catch (e) {
        console.error("Error parsing sales data:", e);
        setTotalSales(0);
        setFilteredSales(0);
        setChartData(generateEmptyChartData());
        return [];
      }
      
      // Find sales items
      const salesItems = parsedItems.filter(isSalesItem);
      console.log("Found sales items:", salesItems.length, salesItems);
      
      if (salesItems.length > 0) {
        // Convert sales items to inventory items
        const inventoryItems = salesItems.map(convertToInventoryItem);
        
        // Calculate total sales
        const totalSalesAmount = inventoryItems.reduce((sum, item) => {
          const price = Number(item.price) || 0;
          console.log(`Adding price ${price} from item ${item.name}`);
          return sum + price;
        }, 0);
        
        console.log("Total sales amount:", totalSalesAmount);
        setTotalSales(totalSalesAmount);
        
        // Filter sales by time range
        const timeFilteredSales = filterExpensesByTimeRange(inventoryItems, activeFilter);
        console.log("Time filtered sales:", timeFilteredSales);
        
        // Calculate filtered total
        const filteredSalesTotal = timeFilteredSales.reduce((sum, item) => {
          return sum + (Number(item.price) || 0);
        }, 0);
        
        console.log("Filtered sales total:", filteredSalesTotal);
        setFilteredSales(filteredSalesTotal);
        
        // Update chart data
        const processedChartData = processSalesData(timeFilteredSales);
        setChartData(processedChartData);
        
        // Update dashboard data
        setDashboardData(prev => ({
          ...prev,
          inventoryItems: inventoryItems
        }));
        
        return inventoryItems;
      }
      
      console.log("No sales items found");
      setTotalSales(0);
      setFilteredSales(0);
      setChartData(generateEmptyChartData());
      return [];
      
    } catch (error) {
      console.error("Error loading sales data:", error);
      setTotalSales(0);
      setFilteredSales(0);
      setChartData(generateEmptyChartData());
      return [];
    }
  }, [activeFilter]);

  // Add loadInventoryData function
  const loadInventoryData = useCallback(async () => {
    try {
      console.log("Loading inventory data");
      const localInventoryItems = localStorage.getItem('inventoryItems');
      
      if (!localInventoryItems) {
        console.log("No inventory items found");
        setTotalExpenses(0);
        setFilteredExpenses(0);
        setChartData(generateEmptyChartData());
        return [];
      }
      
      let parsedItems: (StorageInventoryItem & { item?: string })[];
      try {
        parsedItems = JSON.parse(localInventoryItems);
        if (!Array.isArray(parsedItems)) {
          throw new Error("Invalid data format");
        }
      } catch (e) {
        console.error("Error parsing inventory data:", e);
        setTotalExpenses(0);
        setFilteredExpenses(0);
        setChartData(generateEmptyChartData());
        return [];
      }
      
      // Filter out sales items to get only expenses
      const expenseItems = parsedItems.filter(item => !isSalesItem(item));
      console.log("Found expense items:", expenseItems.length);
      
      if (expenseItems.length > 0) {
        // Calculate total expenses
        const totalExpensesAmount = expenseItems.reduce((sum, item) => {
          const price = Number(item.price) || 0;
          return sum + price;
        }, 0);
        
        console.log("Total expenses amount:", totalExpensesAmount);
        setTotalExpenses(totalExpensesAmount);
        
        // Filter expenses by time range
        const timeFilteredExpenses = filterExpensesByTimeRange(expenseItems, activeFilter);
        console.log("Time filtered expenses:", timeFilteredExpenses);
        
        // Calculate filtered total
        const filteredExpensesTotal = timeFilteredExpenses.reduce((sum, item) => {
          return sum + (Number(item.price) || 0);
        }, 0);
        
        console.log("Filtered expenses total:", filteredExpensesTotal);
        setFilteredExpenses(filteredExpensesTotal);
        
        // Update chart data
        const processedChartData = processInventoryData(timeFilteredExpenses);
        setChartData(processedChartData);
        
        // Update dashboard data
        setDashboardData(prev => ({
          ...prev,
          inventoryItems: expenseItems
        }));
        
        return expenseItems;
      }
      
      console.log("No expense items found");
      setTotalExpenses(0);
      setFilteredExpenses(0);
      setChartData(generateEmptyChartData());
      return [];
      
    } catch (error) {
      console.error("Error loading inventory data:", error);
      setTotalExpenses(0);
      setFilteredExpenses(0);
      setChartData(generateEmptyChartData());
      return [];
    }
  }, [activeFilter]);

  // Update the useEffect for activeTab changes
  useEffect(() => {
    console.log("Active tab changed to:", activeTab);
    if (activeTab === 'Total Sales') {
      loadSalesDataDirectly();
    } else if (activeTab === 'Inventory Expenses') {
      loadInventoryData();
    }
  }, [activeTab, loadSalesDataDirectly, loadInventoryData]);

  // Update the useEffect for time filter changes
  useEffect(() => {
    console.log("Time filter changed to:", activeFilter);
    if (activeTab === 'Total Sales') {
      loadSalesDataDirectly();
    } else if (activeTab === 'Inventory Expenses') {
      loadInventoryData();
    }
  }, [activeFilter, activeTab, loadSalesDataDirectly, loadInventoryData]);

  // Add an effect to load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (activeTab === 'Total Sales') {
        await loadSalesDataDirectly();
      } else if (activeTab === 'Inventory Expenses') {
        await loadInventoryData();
      }
    };
    loadInitialData();
  }, [activeTab, loadSalesDataDirectly, loadInventoryData]);

  // Helper function to process inventory data into time-based data points
  const processInventoryData = (inventoryItems) => {
    const timeBasedData = generateEmptyChartData();
    
    // Filter out sales items before processing
    const expenseItems = inventoryItems.filter(item => !item.isSale);
    
    expenseItems.forEach(item => {
      // Use date property if timestamp is not available
      if (item.date) {
        let itemTime;
        // Check if timestamp exists, otherwise convert date to timestamp
        if (item.timestamp) {
          itemTime = new Date(item.timestamp);
        } else {
          // Convert date string to a Date object
          // Assuming date is in format DD/MM/YYYY or YYYY-MM-DD
          itemTime = new Date(item.date.includes('/') ? 
            item.date.split('/').reverse().join('-') : 
            item.date);
          
          // Set a default time if only the date is available
          itemTime.setHours(new Date().getHours());
          itemTime.setMinutes(0);
        }
        
        const timeKey = formatTime(itemTime);
        
        // Find the closest time slot
        const slot = timeBasedData.find(d => d.time === timeKey) ||
                    timeBasedData.find(d => {
                      const [slotHour] = d.time.split(':').map(Number);
                      const itemHour = itemTime.getHours();
                      return Math.abs(slotHour - itemHour) <= 1;
                    });
                    
        if (slot) {
          // Just add the price directly without multiplying by quantity
          slot.value += item.price;
        }
      }
    });
    
    return timeBasedData;
  };

  // Update syncLocalStorageToIndexedDB to handle null values and validate data
  const syncLocalStorageToIndexedDB = async () => {
    try {
      console.log("Starting sync from localStorage to IndexedDB");
      const localInventoryItems = localStorage.getItem('inventoryItems');
      
      if (!localInventoryItems) {
        console.log("No items in localStorage to sync");
        return;
      }

      let parsedItems: (StorageInventoryItem & { item?: string })[];  // Add optional item field to parsed items
      try {
        parsedItems = JSON.parse(localInventoryItems);
        if (!Array.isArray(parsedItems)) {
          throw new Error("Invalid data format in localStorage");
        }
      } catch (e) {
        console.error("Error parsing localStorage data:", e);
        return;
      }

      console.log("Loaded items from localStorage:", parsedItems.length);
      
      // Transform and normalize all items
      const transformedItems = parsedItems.map(item => ({
        id: typeof item.id === 'string' ? parseInt(item.id, 10) || Date.now() : item.id,
        name: item.name || item.item || 'Unknown',  // Use item field as fallback
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        paymentMode: item.paymentMode || 'Cash',
        notes: item.notes || '',
        date: item.date,
        timestamp: item.timestamp || new Date().toISOString(),
        isSale: Boolean(item.isSale || 
                (item.name && item.name.toLowerCase().includes('sale')) || 
                (item.item && item.item.toLowerCase().includes('sale')))
      }));
      
      // Count and log sales items for debugging
      const salesItems = transformedItems.filter(item => item.isSale);
      console.log("Found sales items:", salesItems.length, salesItems);
      
      // Calculate the total expenses
      const expenseItems = transformedItems.filter(item => !item.isSale);
      const total = expenseItems.reduce((sum, item) => sum + Number(item.price), 0);
      setTotalExpenses(total);
      
      // Calculate filtered expenses based on active filter
      const timeFilteredExpenses = filterExpensesByTimeRange(expenseItems, activeFilter);
      const filteredTotal = timeFilteredExpenses.reduce((sum, item) => sum + Number(item.price), 0);
      setFilteredExpenses(filteredTotal);
      
      // Calculate sales data
      const totalSalesAmount = salesItems.reduce((sum, item) => sum + Number(item.price), 0);
      console.log("Total sales amount:", totalSalesAmount);
      setTotalSales(totalSalesAmount);
      
      // Calculate filtered sales based on active filter
      const timeFilteredSales = filterExpensesByTimeRange(salesItems, activeFilter);
      const filteredSalesTotal = timeFilteredSales.reduce((sum, item) => sum + Number(item.price), 0);
      console.log("Filtered sales total:", filteredSalesTotal);
      setFilteredSales(filteredSalesTotal);
      
      // Update chart data if in sales view
      if (activeTab === 'Total Sales') {
        const processedChartData = processSalesData(timeFilteredSales);
        setChartData(processedChartData);
      }
      
      // Store in IndexedDB
      if (transformedItems.length > 0) {
        console.log("Storing items in IndexedDB:", transformedItems);
        await storage.setItem('inventory_items', transformedItems);
        console.log('Successfully synced localStorage to IndexedDB');
      }
    } catch (error) {
      console.error('Error syncing localStorage to IndexedDB:', error);
    }
  };

  // Add a memoized version of syncLocalStorageToIndexedDB that depends on activeFilter
  const memoizedSyncFunction = useCallback(syncLocalStorageToIndexedDB, [activeFilter, activeTab]);
  
  // Update the useEffect for activeTab changes
  useEffect(() => {
    console.log("Active tab changed to:", activeTab);
    if (activeTab === 'Total Sales') {
      loadSalesDataDirectly();
    }
  }, [activeTab, loadSalesDataDirectly]);

  // Update the useEffect for time filter changes
  useEffect(() => {
    console.log("Time filter changed to:", activeFilter);
    if (activeTab === 'Total Sales') {
      loadSalesDataDirectly();
    }
  }, [activeFilter, activeTab, loadSalesDataDirectly]);

  // Add an effect to load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (activeTab === 'Total Sales') {
        await loadSalesDataDirectly();
      }
    };
    loadInitialData();
  }, []);

  // Add loadStaffData function to fetch staff data
  const loadStaffData = useCallback(async () => {
    try {
      console.log("Loading staff management data");

      // Get staff members data
      const localStaffMembers = localStorage.getItem('staffMembers');
      let staffMembers = [];

      if (localStaffMembers) {
        try {
          staffMembers = JSON.parse(localStaffMembers);
          console.log("Loaded staff members:", staffMembers.length);
        } catch (e) {
          console.error("Error parsing staff data:", e);
          staffMembers = [];
        }
      }

      // Get attendance records
      const localAttendance = localStorage.getItem('attendanceRecords');
      let attendanceRecords = [];

      if (localAttendance) {
        try {
          attendanceRecords = JSON.parse(localAttendance);
          console.log("Loaded attendance records:", attendanceRecords.length);
        } catch (e) {
          console.error("Error parsing attendance records:", e);
          attendanceRecords = [];
        }
      }

      // Calculate staff statistics
      const totalStaff = staffMembers.length;
      
      // Calculate total salary paid
      const totalSalaryPaid = staffMembers.reduce((sum, staff) => {
        // For now, we'll consider the total salary as paid since we're displaying it that way
        return sum + Number(staff.salary);
      }, 0);
      
      // Calculate total salary due (which should be 0 for now)
      const totalSalaryDue = 0;
      
      console.log("Staff stats:", { totalStaff, totalSalaryPaid, totalSalaryDue });
      
      // Update dashboard data with staff info
      setDashboardData(prev => ({
        ...prev,
        staffMembers: staffMembers,
        attendanceRecords: attendanceRecords
      }));
      
      // Update state variables for real-time display
      setCurrentStats(prevStats => ({
        ...prevStats,
        totalStaff,
        totalSalaryPaid,
        totalSalaryDue
      }));
      
      return { staffMembers, attendanceRecords };
    } catch (error) {
      console.error("Error loading staff data:", error);
      return { staffMembers: [], attendanceRecords: [] };
    }
  }, []);

  // Add state for current stats
  const [currentStats, setCurrentStats] = useState({
    totalExpenses: 0,
    inventoryItems: 0,
    inventorySalesDifference: 0,
    uniqueItems: 0,
    totalStaff: 0,
    totalSalaryPaid: 0,
    totalSalaryDue: 0,
    // Attendance stats
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    leaveToday: 0,
    // Notes stats
    totalNotes: 0,
    tasks: 0,
    issues: 0,
    reminders: 0
  });

  // Update the useEffect to load staff data when component mounts
  useEffect(() => {
    const initialLoad = async () => {
      await loadStaffData();
    };
    
    initialLoad();
    
    // Set up interval to refresh staff data
    const staffInterval = setInterval(loadStaffData, 5000);
    
    return () => {
      clearInterval(staffInterval);
    };
  }, [loadStaffData]);

  // Add storage event listener for staff data
  useEffect(() => {
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === 'staffMembers' || event.key === 'attendanceRecords') {
        loadStaffData();
      }
    };
    
    window.addEventListener('storage', handleStorageEvent);
    
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [loadStaffData]);

  // Update the calculateInventoryDifference function to match the required calculation
  const calculateInventoryDifference = useCallback(() => {
    try {
      console.log("Calculating inventory difference");
      const localInventoryItems = localStorage.getItem('inventoryItems');
      
      if (!localInventoryItems) {
        console.log("No inventory items found for difference calculation");
        return 0;
      }
      
      let inventoryItems;
      try {
        inventoryItems = JSON.parse(localInventoryItems);
        if (!Array.isArray(inventoryItems)) {
          throw new Error("Invalid inventory data format");
        }
      } catch (e) {
        console.error("Error parsing inventory data for difference calculation:", e);
        return 0;
      }
      
      // Apply time filter if needed
      let filteredItems = [...inventoryItems];
      if (activeFilter !== 'All Time') {
        filteredItems = filterExpensesByTimeRange(filteredItems, activeFilter);
      }
      
      // Calculate totals from filtered items
      const expensesTotal = filteredItems.filter(item => !item.isSale).reduce((total, item) => total + Number(item.price), 0);
      const salesTotal = filteredItems.filter(item => item.isSale).reduce((total, item) => total + Number(item.price), 0);
      
      // Calculate difference as expenses minus sales
      // A positive value means expenses > sales (loss)
      // A negative value means sales > expenses (profit)
      const difference = expensesTotal - salesTotal;
      
      console.log("Financial calculation:", {
        expensesTotal,
        salesTotal,
        difference,
        activeFilter
      });
      
      return difference;
    } catch (error) {
      console.error("Error calculating inventory difference:", error);
      return 0;
    }
  }, [activeFilter]);

  // Also fix the other useEffect that might be updating the difference
  useEffect(() => {
    // Apply the time filter to both expenses and sales
    const timeFilteredExpenses = filterExpensesByTimeRange(
      dashboardData.inventoryItems.filter(item => !item.isSale),
      activeFilter
    );
    
    const timeFilteredSales = filterExpensesByTimeRange(
      dashboardData.inventoryItems.filter(item => item.isSale),
      activeFilter
    );
    
    // Update only the tab-dependent values, NOT the difference calculation
    setCurrentStats(prev => ({
      ...prev,
      totalExpenses: timeFilteredExpenses.reduce((sum, item) => sum + Number(item.price), 0),
      inventoryItems: timeFilteredExpenses.length,
      totalStaff: (dashboardData.staffMembers || []).length,
      totalSalaryPaid: (dashboardData.staffMembers || []).reduce((sum, staff) => sum + Number(staff.salary), 0),
      totalSalaryDue: 0,
      uniqueItems: new Set(timeFilteredExpenses.map(item => item.name)).size,
    }));
  }, [dashboardData, activeFilter, activeTab]);

  // Modify the calculateInventoryDifference interval to run less frequently
  useEffect(() => {
    const handleInventoryChange = (event: StorageEvent) => {
      if (event.key === 'inventoryItems') {
        console.log("Inventory items changed in localStorage, updating difference");
        const difference = calculateInventoryDifference();
        
        setCurrentStats(prev => ({
          ...prev,
          inventorySalesDifference: difference
        }));
      }
    };
    
    window.addEventListener('storage', handleInventoryChange);
    
    // Calculate once initially
    const difference = calculateInventoryDifference();
    setCurrentStats(prev => ({
      ...prev,
      inventorySalesDifference: difference
    }));
    
    // Set up an interval with a longer delay (5 seconds instead of 2)
    const intervalId = setInterval(() => {
      const difference = calculateInventoryDifference();
      
      setCurrentStats(prev => ({
        ...prev,
        inventorySalesDifference: difference
      }));
    }, 5000); // Increase to 5 seconds to reduce updates
    
    return () => {
      window.removeEventListener('storage', handleInventoryChange);
      clearInterval(intervalId);
    };
  }, [calculateInventoryDifference]);

  // Add function to load attendance data
  const loadAttendanceData = useCallback(async () => {
    try {
      console.log("Loading attendance data");
      const localAttendance = localStorage.getItem('attendanceRecords');
      
      if (!localAttendance) {
        console.log("No attendance records found");
        return;
      }
      
      let attendanceRecords;
      try {
        attendanceRecords = JSON.parse(localAttendance);
        if (!Array.isArray(attendanceRecords)) {
          throw new Error("Invalid attendance data format");
        }
      } catch (e) {
        console.error("Error parsing attendance data:", e);
        return;
      }
      
      // Get today's date in the format used by attendance records (YYYY-MM-DD)
      const today = new Date().toISOString().split('T')[0];
      
      // Filter records for today
      const todayRecords = attendanceRecords.filter(record => record.date === today);
      
      // Count by status
      const presentToday = todayRecords.filter(record => record.status === 'Present').length;
      const absentToday = todayRecords.filter(record => record.status === 'Absent').length;
      const lateToday = todayRecords.filter(record => record.status === 'Late').length;
      const leaveToday = todayRecords.filter(record => record.status === 'Leave').length;
      
      console.log("Today's attendance:", { presentToday, absentToday, lateToday, leaveToday });
      
      // Update dashboard data
      setDashboardData(prev => ({
        ...prev,
        attendanceRecords
      }));
      
      // Update current stats
      setCurrentStats(prev => ({
        ...prev,
        presentToday,
        absentToday,
        lateToday,
        leaveToday
      }));
      
    } catch (error) {
      console.error("Error loading attendance data:", error);
    }
  }, []);

  // Add function to load notes data
  const loadNotesData = useCallback(async () => {
    try {
      console.log("Loading notes data");
      const localNotes = localStorage.getItem('notes');
      
      if (!localNotes) {
        console.log("No notes found");
        return;
      }
      
      let notes;
      try {
        notes = JSON.parse(localNotes);
        if (!Array.isArray(notes)) {
          throw new Error("Invalid notes data format");
        }
      } catch (e) {
        console.error("Error parsing notes data:", e);
        return;
      }
      
      // Count total notes
      const totalNotes = notes.length;
      
      // Count by category
      const tasks = notes.filter(note => note.category === 'Task').length;
      const issues = notes.filter(note => note.category === 'Issue').length;
      const reminders = notes.filter(note => note.category === 'Reminder').length;
      
      console.log("Notes summary:", { totalNotes, tasks, issues, reminders });
      
      // Update dashboard data
      setDashboardData(prev => ({
        ...prev,
        notes
      }));
      
      // Update current stats
      setCurrentStats(prev => ({
        ...prev,
        totalNotes,
        tasks,
        issues,
        reminders
      }));
      
    } catch (error) {
      console.error("Error loading notes data:", error);
    }
  }, []);

  // Add useEffect to load attendance and notes data when component mounts
  useEffect(() => {
    loadAttendanceData();
    loadNotesData();
    
    // Set up interval to refresh attendance and notes data
    const intervalId = setInterval(() => {
      loadAttendanceData();
      loadNotesData();
    }, 5000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [loadAttendanceData, loadNotesData]);

  // Add event listeners for storage changes
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'attendanceRecords') {
        loadAttendanceData();
      } else if (event.key === 'notes') {
        loadNotesData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadAttendanceData, loadNotesData]);
  
  // Helper to normalize a date string to yyyy-mm-dd
  function normalizeToYMD(dateStr) {
    if (!dateStr) return '';
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/').map(Number);
      return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
    // Already yyyy-mm-dd or similar
    return dateStr.slice(0, 10);
  }

  // Helper to filter items by date range (inclusive)
  function filterItemsByDateRange(items, start, end) {
    if (!start && !end) return items;
    const startYMD = start ? normalizeToYMD(start) : null;
    const endYMD = end ? normalizeToYMD(end) : null;
    return items.filter(item => {
      const itemYMD = normalizeToYMD(item.date);
      if (startYMD && itemYMD < startYMD) return false;
      if (endYMD && itemYMD > endYMD) return false;
      // If start and end are the same, only include that date
      if (startYMD && endYMD && startYMD === endYMD) {
        return itemYMD === startYMD;
      }
      return true;
    });
  }

  // Modified export handler to accept date range
  const handleExportPDFWithRange = async (rangeMode: 'range' | 'full') => {
    setExportDialogOpen(false);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 20;
    pdf.setFillColor('#22223b');
    pdf.rect(0, 0, pageWidth, 18, 'F');
    pdf.setTextColor('#fff');
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RD', pageWidth / 2, 12, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setTextColor('#fff');
    pdf.text(`Downloaded: ${new Date().toLocaleString()}`, pageWidth - 12, 16, { align: 'right' });
    y = 24;
    const rightAlign = (val) => ({ content: val, styles: { halign: 'right' } });
    // Inventory Section
    pdf.setTextColor('#22223b');
    pdf.setFontSize(16);
    pdf.text('Inventory', pageWidth / 2, y, { align: 'center' });
    y += 8;
    const rawInventoryItems = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
    let inventoryItems = groupAndOrderInventoryItems(rawInventoryItems);
    let filename = `RD_Report_Full_${new Date().toISOString().slice(0,10)}.pdf`;
    if (rangeMode === 'range' && (exportStartDate || exportEndDate)) {
      inventoryItems = groupAndOrderInventoryItems(filterItemsByDateRange(rawInventoryItems, exportStartDate, exportEndDate));
      if (exportStartDate && exportEndDate && exportStartDate === exportEndDate) {
        filename = `RD_Report_${exportStartDate}.pdf`;
      } else {
        filename = `RD_Report_${exportStartDate || 'start'}_to_${exportEndDate || 'end'}_${new Date().toISOString().slice(0,10)}.pdf`;
      }
    }
    let tableResult = autoTable(pdf, {
      startY: y,
      head: [[
        { content: 'Item', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Quantity', styles: { halign: 'right', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Price', styles: { halign: 'right', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Payment Mode', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Notes', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Date', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Type', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
      ]],
      body: inventoryItems.length > 0 ? inventoryItems.map(item => [
        item.name,
        rightAlign(item.quantity),
        rightAlign(`₹${Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`),
        item.paymentMode,
        item.notes || '-',
        item.date,
        item.isSale ? 'Sale' : 'Expense'
      ]) : [[{ content: 'No inventory items found', colSpan: 7, styles: { halign: 'center', fontStyle: 'italic', textColor: [150,150,150] } }]],
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 3, overflow: 'linebreak', valign: 'middle' },
      headStyles: { fillColor: [34, 34, 59], textColor: 255, fontStyle: 'bold', fontSize: 11 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 10, right: 10 },
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.3,
      didDrawPage: (data) => {
        y = data.cursor.y;
      }
    }) as any;
    y = tableResult && tableResult.finalY ? tableResult.finalY + 10 : y + 12;
    // Inventory totals
    const expensesTotal = inventoryItems.filter(i => !i.isSale).reduce((t, i) => t + Number(i.price), 0);
    const salesTotal = inventoryItems.filter(i => i.isSale).reduce((t, i) => t + Number(i.price), 0);
    const difference = salesTotal - expensesTotal;
    pdf.setFontSize(12);
    pdf.setTextColor('#22223b');
    pdf.setFont('helvetica', 'bold');
    const marginLeft = 12;
    pdf.text(`Sales Total: ₹${salesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, marginLeft, y);
    y += 8;
    pdf.text(`Expenses Total: ₹${expensesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, marginLeft, y);
    y += 8;
    pdf.text(`Difference: ₹${difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, marginLeft, y);
    // --- New Page for Staff ---
    pdf.addPage();
    y = 20;
    pdf.setFontSize(16);
    pdf.setTextColor('#22223b');
    pdf.text('Staff & Salary', pageWidth / 2, y, { align: 'center' });
    y += 8;
    const staffMembers = JSON.parse(localStorage.getItem('staffMembers') || '[]');
    // Helper to get salary paid for a staff member
    const getSalaryPaid = staff => {
      return inventoryItems
        .filter(item => item.name === `Advance Salary Payment - ${staff.name}`)
        .reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    };
    tableResult = autoTable(pdf, {
      startY: y,
      head: [[
        { content: 'Name', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Role', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Salary', styles: { halign: 'right', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Payment Type', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Last Paid On', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Salary Paid', styles: { halign: 'right', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Salary Left', styles: { halign: 'right', fontStyle: 'bold', fontSize: 11 } },
      ]],
      body: staffMembers.map(staff => {
        const paid = getSalaryPaid(staff);
        const left = Number(staff.salary) - paid;
        return [
          staff.name,
          staff.role,
          rightAlign(`₹${Number(staff.salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`),
          staff.paymentType,
          staff.lastPaidOn,
          rightAlign(`₹${paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`),
          rightAlign(`₹${left.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
        ];
      }),
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 3, overflow: 'linebreak', valign: 'middle' },
      headStyles: { fillColor: [34, 34, 59], textColor: 255, fontStyle: 'bold', fontSize: 11 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 10, right: 10 },
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.3,
    }) as any;
    y = tableResult && tableResult.finalY ? tableResult.finalY + 10 : y + 12;
    // --- New Page for Attendance ---
    pdf.addPage();
    y = 20;
    pdf.setFontSize(16);
    pdf.setTextColor('#22223b');
    pdf.text('Attendance', pageWidth / 2, y, { align: 'center' });
    y += 8;
    const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
    tableResult = autoTable(pdf, {
      startY: y,
      head: [[
        { content: 'Staff Name', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Date', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Status', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Time', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Notes', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
      ]],
      body: attendanceRecords.map(record => [
        record.staffMember || record.staffName || '-',
        record.date,
        record.status,
        record.time,
        record.notes || '-'
      ]),
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 3, overflow: 'linebreak', valign: 'middle' },
      headStyles: { fillColor: [34, 34, 59], textColor: 255, fontStyle: 'bold', fontSize: 11 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 10, right: 10 },
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.3,
    }) as any;
    y = tableResult && tableResult.finalY ? tableResult.finalY + 10 : y + 12;
    // --- New Page for Sales ---
    pdf.addPage();
    y = 20;
    pdf.setFontSize(16);
    pdf.setTextColor('#22223b');
    pdf.text('Sales', pageWidth / 2, y, { align: 'center' });
    y += 8;
    const salesItems = inventoryItems.filter(i => i.isSale);
    tableResult = autoTable(pdf, {
      startY: y,
      head: [[
        { content: 'Item', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Quantity', styles: { halign: 'right', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Price', styles: { halign: 'right', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Payment Mode', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Notes', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Date', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
      ]],
      body: salesItems.map(item => [
        item.name,
        rightAlign(item.quantity),
        rightAlign(`₹${Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`),
        item.paymentMode,
        item.notes || '-',
        item.date
      ]),
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 3, overflow: 'linebreak', valign: 'middle' },
      headStyles: { fillColor: [34, 34, 59], textColor: 255, fontStyle: 'bold', fontSize: 11 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 10, right: 10 },
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.3,
    }) as any;
    y = tableResult && tableResult.finalY ? tableResult.finalY + 10 : y + 12;
    // --- New Page for Notes ---
    pdf.addPage();
    y = 20;
    pdf.setFontSize(16);
    pdf.setTextColor('#22223b');
    pdf.text('Notes', pageWidth / 2, y, { align: 'center' });
    y += 8;
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    tableResult = autoTable(pdf, {
      startY: y,
      head: [[
        { content: 'Title', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Content', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Category', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Priority', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Created At', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Updated At', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
        { content: 'Pinned', styles: { halign: 'left', fontStyle: 'bold', fontSize: 11 } },
      ]],
      body: notes.map(note => [
        note.title,
        note.content,
        note.category,
        note.priority,
        note.createdAt,
        note.updatedAt,
        note.isPinned ? 'Yes' : 'No'
      ]),
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 3, overflow: 'linebreak', valign: 'middle' },
      headStyles: { fillColor: [34, 34, 59], textColor: 255, fontStyle: 'bold', fontSize: 11 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 10, right: 10 },
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.3,
    }) as any;
    // Save the PDF
    pdf.save(filename);
  };
  
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-96" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-72" />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="stat-card col-span-1 md:col-span-2">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-10 w-48 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
          
          <div className="space-y-6">
            <div className="stat-card">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-10 w-24" />
            </div>
            
            <div className="stat-card">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-10 w-32" />
            </div>
            
            <div className="stat-card">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hi, here's what's happening in your store</h1>
        <div className="flex items-center gap-4">
          <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
        <TimeFilter activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
      </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          className="bg-white rounded-xl p-6 shadow-sm col-span-1 md:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h2 className="text-lg font-medium mb-2">
            {activeTab === 'Inventory Expenses' ? 'Inventory Overview' : 'Sales Overview'}
          </h2>
          
          <div className="space-y-1">
            <div className="text-sm text-neutral-600">
              {activeTab === 'Inventory Expenses' ? 'Total Money Spent' : 'Total Sales Revenue'}
            </div>
            <div className="text-3xl font-bold">
              {(() => {
                console.log("Rendering price:", activeTab === 'Inventory Expenses' ? filteredExpenses : filteredSales);
                return null;
              })()}
              ₹{activeTab === 'Inventory Expenses' ? filteredExpenses.toFixed(2) : filteredSales.toFixed(2)}
            </div>
          </div>
          
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#000" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#000" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#888' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#888' }} 
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip 
                  formatter={(value) => [`₹${value}`, 'Expenses']}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="none"
                  fill="url(#colorValue)"
                  fillOpacity={0.25}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease"
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#000000"
                  strokeWidth={2}
                  dot={{ r: 3, stroke: '#000', strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 7, fill: '#D1E62A', stroke: '#000', strokeWidth: 2 }}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        
        <div className="space-y-6">
          <motion.div 
            className="bg-white rounded-xl p-6 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="space-y-1">
              <div className="text-sm text-neutral-600">Total Items in Inventory</div>
              <div className="text-3xl font-bold">{currentStats.inventoryItems}</div>
            </div>
          </motion.div>
          
          <motion.div 
            className="bg-white rounded-xl p-6 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <div className="space-y-1">
              <div className="text-sm text-neutral-600">Expenses - Sales Difference</div>
              <div className="text-3xl font-bold flex items-center">
                ₹{Math.abs(currentStats.inventorySalesDifference).toFixed(2)}
                <span className={`ml-2 ${currentStats.inventorySalesDifference > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {currentStats.inventorySalesDifference > 0 ? '-' : '+'}
                </span>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="bg-white rounded-xl p-6 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <div className="space-y-1">
              <div className="text-sm text-neutral-600">Unique Items</div>
              <div className="text-3xl font-bold">{currentStats.uniqueItems}</div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <AlertDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button className="w-full flex items-center justify-center gap-2 py-6 bg-black hover:bg-neutral-800 text-white">
                  <Download className="h-5 w-5" />
                  Export Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Export Data to PDF</AlertDialogTitle>
                  <AlertDialogDescription>
                    Select a date range to export data for a specific period, or export all data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex flex-col gap-4 py-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="export-start-date">Start Date</Label>
                    <Input id="export-start-date" type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="export-end-date">End Date</Label>
                    <Input id="export-end-date" type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} />
                  </div>
                </div>
                <AlertDialogFooter>
                  <Button variant="destructive" onClick={() => handleExportPDFWithRange('full')}>Full Data</Button>
                  <Button onClick={() => handleExportPDFWithRange('range')} disabled={!exportStartDate && !exportEndDate}>Export</Button>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </motion.div>
        </div>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 1.0 }}
      >
        <h2 className="text-xl font-bold mb-4">Notes Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div 
            className="bg-white rounded-xl p-6 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.1 }}
          >
            <div className="space-y-1">
              <div className="text-sm text-neutral-600">Total Notes</div>
              <div className="text-3xl font-bold">{currentStats.totalNotes}</div>
            </div>
          </motion.div>
          <motion.div 
            className="bg-white rounded-xl p-6 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.2 }}
          >
            <div className="space-y-1">
              <div className="text-sm text-neutral-600">Tasks</div>
              <div className="text-3xl font-bold">{currentStats.tasks}</div>
            </div>
          </motion.div>
          <motion.div 
            className="bg-white rounded-xl p-6 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.3 }}
          >
            <div className="space-y-1">
              <div className="text-sm text-neutral-600">Issues</div>
              <div className="text-3xl font-bold">{currentStats.issues}</div>
            </div>
          </motion.div>
          <motion.div 
            className="bg-white rounded-xl p-6 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.4 }}
          >
            <div className="space-y-1">
              <div className="text-sm text-neutral-600">Reminders</div>
              <div className="text-3xl font-bold">{currentStats.reminders}</div>
            </div>
          </motion.div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 1.5 }}
      >
        <h2 className="text-xl font-bold mb-4">Attendance Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div 
            className="bg-white rounded-xl p-6 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.6 }}
          >
            <div className="space-y-1">
              <div className="text-sm text-neutral-600">Present Today</div>
              <div className="text-3xl font-bold">{currentStats.presentToday}</div>
            </div>
          </motion.div>
          <motion.div 
            className="bg-white rounded-xl p-6 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.7 }}
          >
            <div className="space-y-1">
              <div className="text-sm text-neutral-600">Absent Today</div>
              <div className="text-3xl font-bold">{currentStats.absentToday}</div>
            </div>
          </motion.div>
          <motion.div 
            className="bg-white rounded-xl p-6 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.8 }}
          >
            <div className="space-y-1">
              <div className="text-sm text-neutral-600">Late Today</div>
              <div className="text-3xl font-bold">{currentStats.lateToday}</div>
            </div>
          </motion.div>
          <motion.div 
            className="bg-white rounded-xl p-6 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.9 }}
          >
            <div className="space-y-1">
              <div className="text-sm text-neutral-600">On Leave Today</div>
              <div className="text-3xl font-bold">{currentStats.leaveToday}</div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
