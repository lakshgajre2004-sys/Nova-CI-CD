import React from 'react';
import { motion } from 'framer-motion';
import { Server, Activity, Cpu } from 'lucide-react';
import WorkerPanel from '../components/WorkerPanel';

export default function Workers() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="max-w-screen-2xl mx-auto flex flex-col h-[calc(100vh-120px)]"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <Server className="w-6 h-6 mr-3 text-[#66fcf1]" />
          Nova Workers
        </h2>
        
        <div className="flex space-x-4">
          <div className="glass-panel px-4 py-2 rounded-lg border border-[#2a313c] flex items-center space-x-3">
            <Cpu className="w-4 h-4 text-[#45a29e]" />
            <span className="text-sm font-medium text-[#c5c6c7]">Cluster Health: <span className="text-[#10b981]">Optimal</span></span>
          </div>
          <div className="glass-panel px-4 py-2 rounded-lg border border-[#2a313c] flex items-center space-x-3">
            <Activity className="w-4 h-4 text-[#45a29e]" />
            <span className="text-sm font-medium text-[#c5c6c7]">Utilization: <span className="text-[#66fcf1]">42%</span></span>
          </div>
        </div>
      </div>
      
      <div className="flex-1">
        <WorkerPanel />
      </div>
    </motion.div>
  );
}
