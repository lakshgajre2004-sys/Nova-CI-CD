import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { BASE_URL } from '../config/api';
import { Terminal, X } from 'lucide-react';

export default function PipelineExecutionPanel({ jobId, initialLogs = [], onClose }) {
  const [logs, setLogs] = useState(initialLogs);
  const bottomRef = useRef(null);

  useEffect(() => {
    setLogs(initialLogs);
  }, [jobId, initialLogs]);

  useEffect(() => {
    if (!jobId) return;
    const socket = io(BASE_URL);
    
    socket.emit('join_job', jobId);
    
    const onLog = (data) => {
      if (data.jobId === jobId) {
        setLogs(prev => [...prev, data.log]);
      }
    };
    
    socket.on('job_log', onLog);
    
    return () => {
      socket.off('job_log', onLog);
      socket.disconnect();
    };
  }, [jobId]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!jobId) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 lg:w-96 bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col z-50 transform transition-transform duration-300">
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center space-x-2 text-slate-100">
          <Terminal className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold">Execution Logs</h2>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-3 border-b border-slate-800 bg-slate-900 text-xs text-slate-400 font-mono flex items-center justify-between">
        <span className="truncate">Job ID: {jobId.split('-')[0]}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs sm:text-sm custom-scroll bg-[#0a0a0a]">
        {logs.length === 0 ? (
          <p className="text-slate-500 italic">Waiting for logs...</p>
        ) : (
          <div className="space-y-1.5">
            {logs.map((log, i) => (
              <div key={i} className="text-green-400 opacity-90 break-all">
                <span className="text-slate-600 mr-2">{'>'}</span>
                {log}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
