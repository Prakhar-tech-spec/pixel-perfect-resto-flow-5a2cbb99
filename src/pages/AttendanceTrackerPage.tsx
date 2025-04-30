import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import Modal from '@/components/Modal';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Edit2, Trash2 } from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  salary: number;
  paymentType: string;
  lastPaidOn: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  staffMember: string;
  staffId: string;
  status: 'Present' | 'Absent' | 'Late' | 'Leave';
  time: string;
  notes: string;
}

const AttendanceTrackerPage = () => {
  // State for attendance records and staff members
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isMarkingModalOpen, setIsMarkingModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<AttendanceRecord['status']>('Present');
  const [notes, setNotes] = useState('');
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);

  // Enhanced useEffect to sync with staff management data
  useEffect(() => {
    const loadData = () => {
      // Load staff members from localStorage
      const savedStaff = localStorage.getItem('staffMembers');
      if (savedStaff) {
        try {
          const parsedStaff = JSON.parse(savedStaff);
          setStaffMembers(parsedStaff);
        } catch (error) {
          console.error('Error parsing staff data:', error);
          setStaffMembers([]);
        }
      }

      // Load attendance records
      const savedAttendance = localStorage.getItem('attendanceRecords');
      if (savedAttendance) {
        try {
          const parsedAttendance = JSON.parse(savedAttendance);
          setAttendanceRecords(parsedAttendance);
        } catch (error) {
          console.error('Error parsing attendance data:', error);
          setAttendanceRecords([]);
        }
      }
    };

    // Initial load
    loadData();

    // Set up storage event listener to sync data across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'staffMembers') {
        loadData();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save attendance records to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  // Calculate today's summary
  const todayRecords = attendanceRecords.filter(record => record.date === format(new Date(), 'yyyy-MM-dd'));
  const todaySummary = {
    present: todayRecords.filter(record => record.status === 'Present').length,
    absent: todayRecords.filter(record => record.status === 'Absent').length,
    late: todayRecords.filter(record => record.status === 'Late').length,
    leave: todayRecords.filter(record => record.status === 'Leave').length
  };

  // Calculate monthly overview
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthRecords = attendanceRecords.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
  });

  const monthlyOverview = {
    totalWorkingDays: new Date(currentYear, currentMonth + 1, 0).getDate(),
    averageAttendance: monthRecords.length > 0
      ? Math.round((monthRecords.filter(r => r.status === 'Present').length / monthRecords.length) * 100) + '%'
      : '100%'
  };

  // Handle marking attendance
  const handleMarkAttendance = () => {
    if (!selectedStaff || !selectedStatus) return;

    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      date: selectedDate,
      staffId: selectedStaff,
      staffMember: staffMembers.find(s => s.id === selectedStaff)?.name || '',
      status: selectedStatus,
      time: format(new Date(), 'HH:mm'),
      notes: notes
    };

    setAttendanceRecords(prev => [newRecord, ...prev]);
    handleCloseMarkingModal();
  };

  const handleCloseMarkingModal = () => {
    setIsMarkingModalOpen(false);
    setSelectedStaff('');
    setSelectedStatus('Present');
    setNotes('');
  };

  // Filter records for the table
  const filteredRecords = attendanceRecords.filter(record => record.date === filterDate);

  // Get status badge style
  const getStatusBadgeStyle = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'Present':
        return 'bg-green-100 text-green-800';
      case 'Absent':
        return 'bg-red-100 text-red-800';
      case 'Late':
        return 'bg-yellow-100 text-yellow-800';
      case 'Leave':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Attendance Tracker</h1>
            <p className="text-gray-600">Track and manage staff attendance</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Today's Summary */}
            <div className="bg-white rounded-[20px] p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Today's Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Present</span>
                  <span className="text-gray-900">{todaySummary.present}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Absent</span>
                  <span className="text-gray-900">{todaySummary.absent}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Late</span>
                  <span className="text-gray-900">{todaySummary.late}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Leave</span>
                  <span className="text-gray-900">{todaySummary.leave}</span>
                </div>
              </div>
            </div>

            {/* Monthly Overview */}
            <div className="bg-white rounded-[20px] p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Monthly Overview</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Working Days</span>
                  <span className="text-gray-900">{monthlyOverview.totalWorkingDays}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Average Attendance</span>
                  <span className="text-gray-900">{monthlyOverview.averageAttendance}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-[20px] p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button 
                  onClick={() => setIsMarkingModalOpen(true)}
                  className="w-full py-2 bg-[#D1E62A] text-black rounded-full hover:bg-[#D1E62A]/90 transition-colors"
                >
                  Mark Attendance
                </button>
                <button 
                  onClick={() => setIsReportsModalOpen(true)}
                  className="w-full py-2 bg-white text-gray-600 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                >
                  View Reports
                </button>
              </div>
            </div>
          </div>

          {/* Today's Attendance Table */}
          <div className="bg-white rounded-[20px] p-6">
            <div className="flex flex-col gap-2 mb-6">
              <h2 className="text-lg font-medium text-gray-900">Today's Attendance</h2>
              <h3 className="text-sm font-semibold text-gray-700">Manage Today's Attendance Actions</h3>
              <div className="flex items-center gap-3 mt-1">
                <label className="text-sm text-gray-600">Filter by date:</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 text-gray-600 font-medium">Date</th>
                    <th className="text-left py-3 text-gray-600 font-medium">Staff Member</th>
                    <th className="text-left py-3 text-gray-600 font-medium">Status</th>
                    <th className="text-left py-3 text-gray-600 font-medium">Time</th>
                    <th className="text-left py-3 text-gray-600 font-medium">Notes</th>
                    <th className="text-left py-3 text-gray-600 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        No attendance records for {format(new Date(filterDate), 'dd MMM yyyy')}
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="border-b border-gray-100">
                        <td className="py-3 text-gray-900">{format(new Date(record.date), 'dd MMM yyyy')}</td>
                        <td className="py-3 text-gray-900">{record.staffMember}</td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyle(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="py-3 text-gray-900">{record.time}</td>
                        <td className="py-3 text-gray-600">{record.notes}</td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <button
                              className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-yellow-600 transition-colors duration-200"
                              onClick={() => { setEditRecord(record); setIsEditModalOpen(true); }}
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className="p-1.5 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-colors duration-200"
                              onClick={() => { setDeleteRecordId(record.id); setIsDeleteConfirmOpen(true); }}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mark Attendance Modal */}
          <Modal
            isOpen={isMarkingModalOpen}
            onClose={handleCloseMarkingModal}
            title="Mark Attendance"
          >
            <form onSubmit={(e) => { e.preventDefault(); handleMarkAttendance(); }} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm mb-1.5">Staff Member</label>
                {staffMembers.length === 0 ? (
                  <div className="text-sm text-gray-500 p-2 bg-gray-50 rounded-xl">
                    No staff members found. Please add staff members in the Staff Management page.
                  </div>
                ) : (
                  <select
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                    required
                  >
                    <option value="">Select Staff Member</option>
                    {staffMembers.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} - {staff.role} ({staff.phone})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedStaff && (
                <div className="bg-gray-50 p-3 rounded-xl text-sm">
                  {(() => {
                    const staff = staffMembers.find(s => s.id === selectedStaff);
                    if (staff) {
                      return (
                        <div className="space-y-1">
                          <p className="font-medium text-gray-900">{staff.name}</p>
                          <p className="text-gray-600">{staff.role}</p>
                          <p className="text-gray-600">Phone: {staff.phone}</p>
                          {staff.email && <p className="text-gray-600">Email: {staff.email}</p>}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              <div>
                <label className="block text-gray-700 text-sm mb-1.5">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as AttendanceRecord['status'])}
                  className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                  required
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Late">Late</option>
                  <option value="Leave">Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 text-sm mb-1.5">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm resize-none"
                  rows={3}
                  placeholder="Add any additional notes..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseMarkingModal}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white rounded-full text-sm hover:bg-black/90 transition-colors"
                  disabled={staffMembers.length === 0}
                >
                  Mark Attendance
                </button>
              </div>
            </form>
          </Modal>

          {/* Reports Modal */}
          <Modal
            isOpen={isReportsModalOpen}
            onClose={() => setIsReportsModalOpen(false)}
            title="Attendance Reports"
          >
            <div className="space-y-6">
              {/* Monthly Statistics */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Monthly Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-600">Present Days</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {monthRecords.filter(r => r.status === 'Present').length}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-600">Absent Days</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {monthRecords.filter(r => r.status === 'Absent').length}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-600">Late Days</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {monthRecords.filter(r => r.status === 'Late').length}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-600">Leave Days</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {monthRecords.filter(r => r.status === 'Leave').length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Staff-wise Summary */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Staff-wise Summary (This Month)</h3>
                <div className="space-y-3">
                  {staffMembers.map(staff => {
                    const staffMonthRecords = monthRecords.filter(r => r.staffId === staff.id);
                    const presentDays = staffMonthRecords.filter(r => r.status === 'Present').length;
                    const totalDays = staffMonthRecords.length;
                    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

                    return (
                      <div key={staff.id} className="bg-gray-50 p-4 rounded-xl">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{staff.name}</p>
                            <p className="text-xs text-gray-600">{staff.role}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-900">{presentDays}/{totalDays} days</p>
                            <p className="text-xs text-gray-600">{attendancePercentage}% attendance</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setIsReportsModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>

          {/* Edit Attendance Modal */}
          <Modal
            isOpen={isEditModalOpen}
            onClose={() => { setIsEditModalOpen(false); setEditRecord(null); }}
            title="Edit Attendance Record"
          >
            {editRecord && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  setAttendanceRecords(prev => prev.map(r => r.id === editRecord.id ? editRecord : r));
                  setIsEditModalOpen(false);
                  setEditRecord(null);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Date</label>
                  <input
                    type="date"
                    value={editRecord.date}
                    onChange={e => setEditRecord({ ...editRecord, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Status</label>
                  <select
                    value={editRecord.status}
                    onChange={e => setEditRecord({ ...editRecord, status: e.target.value as AttendanceRecord['status'] })}
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                    required
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Late">Late</option>
                    <option value="Leave">Leave</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Notes (Optional)</label>
                  <textarea
                    value={editRecord.notes}
                    onChange={e => setEditRecord({ ...editRecord, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm resize-none"
                    rows={3}
                    placeholder="Add any additional notes..."
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => { setIsEditModalOpen(false); setEditRecord(null); }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black text-white rounded-full text-sm hover:bg-black/90 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </Modal>

          {/* Delete Confirmation Modal */}
          <Modal
            isOpen={isDeleteConfirmOpen}
            onClose={() => { setIsDeleteConfirmOpen(false); setDeleteRecordId(null); }}
            title="Delete Attendance Record"
          >
            <div className="space-y-4">
              <p>Are you sure you want to delete this attendance record? This action cannot be undone.</p>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setIsDeleteConfirmOpen(false); setDeleteRecordId(null); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-red-600 text-white rounded-full text-sm hover:bg-red-700 transition-colors"
                  onClick={() => {
                    setAttendanceRecords(prev => prev.filter(r => r.id !== deleteRecordId));
                    setIsDeleteConfirmOpen(false);
                    setDeleteRecordId(null);
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

export default AttendanceTrackerPage; 