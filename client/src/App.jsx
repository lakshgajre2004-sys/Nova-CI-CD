import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Toaster, toast } from 'react-hot-toast';
import { BASE_URL } from './config/api';
import JobCard from './components/JobCard';
import WorkerStatusPanel from './components/WorkerStatusPanel';
import PipelineExecutionPanel from './components/PipelineExecutionPanel';
import { Activity, Rocket } from 'lucide-react';

export default function App() {
  const [dashboard, setDashboard] = useState({ queued: [], inProgress: [], completed: [] });
  const [repo, setRepo] = useState('https://github.com/example/repo.git');
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);

  // Fetch initial dashboard state
  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/jobs/dashboard`);
      setDashboard(res.data);
    } catch (err) {
      console.error("Error fetching dashboard:", err);
      toast.error("Failed to load dashboard data");
    }
  };

  useEffect(() => {
    fetchDashboard();

    const socket = io(BASE_URL);

    // Listen to job updates and refresh the UI
    const updateUI = (payload) => {
      // In a more complex app, we'd manually mutate the arrays for performance.
      // Re-fetching ensures perfect sync with backend state, guaranteeing consistency.
      fetchDashboard();

      // Optional enhancements: Toast notifications on state transitions
      if (payload.status === "FAILED") {
        toast.error(`Job [${payload.jobId.slice(0, 8)}] Failed at ${payload.currentStage}`);
      } else if (payload.status === "COMPLETED") {
        toast.success(`Job [${payload.jobId.slice(0, 8)}] Completed!`);
      } else if (payload.status === "IN_PROGRESS" && payload.currentStage === "Checkout") {
        // Just started
        toast(`Job [${payload.jobId.slice(0, 8)}] Started`, { icon: '🚀' });
      }
    };

    socket.on("job_update", updateUI);

    return () => {
      socket.off("job_update", updateUI);
      socket.disconnect();
    };
  }, []);

  const handleTriggerJob = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/api/jobs/trigger`, { repo, branch });
      toast.success("Job triggered successfully!");
      setRepo('');
      setBranch('main');
      // The socket will eventually update the UI, but we can proactively fetch:
      fetchDashboard();
    } catch (err) {
      if (err.response && err.response.status === 409) {
        toast.error("Duplicate job is already running!");
      } else {
        toast.error("Failed to trigger job");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-slate-900 text-slate-100 font-sans">
      <Toaster position="top-right" toastOptions={{ className: 'dark:bg-slate-800 dark:text-slate-100' }} />

      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center space-x-3">
            <Activity className="w-8 h-8 text-blue-500" />
            <span>Jenkins CI/CD Dashboard</span>
          </h1>
          <p className="text-slate-400 mt-1">Real-time Pipeline Orchestration</p>
        </div>

        {/* Trigger Panel */}
        <form onSubmit={handleTriggerJob} className="flex flex-col sm:flex-row gap-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 shadow-lg">
          <input
            type="text"
            placeholder="Repository URL"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            required
            className="px-4 py-2 bg-slate-900 border border-slate-700 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[250px] transition-all"
          />
          <input
            type="text"
            placeholder="Branch"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            required
            className="px-4 py-2 bg-slate-900 border border-slate-700 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32 transition-all"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg font-medium shadow-md shadow-blue-900 transition-colors flex items-center justify-center space-x-2"
          >
            {loading ? <Rocket className="w-4 h-4 animate-bounce" /> : <Rocket className="w-4 h-4" />}
            <span>Trigger Job</span>
          </button>
        </form>
      </header>

      {/* Content Area with Sidebar */}
      <div className="flex flex-col xl:flex-row gap-6">

        {/* Left Sidebar for Workers */}
        <div className="xl:w-72 flex-shrink-0">
          <WorkerStatusPanel />
        </div>

        {/* Main Grid Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* QUEUED Column */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-amber-500/20 px-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 px-2" />
              <h2 className="text-lg font-semibold text-amber-500 tracking-wide">QUEUED</h2>
              <span className="bg-amber-500/10 text-amber-500 text-xs py-0.5 px-2.5 rounded-full ml-auto">
                {dashboard.queued?.length || 0}
              </span>
            </div>
            <div className="flex flex-col space-y-4 overflow-y-auto pr-2 custom-scroll max-h-[70vh]">
              {dashboard.queued?.length > 0 ? (
                dashboard.queued.map(job => <JobCard key={job.id} job={job} onClickLogs={() => setSelectedJobId(job.id)} />)
              ) : (
                <p className="text-slate-500 text-sm italic py-4 text-center">No jobs queued.</p>
              )}
            </div>
          </div>

          {/* IN PROGRESS Column */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-blue-500/20 px-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 px-2 animate-pulse" />
              <h2 className="text-lg font-semibold text-blue-500 tracking-wide">IN PROGRESS</h2>
              <span className="bg-blue-500/10 text-blue-500 text-xs py-0.5 px-2.5 rounded-full ml-auto">
                {dashboard.inProgress?.length || 0}
              </span>
            </div>
            <div className="flex flex-col space-y-4 overflow-y-auto pr-2 custom-scroll max-h-[70vh]">
              {dashboard.inProgress?.length > 0 ? (
                dashboard.inProgress.map(job => <JobCard key={job.id} job={job} onClickLogs={() => setSelectedJobId(job.id)} />)
              ) : (
                <p className="text-slate-500 text-sm italic py-4 text-center">No running jobs.</p>
              )}
            </div>
          </div>

          {/* COMPLETED Column */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-green-500/20 px-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 px-2" />
              <h2 className="text-lg font-semibold text-green-500 tracking-wide">COMPLETED</h2>
              <span className="bg-green-500/10 text-green-500 text-xs py-0.5 px-2.5 rounded-full ml-auto">
                {dashboard.completed?.length || 0}
              </span>
            </div>
            <div className="flex flex-col space-y-4 overflow-y-auto pr-2 custom-scroll max-h-[70vh]">
              {dashboard.completed?.length > 0 ? (
                dashboard.completed.map(job => <JobCard key={job.id} job={job} onClickLogs={() => setSelectedJobId(job.id)} />)
              ) : (
                <p className="text-slate-500 text-sm italic py-4 text-center">No completed jobs.</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Logs Modal/Panel */}
      <PipelineExecutionPanel
        jobId={selectedJobId}
        initialLogs={
          selectedJobId
            ? [...(dashboard.queued || []), ...(dashboard.inProgress || []), ...(dashboard.completed || [])].find(j => j.id === selectedJobId)?.logs || []
            : []
        }
        onClose={() => setSelectedJobId(null)}
      />
    </div>
  );
}
