import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Toaster, toast } from 'react-hot-toast';
import { BASE_URL } from './config/api';

import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import PipelineFeed from './components/PipelineFeed';
import WorkerPanel from './components/WorkerPanel';
import QueueAnalytics from './components/QueueAnalytics';
import LiveLogTerminal from './components/LiveLogTerminal';

export default function App() {
  const [dashboard, setDashboard] = useState({ queued: [], inProgress: [], completed: [] });
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [socket, setSocket] = useState(null);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/jobs/dashboard`);
      setDashboard(res.data);
    } catch (err) {
      console.error("Error fetching dashboard:", err);
      toast.error("Failed to load dashboard data", {
        style: { background: '#1f2833', color: '#c5c6c7', border: '1px solid #2a313c' }
      });
    }
  };

  useEffect(() => {
    fetchDashboard();
    const newSocket = io(BASE_URL);
    setSocket(newSocket);

    const updateUI = (payload) => {
      fetchDashboard();
      if (payload.status === "FAILED") {
        toast.error(`Pipeline [${payload.jobId.slice(0, 8)}] Failed at ${payload.currentStage}`, {
          style: { background: '#1f2833', color: '#ef4444', border: '1px solid #ef4444' }
        });
      } else if (payload.status === "COMPLETED") {
        toast.success(`Pipeline [${payload.jobId.slice(0, 8)}] Completed!`, {
          style: { background: '#1f2833', color: '#10b981', border: '1px solid #10b981' }
        });
      } else if (payload.status === "IN_PROGRESS" && payload.currentStage === "Checkout") {
        toast(`Pipeline [${payload.jobId.slice(0, 8)}] Started`, { 
          icon: '🚀',
          style: { background: '#1f2833', color: '#66fcf1', border: '1px solid #45a29e' }
        });
      }
    };

    newSocket.on("job_update", updateUI);
    return () => {
      newSocket.off("job_update", updateUI);
      newSocket.disconnect();
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b0c10] text-[#c5c6c7] font-sans selection:bg-[#66fcf1] selection:text-[#0b0c10]">
      <Toaster position="top-right" />
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <TopNav onTrigger={() => fetchDashboard()} />
        <main className="flex-1 overflow-y-auto custom-scroll p-6">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 max-w-screen-2xl mx-auto">
            <div className="xl:col-span-3 space-y-6">
              <QueueAnalytics dashboard={dashboard} />
              <PipelineFeed dashboard={dashboard} onSelectJob={setSelectedJobId} />
            </div>
            <div className="space-y-6">
              <WorkerPanel />
            </div>
          </div>
        </main>
      </div>
      {selectedJobId && (
        <LiveLogTerminal
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
          socket={socket}
        />
      )}
    </div>
  );
}
