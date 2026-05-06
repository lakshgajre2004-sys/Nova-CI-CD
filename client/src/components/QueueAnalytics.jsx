import React from 'react';
import { Layers, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function QueueAnalytics({ dashboard }) {
  const queued = dashboard.queued?.length || 0;
  const inProgress = dashboard.inProgress?.length || 0;
  const completedList = dashboard.completed || [];
  
  const success = completedList.filter(j => j.status === 'COMPLETED').length;
  const failed = completedList.filter(j => j.status === 'FAILED').length;
  
  const total = queued + inProgress + success + failed;
  
  const stats = [
    { label: 'Active Pipelines', value: inProgress, icon: Clock, color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/10', border: 'border-[#3b82f6]/30', shadow: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]' },
    { label: 'Pipeline Queue', value: queued, icon: Layers, color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10', border: 'border-[#f59e0b]/30', shadow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]' },
    { label: 'Successful Executions', value: success, icon: CheckCircle, color: 'text-[#10b981]', bg: 'bg-[#10b981]/10', border: 'border-[#10b981]/30', shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]' },
    { label: 'Failed Pipelines', value: failed, icon: AlertTriangle, color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10', border: 'border-[#ef4444]/30', shadow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={stat.label} 
            className={`glass-panel p-4 rounded-xl border ${stat.border} ${stat.shadow} flex flex-col relative overflow-hidden group`}
          >
            <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full ${stat.bg} blur-2xl group-hover:scale-150 transition-transform duration-700`}></div>
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-[#c5c6c7] text-sm font-medium">{stat.label}</span>
              <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <div className="flex items-end space-x-2 relative z-10">
              <span className="text-3xl font-bold text-white tracking-tight">{stat.value}</span>
              <span className="text-xs text-[#45a29e] mb-1">pipelines</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
