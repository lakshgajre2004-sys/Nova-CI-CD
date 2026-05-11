import React from 'react';
import { motion } from 'framer-motion';
import {
  GitCommit,
  GitBranch,
  Globe,
  Clock,
  Server,
  Terminal,
  AlertCircle
} from 'lucide-react';

import AnimatedStage from './AnimatedStage';

export default function PipelineCard({
  job,
  onClick
}) {

  const repoName =
    job.repo
      .split('/')
      .pop()
      .replace('.git', '');

  const statusStyles = {
    QUEUED:
      'border-[#f59e0b]/50 shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-[#f59e0b]/5',

    IN_PROGRESS:
      'border-[#3b82f6]/50 shadow-[0_0_15px_rgba(59,130,246,0.15)] bg-[#3b82f6]/5',

    COMPLETED:
      'border-[#10b981]/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-[#10b981]/5',

    FAILED:
      'border-[#ef4444]/50 shadow-[0_0_15px_rgba(239,68,68,0.15)] bg-[#ef4444]/5'
  };

  const getPriorityDetails = (score) => {
    if (score >= 100) return { level: 'Critical', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
    if (score >= 70) return { level: 'High', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
    if (score >= 40) return { level: 'Medium', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
    return { level: 'Low', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' };
  };

  const priority = getPriorityDetails(job.priority || 0);

  const statusGlow = {
    QUEUED:
      'bg-[#f59e0b]',

    IN_PROGRESS:
      'bg-[#3b82f6] animate-pulse',

    COMPLETED:
      'bg-[#10b981]',

    FAILED:
      'bg-[#ef4444]'
  };

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10
      }}
      animate={{
        opacity: 1,
        y: 0
      }}
      whileHover={{
        scale: 1.01,
        transition: {
          duration: 0.2
        }
      }}
      onClick={onClick}
      className={`
        relative
        cursor-pointer
        rounded-xl
        border
        p-5
        transition-all
        overflow-hidden
        ${statusStyles[job.status]}
      `}
    >

      {/* LEFT STATUS BAR */}
      <div
        className={`
          absolute
          top-0
          left-0
          w-1
          h-full
          ${statusGlow[job.status]}
        `}
      />

      {/* HEADER */}
      <div className="flex justify-between items-start mb-4">

        {/* LEFT */}
        <div className="flex items-center space-x-3">

          {/* ICON */}
          <div
            className="
              p-2
              bg-[#1f2833]
              rounded-lg
              border
              border-[#2a313c]
            "
          >
            <Globe
              className="
    w-6
    h-6
    text-white
  "
            />
          </div>

          {/* REPO DETAILS */}
          <div>

            <h3
              className="
                font-bold
                text-lg
                text-white
                tracking-wide
              "
            >
              {repoName}
            </h3>

            <div
              className="
                flex
                items-center
                space-x-3
                text-xs
                text-[#45a29e]
                mt-1
              "
            >

              {/* BRANCH */}
              <span className="flex items-center">
                <GitBranch className="w-3 h-3 mr-1" />
                {job.branch}
              </span>

              {/* COMMIT */}
              <span className="flex items-center">
                <GitCommit className="w-3 h-3 mr-1" />
                {
                  job.commit
                    ?.slice(0, 7)
                  || 'HEAD'
                }
              </span>

              {/* WORKER */}
              <span
                className="
                  flex
                  items-center
                  px-1.5
                  py-0.5
                  rounded-full
                  bg-[#1f2833]
                  border
                  border-[#2a313c]
                "
              >
                <Server className="w-3 h-3 mr-1" />

                Worker {
                  job.workerId
                    ?.slice(0, 4)
                  || 'Pending'
                }
              </span>

              {/* PRIORITY INDICATOR */}
              {job.priority !== undefined && (
                <span className={`flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${priority.bg} ${priority.border} ${priority.color}`}>
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {priority.level} ({job.priority})
                  <span className="hidden sm:inline ml-1 opacity-70 font-normal">
                    — {job.priorityReason?.split(',')[0]}
                  </span>
                </span>
              )}

            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col items-end">

          {/* STATUS */}
          <div className="flex items-center space-x-2">

            <span
              className="
                text-xs
                font-semibold
                uppercase
                tracking-wider
                text-[#c5c6c7]
              "
            >
              Status:
            </span>

            <span
              className={`
                text-xs
                font-bold
                px-2
                py-1
                rounded-md
                bg-[#1f2833]
                border
                border-[#2a313c]

                ${job.status === 'COMPLETED'
                  ? 'text-[#10b981]'
                  : job.status === 'FAILED'
                    ? 'text-[#ef4444]'
                    : job.status === 'IN_PROGRESS'
                      ? 'text-[#3b82f6]'
                      : 'text-[#f59e0b]'
                }
              `}
            >
              {
                job.status.replace(
                  '_',
                  ' '
                )
              }
            </span>
          </div>

          {/* TIME */}
          <div
            className="
              flex
              items-center
              space-x-1
              mt-2
              text-[10px]
              text-[#45a29e]
            "
          >
            <Clock className="w-3 h-3" />

            <span>
              {
                new Date(
                  job.createdAt
                ).toLocaleTimeString()
              }
            </span>
          </div>
        </div>
      </div>

      {/* STAGES */}
      <div
        className="
          bg-[#0b0c10]/50
          rounded-lg
          p-3
          border
          border-[#2a313c]
          mt-4
          flex
          items-center
          overflow-x-auto
          custom-scroll
        "
      >

        {
          job.stages &&
            job.stages.length > 0
            ? (
              job.stages.map(
                (
                  stage,
                  idx
                ) => (

                  <React.Fragment key={idx}>

                    <AnimatedStage
                      stage={stage}
                      index={idx}
                      isLast={
                        idx ===
                        job.stages.length - 1
                      }
                    />

                  </React.Fragment>
                )
              )
            )
            : (
              <div
                className="
                  text-xs
                  text-[#45a29e]
                  italic
                  w-full
                  text-center
                  py-2
                "
              >
                Waiting for pipeline
                configuration...
              </div>
            )
        }

      </div>

      {/* TERMINAL OVERLAY */}
      <div
        className="
          absolute
          inset-0
          bg-gradient-to-t
          from-[#0b0c10]
          to-transparent
          opacity-0
          hover:opacity-100
          transition-opacity
          flex
          items-end
          justify-center
          pb-4
        "
      >

        <button
          className="
            flex
            items-center
            space-x-2
            bg-[#66fcf1]
            hover:bg-[#45a29e]
            text-black
            px-4
            py-1.5
            rounded-lg
            font-bold
            text-xs
            shadow-[0_0_15px_rgba(102,252,241,0.5)]
            transition-all
          "
        >

          <Terminal className="w-4 h-4" />

          <span>
            View Terminal
          </span>

        </button>
      </div>

    </motion.div>
  );
}