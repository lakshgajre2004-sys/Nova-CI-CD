import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, BarChart3, TrendingUp, PieChart } from 'lucide-react';

export default function Analytics() {
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
          <LayoutDashboard className="w-6 h-6 mr-3 text-[#66fcf1]" />
          Analytics
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-64">
        <div className="glass-panel rounded-xl border border-[#2a313c] p-6 flex flex-col items-center justify-center text-[#45a29e]">
          <BarChart3 className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm font-medium">Execution Throughput (24h)</p>
        </div>
        <div className="glass-panel rounded-xl border border-[#2a313c] p-6 flex flex-col items-center justify-center text-[#45a29e]">
          <PieChart className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm font-medium">Pipeline Success Rate</p>
        </div>
      </div>
      
      <div className="glass-panel flex-1 rounded-xl border border-[#2a313c] p-6 flex flex-col items-center justify-center text-[#45a29e]">
        <TrendingUp className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm font-medium">Worker Utilization Trends</p>
      </div>
    </motion.div>
  );
}
