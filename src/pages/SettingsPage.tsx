import React, { useState } from 'react';
import PageLayout from '@/components/PageLayout';
import Modal from '@/components/Modal';
import { motion } from 'framer-motion';

const RESET_PIN = '99100';

const SettingsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = () => {
    setIsModalOpen(true);
    setPin('');
    setError('');
    setSuccess(false);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPin(e.target.value);
    setError('');
  };

  const handleConfirm = () => {
    if (pin === RESET_PIN) {
      // Only keep staffMembers, notes, and settings
      const staff = localStorage.getItem('staffMembers');
      const notes = localStorage.getItem('notes');
      // Optionally, keep settings if you store any
      localStorage.clear();
      if (staff) localStorage.setItem('staffMembers', staff);
      if (notes) localStorage.setItem('notes', notes);
      setSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess(false);
      }, 1500);
    } else {
      setError('Invalid PIN');
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
        <div className="p-8 max-w-[600px] mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Settings</h1>
          <div className="bg-white rounded-[20px] p-6 shadow flex flex-col items-center">
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-red-600 text-white rounded-full font-semibold text-lg hover:bg-red-700 transition-colors"
            >
              Reset Everything
            </button>
            <p className="text-gray-500 text-sm mt-3 text-center">
              This will erase all data except Staff and Notes. You will be asked for a PIN to confirm.
            </p>
          </div>
        </div>
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Confirm Reset"
        >
          {success ? (
            <div className="text-green-600 text-center font-semibold py-6">All data (except Staff and Notes) has been reset!</div>
          ) : (
            <div className="space-y-4">
              <p>Enter the 5-digit PIN to reset everything except Staff and Notes:</p>
              <input
                type="password"
                value={pin}
                onChange={handlePinChange}
                maxLength={5}
                className="w-full px-4 py-2 border border-gray-200 rounded-full text-lg text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-black/5"
                placeholder="Enter PIN"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
              />
              {error && <div className="text-red-600 text-sm text-center">{error}</div>}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-red-600 text-white rounded-full text-sm hover:bg-red-700 transition-colors"
                  onClick={handleConfirm}
                  disabled={pin.length !== 5}
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          )}
        </Modal>
      </motion.div>
    </PageLayout>
  );
};

export default SettingsPage; 