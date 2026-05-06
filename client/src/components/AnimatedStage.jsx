import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, CircleDashed, Loader2 } from 'lucide-react';

export default function AnimatedStage({ stage, index, isLast }) {
  const statusColors = {
    SUCCESS: 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
    FAILED: 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]',
    RUNNING: 'text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/50 shadow-[0_0_10px_rgba(59,130,246,0.5)]',
    PENDING: 'text-[#45a29e] bg-transparent border-[#2a313c]'
  };

  const getIcon = () => {
    switch (stage.status) {
      case 'SUCCESS': return <Check className="w-3.5 h-3.5" />;
      case 'FAILED': return <X className="w-3.5 h-3.5" />;
      case 'RUNNING': return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
      default: return <CircleDashed className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="flex items-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: index * 0.1 }}
        className={`relative flex items-center justify-center w-7 h-7 rounded-full border ${statusColors[stage.status]} z-10`}
      >
        {getIcon()}
      </motion.div>
      <div className="ml-2 mr-3 flex flex-col justify-center">
        <span className="text-xs font-semibold text-[#c5c6c7] truncate max-w-[80px]">{stage.name}</span>
        {stage.duration > 0 && (
          <span className="text-[10px] text-[#45a29e]">{(stage.duration / 1000).toFixed(1)}s</span>
        )}
      </div>
      {!isLast && (
        <div className="flex-1 min-w-[20px] h-0.5 mx-1 relative">
          <div className="absolute inset-0 bg-[#2a313c]"></div>
          {(stage.status === 'SUCCESS' || stage.status === 'RUNNING') && (
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.5 }}
              className={`absolute inset-0 ${stage.status === 'SUCCESS' ? 'bg-[#10b981]' : 'bg-[#3b82f6]'} shadow-[0_0_5px_currentColor]`}
            ></motion.div>
          )}
        </div>
      )}
    </div>
  );
}
