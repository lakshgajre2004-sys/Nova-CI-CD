import React, { useState } from 'react';
import { Rocket, Bell, Search, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { BASE_URL } from '../config/api';

export default function TopNav({ onTrigger }) {
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);

  const handleTriggerJob = async (e) => {
    e.preventDefault();
    if (!repo) {
      toast.error("Repository URL is required", { style: { background: '#1f2833', color: '#ef4444' } });
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/api/jobs/trigger`, { repo, branch });
      toast.success("Pipeline triggered successfully!", { style: { background: '#1f2833', color: '#10b981' } });
      setRepo('');
      setBranch('main');
      if (onTrigger) onTrigger();
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error("Duplicate pipeline is already running!", { style: { background: '#1f2833', color: '#ef4444' } });
      } else {
        toast.error("Failed to trigger pipeline", { style: { background: '#1f2833', color: '#ef4444' } });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="h-16 glass-panel border-b border-[#2a313c] flex items-center justify-between px-6 z-10 sticky top-0">
      <div className="flex flex-col justify-center">
        <h1 className="text-lg font-bold tracking-wider text-white">NOVA CI</h1>
        <p className="text-[10px] text-[#45a29e] uppercase tracking-widest">Realtime Pipeline Orchestration Platform</p>
      </div>

      <div className="flex items-center space-x-6">
        <form onSubmit={handleTriggerJob} className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Repo URL (e.g. https://github.com/org/repo.git)"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            className="w-64 bg-[#1f2833] border border-[#2a313c] rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#66fcf1]"
          />
          <input
            type="text"
            placeholder="Branch"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-20 bg-[#1f2833] border border-[#2a313c] rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#66fcf1]"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={loading}
            className="bg-[#66fcf1] hover:bg-[#45a29e] text-[#0b0c10] px-4 py-1.5 rounded-md text-xs font-bold shadow-[0_0_10px_rgba(102,252,241,0.3)] disabled:opacity-50 flex items-center"
          >
            {loading ? <Rocket className="w-3.5 h-3.5 mr-1 animate-bounce" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
            RUN
          </motion.button>
        </form>

        <div className="flex items-center space-x-4 border-l border-[#2a313c] pl-6">
          <button className="relative text-[#c5c6c7] hover:text-[#66fcf1] transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#ef4444] rounded-full border-2 border-[#0b0c10]"></span>
          </button>
        </div>
      </div>
    </header>
  );
}
