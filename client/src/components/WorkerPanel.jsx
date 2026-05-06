import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BASE_URL } from '../config/api';
import { Server, Cpu, Activity, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WorkerPanel() {
  const [workers, setWorkers] = useState([]);

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/jobs/workers`);
        setWorkers(res.data);
      } catch (err) {
        console.error("Failed to fetch workers", err);
      }
    };

    fetchWorkers();
    const interval = setInterval(fetchWorkers, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel border border-[#2a313c] rounded-xl overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-[#2a313c] bg-[#1f2833]/80 flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-lg font-semibold text-white tracking-wide flex items-center">
          <Server className="w-5 h-5 mr-2 text-[#45a29e]" />
          Nova Runtime
        </h2>
        <span className="bg-[#1f2833] border border-[#2a313c] text-[#66fcf1] text-xs font-bold px-2 py-1 rounded-md shadow-[0_0_10px_rgba(102,252,241,0.2)]">
          {workers.length} Active
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4">
        {workers.length > 0 ? (
          workers.map((worker, idx) => (
            <motion.div 
              key={worker.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-[#0b0c10]/80 border border-[#2a313c] rounded-lg p-4 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-[#66fcf1] opacity-[0.03] rounded-bl-full group-hover:scale-110 transition-transform"></div>
              
              <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-[#1f2833] rounded-md border border-[#2a313c]">
                    <Cpu className="w-4 h-4 text-[#66fcf1]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-[#c5c6c7] font-bold">Nova Worker-{worker.id.slice(0, 4)}</span>
                    <span className="text-[10px] text-[#45a29e] flex items-center mt-0.5">
                      <Activity className="w-3 h-3 mr-1" /> Uptime: 99.9%
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
                  </span>
                </div>
              </div>

              <div className="space-y-2 relative z-10">
                <div className="flex justify-between text-xs">
                  <span className="text-[#45a29e]">Current Load</span>
                  <span className="text-white font-mono">{worker.jobsRunning} / {worker.concurrency} pipelines</span>
                </div>
                <div className="w-full bg-[#1f2833] rounded-full h-1.5">
                  <div 
                    className="bg-gradient-to-r from-[#45a29e] to-[#66fcf1] h-1.5 rounded-full shadow-[0_0_5px_rgba(102,252,241,0.5)] transition-all duration-500" 
                    style={{ width: `${(worker.jobsRunning / worker.concurrency) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-[#c5c6c7] pt-2 border-t border-[#2a313c] mt-2">
                  <span>Specialization:</span>
                  <span className="px-1.5 py-0.5 bg-[#1f2833] rounded border border-[#2a313c] flex items-center">
                    <Zap className="w-3 h-3 mr-1 text-[#f59e0b]" /> General
                  </span>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-8 text-[#45a29e]/50 text-sm italic">
            No active Nova workers connected.
          </div>
        )}
      </div>
    </div>
  );
}
