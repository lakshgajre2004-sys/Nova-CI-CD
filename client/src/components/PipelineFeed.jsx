import React from 'react';
import PipelineCard from './PipelineCard';

export default function PipelineFeed({ dashboard, onSelectJob }) {
  const allJobs = [
    ...(dashboard.inProgress || []),
    ...(dashboard.queued || []),
    ...(dashboard.completed || [])
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="glass-panel border border-[#2a313c] rounded-xl overflow-hidden flex flex-col h-[calc(100vh-220px)]">
      <div className="px-6 py-4 border-b border-[#2a313c] bg-[#1f2833]/80 flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-lg font-semibold text-white tracking-wide">Live Pipeline Feed</h2>
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10b981]"></span>
          </span>
          <span className="text-xs text-[#10b981] font-medium tracking-wider uppercase">Live Updates</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-4">
        {allJobs.length > 0 ? (
          allJobs.map(job => (
            <PipelineCard 
              key={job.id} 
              job={job} 
              onClick={() => onSelectJob(job.id)} 
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#45a29e] opacity-50 space-y-4">
            <div className="w-16 h-16 border-2 border-dashed border-[#45a29e] rounded-full flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
            <p>No pipelines found. Trigger a job to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
