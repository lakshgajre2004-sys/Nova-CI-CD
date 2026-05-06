import React from 'react';
import { Activity, LayoutDashboard, GitBranch, Terminal, Settings, Server, Box } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: GitBranch, label: 'Pipelines', active: false },
  { icon: Server, label: 'Workers', active: false }, // Oh wait, prompt says "Workers", not "Nova Workers" in Sidebar. Let me use 'Workers'
  { icon: Activity, label: 'Runtime', active: false },
  { icon: LayoutDashboard, label: 'Analytics', active: false },
  { icon: Terminal, label: 'Deployments', active: false },
  { icon: Box, label: 'Logs', active: false },
];

export default function Sidebar() {
  return (
    <aside className="w-64 glass-panel border-r border-[#2a313c] flex flex-col z-20">
      <div className="h-16 flex items-center px-6 border-b border-[#2a313c]">
        <Activity className="w-6 h-6 text-[#66fcf1] mr-3" />
        <span className="text-xl font-bold tracking-wider text-[#66fcf1] glow-text-accent">NOVA CI</span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
        <div className="text-xs font-semibold text-[#45a29e] uppercase tracking-wider mb-4 px-2">Menu</div>
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.label}
              whileHover={{ x: 4, backgroundColor: 'rgba(69, 162, 158, 0.1)' }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                item.active 
                  ? 'bg-[#1f2833] text-[#66fcf1] border border-[#45a29e]/30' 
                  : 'text-[#c5c6c7] hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              <span className="font-medium text-sm">{item.label}</span>
              {item.active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#66fcf1] shadow-[0_0_8px_#66fcf1]" />
              )}
            </motion.button>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-[#2a313c]">
        <div className="bg-[#1f2833] rounded-lg p-3 flex items-center space-x-3 border border-[#2a313c]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#66fcf1] to-[#45a29e] flex items-center justify-center text-black font-bold">
            A
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">Admin</span>
            <span className="text-xs text-[#45a29e]">Nova Engine</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
