import React from "react";
import { CheckCircle, Loader2, XCircle, Circle, TerminalSquare, Clock, Cpu } from "lucide-react";

const getStatusColor = (status) => {
  switch (status) {
    case "SUCCESS":
      return "text-green-500";
    case "FAILED":
      return "text-red-500";
    case "IN_PROGRESS":
    case "RUNNING":
      return "text-blue-500";
    default:
      return "text-slate-500";
  }
};

const getProgressBarColor = (status) => {
  switch (status) {
    case "FAILED":
      return "bg-red-500";
    case "COMPLETED":
    case "SUCCESS":
      return "bg-green-500";
    case "IN_PROGRESS":
      return "bg-blue-500";
    default:
      return "bg-slate-600";
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "SUCCESS":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "FAILED":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "RUNNING":
    case "IN_PROGRESS":
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    default:
      return <Circle className="w-4 h-4 text-slate-500" />; // Pending
  }
};

export default function JobCard({ job, onClickLogs }) {
  const { id, repo, branch, status, currentStage, stages, startedAt, completedAt, workerId } = job;
  
  let progressPercentage = 0;

  if (status === "COMPLETED") {
    progressPercentage = 100;
  } else if (stages && stages.length > 0) {
    const completedStages = stages.filter(
      (stage) => stage.status === "SUCCESS" || stage.status === "FAILED"
    ).length;
    const totalStages = stages.length;
    progressPercentage = Math.round((completedStages / totalStages) * 100);
  }

  const getDuration = () => {
    if (!startedAt) return "N/A";
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const diff = Math.floor((end - start) / 1000); // in seconds
    return `${diff}s`;
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-5 shadow-lg hover:shadow-xl hover:border-slate-600/50 transition-all duration-300">
      {/* Header section */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-slate-200 font-semibold text-lg flex items-center space-x-2">
            <span className="truncate max-w-[150px] title" title={repo}>{repo.split("/").pop()}</span>
            <span className="text-slate-500 text-sm font-normal px-2 py-0.5 bg-slate-700/50 rounded-md truncate max-w-[100px]" title={branch}>
              {branch}
            </span>
          </h3>
          <p className="text-slate-400 text-xs mt-1 font-mono">#{id.split("-")[0]}</p>
        </div>
        <div className={`px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-900 border ${
          status === 'QUEUED' ? 'border-amber-500/30 text-amber-500' :
          status === 'IN_PROGRESS' ? 'border-blue-500/30 text-blue-500' :
          status === 'COMPLETED' ? 'border-green-500/30 text-green-500' :
          status === 'FAILED' ? 'border-red-500/30 text-red-500' : 'border-slate-500/30 text-slate-500'
        }`}>
          {status}
        </div>
      </div>

      {workerId && (
        <div className="flex items-center space-x-1.5 mb-3">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-mono bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">
            {workerId}
          </span>
        </div>
      )}

      {/* Progress Bar & Header Data */}
      <div className="mb-4">
        <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{getDuration()}</span>
            </span>
          </div>
          <span>{progressPercentage}%</span>
        </div>
        <div className="w-full bg-slate-900/80 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full progress-bar-animated ${getProgressBarColor(status)}`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Stages List */}
      <div className="space-y-2 mt-4 bg-slate-900/40 p-3 rounded-lg border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-400 font-medium tracking-wider uppercase flex items-center gap-1">
            {currentStage ? (
              <><Loader2 className="w-3 h-3 animate-spin"/> {currentStage}</>
            ) : (
              "Detailed Stages"
            )}
          </p>
          <button 
            onClick={onClickLogs}
            className="flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded"
          >
            <TerminalSquare className="w-3.5 h-3.5" />
            <span>Logs</span>
          </button>
        </div>
        {stages && stages.length > 0 ? (
          <ul className="space-y-2.5">
            {stages.map((stage, idx) => (
              <li key={idx} className="flex items-center space-x-3 text-sm">
                <div>{getStatusIcon(stage.status)}</div>
                <span className={`font-medium ${getStatusColor(stage.status)}`}>
                  {stage.name}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500 italic">No stages loaded yet.</p>
        )}
      </div>
    </div>
  );
}
