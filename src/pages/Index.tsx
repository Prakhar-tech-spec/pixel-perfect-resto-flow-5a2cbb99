import React from 'react';
import Dashboard from '@/components/Dashboard';
import PageLayout from '@/components/PageLayout';
import { motion } from 'framer-motion';

const Index = () => {
  return (
    <PageLayout>
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        className="h-full"
      >
        <Dashboard />
      </motion.div>
    </PageLayout>
  );
};

export default Index;
