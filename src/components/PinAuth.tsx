import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface PinAuthProps {
  onAuthSuccess: () => void;
}

const PinAuth: React.FC<PinAuthProps> = ({ onAuthSuccess }) => {
  const [pin, setPin] = useState('');
  const { toast } = useToast();
  const CORRECT_PIN = '99100';

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 5 && /^\d*$/.test(value)) {
      setPin(value);
      
      // Auto-submit when PIN length is 5
      if (value.length === 5) {
        if (value === CORRECT_PIN) {
          onAuthSuccess();
        } else {
          toast({
            title: "Invalid PIN",
            description: "Please try again",
            variant: "destructive",
          });
          setPin('');
        }
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        {/* Blurred backdrop */}
        <motion.div
          initial={{ backdropFilter: 'blur(0px)' }}
          animate={{ backdropFilter: 'blur(8px)' }}
          exit={{ backdropFilter: 'blur(0px)' }}
          className="absolute inset-0 bg-black/30"
        />
        
        {/* PIN input container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative bg-white rounded-[32px] p-8 shadow-xl w-full max-w-md mx-4"
        >
          <h2 className="text-2xl font-bold text-center mb-6">Enter PIN</h2>
          <div className="space-y-4">
            <input
              type="password"
              value={pin}
              onChange={handlePinChange}
              placeholder="Enter 5-digit PIN"
              className="w-full px-4 py-3 text-center text-2xl tracking-widest border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={5}
              autoFocus
            />
            <p className="text-sm text-gray-500 text-center">
              Please enter the 5-digit PIN to access the application
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PinAuth; 