import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import { Edit2, Trash2, Plus, X, IndianRupee } from 'lucide-react';
import Modal from '@/components/Modal';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  address?: string;
  employeeId?: string;
  startDate: string;
  workingHours?: string;
  salary: number;
  paymentType: string;
  notes?: string;
  lastPaidOn: string;
}

interface NewStaffMember {
  name: string;
  role: string;
  phone: string;
  email?: string;
  address?: string;
  employeeId?: string;
  startDate: string;
  workingHours?: string;
  salary: string;
  paymentType: string;
  notes?: string;
}

const paymentMethods = [
  'Paytm',
  'B.H Account',
  'C.H Account',
  'RS Account',
  'RH Account',
  'MS Account',
  'SS Account',
  'Cash'
];

const paymentTypeColors: Record<string, string> = {
  'Paytm': 'bg-[#f8f9fa] text-gray-800',
  'B.H Account': 'bg-pink-50 text-pink-700',
  'C.H Account': 'bg-pink-50 text-pink-700',
  'RS Account': 'bg-red-50 text-red-700',
  'RH Account': 'bg-green-50 text-green-700',
  'MS Account': 'bg-orange-50 text-orange-700',
  'SS Account': 'bg-orange-50 text-orange-700',
  'Cash': 'bg-blue-50 text-blue-700',
  'Cash Exchange': 'bg-purple-50 text-purple-700',
};

const StaffPage = () => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [newStaff, setNewStaff] = useState<NewStaffMember>({
    name: '',
    role: '',
    phone: '',
    email: '',
    address: '',
    employeeId: '',
    startDate: '',
    workingHours: '',
    salary: '',
    paymentType: 'Cash',
    notes: ''
  });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStaff, setPaymentStaff] = useState<StaffMember | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteStaffId, setDeleteStaffId] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [paidSoFar, setPaidSoFar] = useState(0);
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    return localStorage.getItem('lastPaymentDate') || new Date().toISOString().slice(0, 10);
  });
  
  // Load staff data from localStorage
  useEffect(() => {
    const savedStaff = localStorage.getItem('staffMembers');
    if (savedStaff) {
      try {
        setStaffMembers(JSON.parse(savedStaff));
      } catch (error) {
        console.error('Error parsing saved staff:', error);
      }
    }
  }, []);

  // Save to localStorage whenever staff changes
  useEffect(() => {
    if (staffMembers.length > 0) {
      localStorage.setItem('staffMembers', JSON.stringify(staffMembers));
    } else {
      localStorage.removeItem('staffMembers');
    }
  }, [staffMembers]);

  // Calculate totals
  const totalStaff = staffMembers.length;
  const totalMonthlySalaries = staffMembers.reduce((total, staff) => total + staff.salary, 0);
  const duesRemaining = totalMonthlySalaries - paidSoFar;

  // Helper to get current salary cycle
  const getCurrentSalaryCycle = () => {
    const stored = localStorage.getItem('salaryCycle');
    return stored ? Number(stored) : 1;
  };

  // Helper to set/increment salary cycle
  const incrementSalaryCycle = () => {
    const current = getCurrentSalaryCycle();
    localStorage.setItem('salaryCycle', String(current + 1));
  };

  // On mount, ensure salaryCycle exists and calculate paidSoFar
  useEffect(() => {
    if (!localStorage.getItem('salaryCycle')) {
      localStorage.setItem('salaryCycle', '1');
    }
    updatePaidSoFar();
  }, []);

  // Helper to update paidSoFar
  const updatePaidSoFar = () => {
    const savedItems = localStorage.getItem('inventoryItems');
    const currentCycle = getCurrentSalaryCycle();
    if (!savedItems) {
      setPaidSoFar(0);
      return;
    }
    try {
      const items = JSON.parse(savedItems);
      const totalPaid = items
        .filter((item) => item.name && item.name.startsWith('Advance Salary Payment - ') && item.salaryCycle === currentCycle)
        .reduce((sum, item) => sum + (Number(item.price) || 0), 0);
      setPaidSoFar(totalPaid);
    } catch {
      setPaidSoFar(0);
    }
  };

  // Call updatePaidSoFar after every payment
  useEffect(() => {
    updatePaidSoFar();
  }, [staffMembers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewStaff(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingStaff) {
      // Update existing staff
      setStaffMembers(prev => prev.map(staff => 
        staff.id === editingStaff.id 
          ? {
              ...staff,
              name: newStaff.name,
              role: newStaff.role,
              phone: newStaff.phone,
              email: newStaff.email || undefined,
              address: newStaff.address || undefined,
              employeeId: newStaff.employeeId || undefined,
              startDate: newStaff.startDate,
              workingHours: newStaff.workingHours || undefined,
              salary: Number(newStaff.salary),
              paymentType: newStaff.paymentType,
              notes: newStaff.notes || undefined
            }
          : staff
      ));
    } else {
      // Add new staff
      const staff: StaffMember = {
        id: Date.now().toString(),
        name: newStaff.name,
        role: newStaff.role,
        phone: newStaff.phone,
        email: newStaff.email || undefined,
        address: newStaff.address || undefined,
        employeeId: newStaff.employeeId || undefined,
        startDate: newStaff.startDate,
        workingHours: newStaff.workingHours || undefined,
        salary: Number(newStaff.salary),
        paymentType: newStaff.paymentType,
        notes: newStaff.notes || undefined,
        lastPaidOn: new Date().toLocaleDateString('en-IN')
      };
      setStaffMembers(prev => [staff, ...prev]);
    }

    handleCloseModal();
  };

  const handleEditStaff = (staff: StaffMember) => {
    setEditingStaff(staff);
    setNewStaff({
      name: staff.name,
      role: staff.role,
      phone: staff.phone,
      email: staff.email,
      address: staff.address,
      employeeId: staff.employeeId,
      startDate: staff.startDate,
      workingHours: staff.workingHours,
      salary: staff.salary.toString(),
      paymentType: staff.paymentType,
      notes: staff.notes
    });
    setIsModalOpen(true);
  };

  const handleDeleteStaff = (id: string) => {
    setDeleteStaffId(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
    setNewStaff({
      name: '',
      role: '',
      phone: '',
      email: '',
      address: '',
      employeeId: '',
      startDate: '',
      workingHours: '',
      salary: '',
      paymentType: 'Cash',
      notes: ''
    });
  };

  const openPaymentModal = (staff: StaffMember) => {
    setPaymentStaff(staff);
    setPaymentAmount('');
    setPaymentMode('Cash');
    setPaymentDate(localStorage.getItem('lastPaymentDate') || new Date().toISOString().slice(0, 10));
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setPaymentStaff(null);
    setPaymentAmount('');
    setPaymentMode('Cash');
  };

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentStaff || !paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      return;
    }

    // Check if salary is already fully paid
    const salaryPaid = getSalaryPaid(paymentStaff);
    const salaryLeft = Math.max(0, paymentStaff.salary - salaryPaid);
    
    if (salaryLeft === 0) {
      toast({
        title: "Payment Not Allowed",
        description: "Full salary has already been paid. Please reset salary to make new payments.",
        variant: "destructive",
      });
      closePaymentModal();
      return;
    }

    // Check if payment amount exceeds remaining salary
    if (Number(paymentAmount) > salaryLeft) {
      toast({
        title: "Invalid Amount",
        description: `Payment amount cannot exceed remaining salary of ₹${salaryLeft}`,
        variant: "destructive",
      });
      return;
    }

    // Add payment as an expense in inventoryItems, with salaryCycle
    const today = new Date();
    const formattedDate = paymentDate;
    const currentCycle = getCurrentSalaryCycle();
    const newExpense = {
      id: Date.now().toString(),
      name: `Advance Salary Payment - ${paymentStaff.name}`,
      quantity: '1',
      price: Number(paymentAmount),
      paymentMode: paymentMode,
      notes: `Advance salary payment to ${paymentStaff.name} (Role: ${paymentStaff.role})`,
      date: formattedDate,
      salaryCycle: currentCycle,
    };

    // Get current inventory items
    const savedItems = localStorage.getItem('inventoryItems');
    let inventoryItems = [];
    if (savedItems) {
      try {
        inventoryItems = JSON.parse(savedItems);
      } catch {}
    }
    inventoryItems.unshift(newExpense); // Add to start
    localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));

    // Update last paid date
    setStaffMembers(prev => prev.map(staff => 
      staff.id === paymentStaff.id 
        ? { ...staff, lastPaidOn: formattedDate }
        : staff
    ));

    // Update paidSoFar
    updatePaidSoFar();

    // Save last used date
    localStorage.setItem('lastPaymentDate', formattedDate);

    toast({
      title: "Payment Successful",
      description: `₹${paymentAmount} has been paid to ${paymentStaff.name}`,
    });

    closePaymentModal();
  };

  // Helper to get salary paid for a staff member (only for current cycle)
  const getSalaryPaid = (staff: StaffMember) => {
    const savedItems = localStorage.getItem('inventoryItems');
    const currentCycle = getCurrentSalaryCycle();
    if (!savedItems) return 0;
    try {
      const items = JSON.parse(savedItems);
      return items
        .filter((item: any) => item.name === `Advance Salary Payment - ${staff.name}` && item.salaryCycle === currentCycle)
        .reduce((sum: number, item: any) => sum + (Number(item.price) || 0), 0);
    } catch {
      return 0;
    }
  };

  // Reset salary: increment cycle and force UI refresh
  const handleResetSalary = () => {
    incrementSalaryCycle();
    setStaffMembers((prev) => [...prev]);
    setPaidSoFar(0);
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
          {/* Header with Add Staff Button */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Staff Management</h1>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-black text-white px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-black/90 transition-colors text-sm"
              >
                <Plus size={16} />
                Add Staff
              </button>
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-red-700 transition-colors text-sm"
              >
                Reset Salary
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-[20px] p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-full">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Staff</p>
                  <p className="text-xl font-semibold text-gray-900">{totalStaff}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[20px] p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-full">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 12H18" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 4V20" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 7H9.5C8.57174 7 7.6815 7.21071 7.02513 7.58579C6.36875 7.96086 6 8.46957 6 9C6 9.53043 6.36875 10.0391 7.02513 10.4142C7.6815 10.7893 8.57174 11 9.5 11H14.5C15.4283 11 16.3185 11.2107 16.9749 11.5858C17.6313 11.9609 18 12.4696 18 13C18 13.5304 17.6313 14.0391 16.9749 14.4142C16.3185 14.7893 15.4283 15 14.5 15H6" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Monthly Salaries</p>
                  <p className="text-xl font-semibold text-gray-900">₹{totalMonthlySalaries}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[20px] p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-full">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5Z" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 7L12 13L21 7" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Paid So Far</p>
                  <p className="text-xl font-semibold text-gray-900">₹{paidSoFar.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[20px] p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-full">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 8V12L15 15" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3.05493 11.0549C3.01797 11.3663 3 11.6821 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C9.84998 3 7.87402 3.77899 6.33944 5.07946" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Dues Remaining</p>
                  <p className="text-xl font-semibold text-gray-900">₹{duesRemaining}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Staff Table */}
          <div className="bg-white rounded-[20px] border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Name</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Role</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Salary</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Salary Paid</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Salary Left</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Payment Type</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Last Paid On</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staffMembers.map((staff) => {
                  const salaryPaid = getSalaryPaid(staff);
                  const salaryLeft = Math.max(0, staff.salary - salaryPaid);
                  return (
                    <tr key={staff.id} className="hover:bg-gray-50/50">
                      <td className="py-2 px-4 text-sm text-gray-900">{staff.name}</td>
                      <td className="py-2 px-4 text-sm text-gray-600">{staff.role}</td>
                      <td className="py-2 px-4 text-sm text-gray-900">₹{staff.salary}</td>
                      <td className="py-2 px-4 text-sm text-green-700">₹{salaryPaid}</td>
                      <td className="py-2 px-4 text-sm text-red-700">₹{salaryLeft}</td>
                      <td className="py-2 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentTypeColors[staff.paymentType] || 'bg-gray-100 text-gray-800'}`}>
                          {staff.paymentType}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-600">{staff.lastPaidOn}</td>
                      <td className="py-2 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleEditStaff(staff)}
                          className="text-gray-600 hover:text-black"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="text-gray-600 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => openPaymentModal(staff)}
                          className={`${salaryLeft === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-green-600'}`}
                          title={salaryLeft === 0 ? "Full salary already paid" : "Process Payment"}
                          disabled={salaryLeft === 0}
                        >
                          <IndianRupee size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {staffMembers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No staff members added yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add/Edit Staff Modal */}
          <Modal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            title={editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={newStaff.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Role</label>
                  <input
                    type="text"
                    name="role"
                    value={newStaff.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={newStaff.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Email (Optional)</label>
                  <input
                    type="email"
                    name="email"
                    value={newStaff.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Address (Optional)</label>
                  <input
                    type="text"
                    name="address"
                    value={newStaff.address}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Employee ID (Optional)</label>
                  <input
                    type="text"
                    name="employeeId"
                    value={newStaff.employeeId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={newStaff.startDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Working Hours (Optional)</label>
                  <input
                    type="text"
                    name="workingHours"
                    value={newStaff.workingHours}
                    onChange={handleInputChange}
                    placeholder="e.g. 9 AM - 5 PM"
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Salary</label>
                  <input
                    type="number"
                    name="salary"
                    value={newStaff.salary}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Payment Type</label>
                  <select
                    name="paymentType"
                    value={newStaff.paymentType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                    required
                  >
                    {paymentMethods.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-sm mb-1.5">Notes (Optional)</label>
                <textarea
                  name="notes"
                  value={newStaff.notes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                  rows={3}
                />
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
                  {editingStaff ? 'Update' : 'Add'} Staff Member
                </button>
              </div>
            </form>
          </Modal>

          {/* Process Payment Modal */}
          <Modal
            isOpen={isPaymentModalOpen}
            onClose={closePaymentModal}
            title="Process Payment"
          >
            {paymentStaff && (
              <form onSubmit={handleProcessPayment} className="space-y-6">
                <div>
                  <div className="text-gray-500 text-sm mb-1">Staff Member</div>
                  <div className="font-medium text-lg text-gray-900">{paymentStaff.name}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-sm mb-1">Role</div>
                  <div className="font-medium text-lg text-gray-900">{paymentStaff.role}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-sm mb-1">Monthly Salary</div>
                  <div className="font-medium text-lg text-gray-900">₹{paymentStaff.salary.toLocaleString()}</div>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Payment Amount</label>
                  <input
                    type="number"
                    min="1"
                    max={paymentStaff.salary}
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                  >
                    {paymentMethods.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={closePaymentModal}
                    className="px-4 py-2 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-full bg-black text-white hover:bg-black/90 text-sm"
                  >
                    Process Payment
                  </button>
                </div>
              </form>
            )}
          </Modal>

          {/* Delete Confirmation Modal */}
          <Modal
            isOpen={isDeleteConfirmOpen}
            onClose={() => { setIsDeleteConfirmOpen(false); setDeleteStaffId(null); }}
            title="Delete Staff Member"
          >
            <div className="space-y-4">
              <p>Are you sure you want to delete this staff member? This action cannot be undone.</p>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setIsDeleteConfirmOpen(false); setDeleteStaffId(null); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-red-600 text-white rounded-full text-sm hover:bg-red-700 transition-colors"
                  onClick={() => {
                    if (deleteStaffId) {
                      const updatedStaff = staffMembers.filter(staff => staff.id !== deleteStaffId);
                      setStaffMembers(updatedStaff);
                      if (updatedStaff.length === 0) {
                        localStorage.removeItem('staffMembers');
                      }
                    }
                    setIsDeleteConfirmOpen(false);
                    setDeleteStaffId(null);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </Modal>

          {/* Reset Salary Confirmation Modal */}
          <Modal
            isOpen={isResetConfirmOpen}
            onClose={() => setIsResetConfirmOpen(false)}
            title="Reset Salary Cycle"
          >
            <div className="space-y-4">
              <p>Are you sure you want to reset the salary cycle? This will allow you to pay salaries again, but all previous salary payment records will remain in inventory/expenses for history.</p>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-red-600 text-white rounded-full text-sm hover:bg-red-700 transition-colors"
                  onClick={() => {
                    handleResetSalary();
                    setIsResetConfirmOpen(false);
                  }}
                >
                  Reset Salary
                </button>
              </div>
            </div>
          </Modal>
        </div>
      </motion.div>
    </PageLayout>
  );
};

export default StaffPage;
