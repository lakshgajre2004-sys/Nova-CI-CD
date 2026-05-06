import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BASE_URL } from '../config/api';
import { X, Terminal as TerminalIcon, Download, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LiveLogTerminal({ jobId, onClose, socket }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const endOfLogsRef = useRef(null);

  useEffect(() => {
    if (!jobId) return;

    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${BASE_URL}/api/jobs/${jobId}/logs`);
        setLogs(res.data.logs || []);
      } catch (err) {
        console.error("Failed to fetch logs", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();

    const handleLog = (payload) => {
      if (payload.jobId === jobId) {
        setLogs(prev => [...prev, payload.log]);
      }
    };

    if (socket) {
      socket.on("job_log", handleLog);
    }

    return () => {
      if (socket) {
        socket.off("job_log", handleLog);
      }
    };
  }, [jobId, socket]);

  useEffect(() => {
    endOfLogsRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-5xl h-[85vh] bg-[#0b0c10] border border-[#2a313c] rounded-xl shadow-[0_0_50px_rgba(102,252,241,0.1)] flex flex-col overflow-hidden"
        >
          {/* Terminal Header */}
          <div className="h-12 bg-[#1f2833] border-b border-[#2a313c] flex justify-between items-center px-4 select-none">
            <div className="flex items-center space-x-3">
              <TerminalIcon className="w-5 h-5 text-[#66fcf1]" />
              <span className="text-[#c5c6c7] font-mono text-sm tracking-widest">
                NOVA_TERMINAL: <span className="text-[#45a29e]">{jobId.slice(0,8)}</span>
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <button className="text-[#45a29e] hover:text-[#66fcf1] transition-colors">
                <Download className="w-4 h-4" />
              </button>
              <button className="text-[#45a29e] hover:text-[#66fcf1] transition-colors">
                <Maximize2 className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-[#2a313c] mx-2"></div>
              <button onClick={onClose} className="text-[#ef4444] hover:text-[#f87171] transition-colors group p-1 rounded-md hover:bg-[#ef4444]/10">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Terminal Body */}
          <div className="flex-1 bg-[#050508] p-4 overflow-y-auto custom-scroll font-mono text-xs md:text-sm leading-relaxed text-[#c5c6c7]">
            {loading ? (
              <div className="flex items-center space-x-2 text-[#45a29e] animate-pulse">
                <span className="w-2 h-4 bg-[#66fcf1]"></span>
                <span>Establishing secure connection...</span>
              </div>
            ) : logs.length > 0 ? (
              <div className="space-y-1.5">
                {logs.map((log, index) => {
                  let colorClass = "text-[#c5c6c7]";
                  if (log.includes("❌") || log.toLowerCase().includes("failed") || log.toLowerCase().includes("error")) {
                    colorClass = "text-[#ef4444]";
                  } else if (log.includes("✅") || log.toLowerCase().includes("success")) {
                    colorClass = "text-[#10b981]";
                  } else if (log.includes("▶") || log.toLowerCase().includes("running")) {
                    colorClass = "text-[#66fcf1]";
                  } else if (log.startsWith("[")) {
                    colorClass = "text-[#3b82f6]";
                  }
                  
                  return (
                    <div key={index} className="flex">
                      <span className="text-[#2a313c] mr-4 select-none shrink-0 w-8 text-right">
                        {index + 1}
                      </span>
                      <span className={`${colorClass} break-all whitespace-pre-wrap`}>{log}</span>
                    </div>
                  );
                })}
                <div ref={endOfLogsRef} />
              </div>
            ) : (
              <div className="text-[#45a29e] italic">
                Waiting for incoming log stream...
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
