import React from 'react';
import { motion } from 'framer-motion';
import { Box, Search, Filter } from 'lucide-react';

export default function Logs() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="max-w-screen-2xl mx-auto flex flex-col h-[calc(100vh-120px)] space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <Box className="w-6 h-6 mr-3 text-[#66fcf1]" />
          System Logs
        </h2>
        
        <div className="flex space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#45a29e]" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              className="pl-9 pr-4 py-2 bg-[#1f2833] border border-[#2a313c] rounded-lg text-sm text-white focus:outline-none focus:border-[#66fcf1]"
            />
          </div>
          <button className="flex items-center px-4 py-2 bg-[#1f2833] border border-[#2a313c] rounded-lg text-sm text-white hover:border-[#66fcf1] transition-colors">
            <Filter className="w-4 h-4 mr-2 text-[#45a29e]" />
            Filters
          </button>
        </div>
      </div>

      <div className="glass-panel flex-1 rounded-xl border border-[#2a313c] overflow-hidden flex flex-col font-mono text-sm">
        <div className="h-12 border-b border-[#2a313c] bg-[#1f2833]/80 flex items-center px-4">
          <span className="text-[#c5c6c7]">System Log Viewer</span>
        </div>
        <div className="flex-1 bg-[#050508] p-6 text-[#c5c6c7] flex flex-col items-center justify-center">
          <Box className="w-12 h-12 text-[#45a29e]/30 mb-4" />
          <span className="text-[#45a29e]">No persistent logs available in this view.</span>
          <span className="text-xs text-[#45a29e]/60 mt-2">Select a pipeline to view execution logs.</span>
        </div>
      </div>
    </motion.div>
  );
}
