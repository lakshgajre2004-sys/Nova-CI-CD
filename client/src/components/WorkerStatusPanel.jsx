import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BASE_URL } from '../config/api';
import { Server, PlayCircle, StopCircle, RefreshCw } from 'lucide-react';

export default function WorkerStatusPanel() {
  const [workers, setWorkers] = useState([]);

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/workers/status`);
        setWorkers(res.data.workers);
      } catch (err) {
        console.error("Failed to fetch workers", err);
      }
    };

    fetchWorkers();
    const interval = setInterval(fetchWorkers, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 shadow-lg h-full">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/50">
        <h2 className="text-lg font-bold text-slate-200 flex items-center space-x-2">
          <Server className="w-5 h-5 text-indigo-400" />
          <span>Build Executors</span>
        </h2>
        <RefreshCw className={`w-4 h-4 text-slate-500 ${workers.length > 0 ? 'animate-spin-slow' : ''}`} />
      </div>

      <div className="space-y-3">
        {workers.length === 0 ? (
          <p className="text-slate-400 text-sm italic">Loading executors...</p>
        ) : (
          workers.map((worker) => (
            <div key={worker.id} className="flex flex-col bg-slate-900/50 p-3 rounded-lg border border-slate-700/30">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300 text-sm">{worker.id}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {worker.type}
                </span>
              </div>
              
              <div className="mt-2 flex items-center space-x-2 text-sm">
                {worker.status === 'IDLE' ? (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                    <span className="text-slate-400">Idle</span>
                  </>
                ) : (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                    <span className="text-blue-400 text-xs truncate">Running {worker.jobId?.split('-')[0]}</span>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
