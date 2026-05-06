import React from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Filter, Search } from 'lucide-react';
import PipelineFeed from '../components/PipelineFeed';

export default function Pipelines({ dashboard, onSelectJob }) {
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
          <GitBranch className="w-6 h-6 mr-3 text-[#66fcf1]" />
          Pipelines
        </h2>
        
        <div className="flex space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#45a29e]" />
            <input 
              type="text" 
              placeholder="Search pipelines..." 
              className="pl-9 pr-4 py-2 bg-[#1f2833] border border-[#2a313c] rounded-lg text-sm text-white focus:outline-none focus:border-[#66fcf1]"
            />
          </div>
          <button className="flex items-center px-4 py-2 bg-[#1f2833] border border-[#2a313c] rounded-lg text-sm text-white hover:border-[#66fcf1] transition-colors">
            <Filter className="w-4 h-4 mr-2 text-[#45a29e]" />
            Filters
          </button>
        </div>
      </div>
      
      <div className="flex-1">
        <PipelineFeed dashboard={dashboard} onSelectJob={onSelectJob} />
      </div>
    </motion.div>
  );
}
