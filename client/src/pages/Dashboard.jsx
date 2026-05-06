import React from 'react';
import { motion } from 'framer-motion';
import QueueAnalytics from '../components/QueueAnalytics';
import PipelineFeed from '../components/PipelineFeed';
import WorkerPanel from '../components/WorkerPanel';

export default function Dashboard({ dashboard, onSelectJob }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 xl:grid-cols-4 gap-6 max-w-screen-2xl mx-auto"
    >
      <div className="xl:col-span-3 space-y-6">
        <QueueAnalytics dashboard={dashboard} />
        <PipelineFeed dashboard={dashboard} onSelectJob={onSelectJob} />
      </div>
      <div className="space-y-6 h-[calc(100vh-140px)]">
        <WorkerPanel />
      </div>
    </motion.div>
  );
}
