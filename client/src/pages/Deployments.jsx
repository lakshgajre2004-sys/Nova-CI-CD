import React from 'react';
import { motion } from 'framer-motion';
import { Terminal, CheckCircle2, History } from 'lucide-react';

export default function Deployments() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="max-w-screen-2xl mx-auto flex flex-col h-full space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <Terminal className="w-6 h-6 mr-3 text-[#66fcf1]" />
          Deployments
        </h2>
      </div>

      <div className="glass-panel flex-1 rounded-xl border border-[#2a313c] p-6 flex flex-col">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-[#2a313c]">
          <History className="w-5 h-5 text-[#45a29e]" />
          <h3 className="text-lg font-medium text-white">Deployment History</h3>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center text-[#45a29e] space-y-4">
          <Terminal className="w-16 h-16 opacity-30" />
          <p className="text-sm font-medium">No active deployment targets configured.</p>
          <button className="px-4 py-2 bg-[#1f2833] border border-[#2a313c] rounded-lg text-white hover:border-[#66fcf1] transition-colors mt-2 text-sm">
            Add Deployment Target
          </button>
        </div>
      </div>
    </motion.div>
  );
}
