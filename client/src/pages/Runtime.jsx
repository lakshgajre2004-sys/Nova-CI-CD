import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, Database } from 'lucide-react';

export default function Runtime() {
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
          <Activity className="w-6 h-6 mr-3 text-[#66fcf1]" />
          Orchestration Runtime
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Event Loop Lag', value: '1.2ms', icon: Activity },
          { label: 'Redis Latency', value: '0.4ms', icon: Database },
          { label: 'Throughput', value: '142 ops/s', icon: Zap },
        ].map((stat, idx) => (
          <div key={idx} className="glass-panel p-6 rounded-xl border border-[#2a313c]">
            <div className="flex items-center space-x-3 mb-2 text-[#45a29e]">
              <stat.icon className="w-5 h-5" />
              <span className="font-medium text-sm">{stat.label}</span>
            </div>
            <div className="text-3xl font-bold text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-panel flex-1 rounded-xl border border-[#2a313c] p-6 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#66fcf1]/5 blur-3xl rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#3b82f6]/5 blur-3xl rounded-full"></div>
        <Activity className="w-16 h-16 text-[#45a29e]/50 mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Runtime Telemetry Ready</h3>
        <p className="text-sm text-[#45a29e] text-center max-w-md">
          Detailed orchestration telemetry and Redis integration graphs will populate here during high-throughput execution cycles.
        </p>
      </div>
    </motion.div>
  );
}
