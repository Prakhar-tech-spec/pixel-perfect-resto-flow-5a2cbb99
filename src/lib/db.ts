import { useEffect, useState } from 'react';

// This is a mock implementation for the frontend
// In a real app, you would use Electron or another solution for SQLite access

interface Expense {
  id: number;
  name: string;
  description?: string;
  price: number;
  payment_method: string;
  date: string;
}

interface Staff {
  id: number;
  name: string;
  role?: string;
  phone?: string;
  join_date: string;
  salary_type: string;
  salary_amount: number;
  notes?: string;
}

interface SalaryPayment {
  id: number;
  staff_id: number;
  amount: number;
  date: string;
  method?: string;
  status: 'Paid' | 'Partial' | 'Pending';
}

interface Attendance {
  id: number;
  staff_id: number;
  date: string;
  status: 'Present' | 'Absent' | 'Half Day' | 'Leave';
}

// Mock data
const initialExpenses: Expense[] = [];
const initialStaff: Staff[] = [
  {
    id: 1,
    name: 'John Doe',
    role: 'Chef',
    join_date: '2023-01-15',
    salary_type: 'Monthly',
    salary_amount: 5000,
  },
  {
    id: 2,
    name: 'Jane Smith',
    role: 'Server',
    join_date: '2023-02-20',
    salary_type: 'Monthly',
    salary_amount: 3000,
  },
  {
    id: 3,
    name: 'Mike Johnson',
    role: 'Manager',
    join_date: '2022-11-10',
    salary_type: 'Monthly',
    salary_amount: 9000,
  },
];
const initialSalaryPayments: SalaryPayment[] = [];
const initialAttendance: Attendance[] = [];

// Mock database service
export function useDatabase() {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>(initialSalaryPayments);
  const [attendance, setAttendance] = useState<Attendance[]>(initialAttendance);
  const [isLoading, setIsLoading] = useState(false);

  // Expense operations
  const addExpense = (expense: Omit<Expense, 'id'>) => {
    const newExpense = {
      ...expense,
      id: expenses.length + 1,
    };
    setExpenses([...expenses, newExpense]);
    return newExpense;
  };

  const getExpenses = () => expenses;

  // Staff operations
  const addStaff = (staffMember: Omit<Staff, 'id'>) => {
    const newStaff = {
      ...staffMember,
      id: staff.length + 1,
    };
    setStaff([...staff, newStaff]);
    return newStaff;
  };

  const getStaff = () => staff;

  // Salary operations
  const addSalaryPayment = (payment: Omit<SalaryPayment, 'id'>) => {
    const newPayment = {
      ...payment,
      id: salaryPayments.length + 1,
    };
    setSalaryPayments([...salaryPayments, newPayment]);
    return newPayment;
  };

  const getSalaryPayments = () => salaryPayments;

  // Attendance operations
  const addAttendance = (record: Omit<Attendance, 'id'>) => {
    const newRecord = {
      ...record,
      id: attendance.length + 1,
    };
    setAttendance([...attendance, newRecord]);
    return newRecord;
  };

  const getAttendance = () => attendance;

  // Stats
  const getStats = () => {
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.price, 0);
    const totalStaff = staff.length;
    const totalSalaryPaid = salaryPayments
      .filter(payment => payment.status === 'Paid')
      .reduce((sum, payment) => sum + payment.amount, 0);
    const totalSalaryDue = staff.reduce((sum, member) => sum + member.salary_amount, 0) - totalSalaryPaid;

    return {
      totalExpenses,
      totalStaff,
      totalSalaryPaid,
      totalSalaryDue,
      inventoryItems: 150,
      uniqueItems: 45,
      inventorySalesDifference: -10175
    };
  };

  return {
    isLoading,
    expenses: {
      add: addExpense,
      getAll: getExpenses,
    },
    staff: {
      add: addStaff,
      getAll: getStaff,
    },
    salaryPayments: {
      add: addSalaryPayment,
      getAll: getSalaryPayments,
    },
    attendance: {
      add: addAttendance,
      getAll: getAttendance,
    },
    stats: {
      get: getStats,
    },
  };
}
