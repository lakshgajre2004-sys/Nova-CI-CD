import React from 'react';
import { motion } from 'framer-motion';

import QueueAnalytics from '../components/QueueAnalytics';
import PipelineFeed from '../components/PipelineFeed';
import WorkerPanel from '../components/WorkerPanel';

export default function Dashboard({
  dashboard,
  onSelectJob
}) {

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
      exit={{
        opacity: 0,
        y: -10
      }}
      transition={{
        duration: 0.3
      }}
      className="
        grid
        grid-cols-1
        xl:grid-cols-4
        gap-6
        max-w-screen-2xl
        mx-auto
      "
    >

      {/* MAIN CONTENT */}
      <div className="xl:col-span-3 space-y-8">

        {/* ANALYTICS */}
        <QueueAnalytics
          dashboard={dashboard}
        />

        {/* QUEUED */}
        <section
          className="
            bg-[#0f172a]
            border
            border-cyan-900/40
            rounded-2xl
            p-6
          "
        >

          <div className="
            flex
            items-center
            justify-between
            mb-5
          ">

            <h2 className="
              text-2xl
              font-bold
              text-cyan-400
            ">
              Queued Pipelines
            </h2>

            <span className="
              text-sm
              text-gray-400
            ">
              {dashboard?.queued?.length || 0} jobs
            </span>

          </div>

          <PipelineFeed
            jobs={dashboard?.queued || []}
            type="queued"
            onSelectJob={onSelectJob}
          />

        </section>

        {/* RUNNING */}
        <section
          className="
            bg-[#0f172a]
            border
            border-yellow-900/40
            rounded-2xl
            p-6
          "
        >

          <div className="
            flex
            items-center
            justify-between
            mb-5
          ">

            <h2 className="
              text-2xl
              font-bold
              text-yellow-400
            ">
              Running Pipelines
            </h2>

            <span className="
              text-sm
              text-gray-400
            ">
              {dashboard?.inProgress?.length || 0} jobs
            </span>

          </div>

          <PipelineFeed
            jobs={dashboard?.inProgress || []}
            type="running"
            onSelectJob={onSelectJob}
          />

        </section>

        {/* COMPLETED */}
        <section
          className="
            bg-[#0f172a]
            border
            border-green-900/40
            rounded-2xl
            p-6
          "
        >

          <div className="
            flex
            items-center
            justify-between
            mb-5
          ">

            <h2 className="
              text-2xl
              font-bold
              text-green-400
            ">
              Completed Pipelines
            </h2>

            <span className="
              text-sm
              text-gray-400
            ">
              {dashboard?.completed?.length || 0} jobs
            </span>

          </div>

          <PipelineFeed
            jobs={dashboard?.completed || []}
            type="completed"
            onSelectJob={onSelectJob}
          />

        </section>

        {/* FAILED */}
        <section
          className="
            bg-[#0f172a]
            border
            border-red-900/40
            rounded-2xl
            p-6
          "
        >

          <div className="
            flex
            items-center
            justify-between
            mb-5
          ">

            <h2 className="
              text-2xl
              font-bold
              text-red-400
            ">
              Failed Pipelines
            </h2>

            <span className="
              text-sm
              text-gray-400
            ">
              {dashboard?.failed?.length || 0} jobs
            </span>

          </div>

          <PipelineFeed
            jobs={dashboard?.failed || []}
            type="failed"
            onSelectJob={onSelectJob}
          />

        </section>

      </div>

      {/* WORKER SIDEBAR */}
      <div
        className="
          space-y-6
          h-[calc(100vh-140px)]
        "
      >

        <WorkerPanel />

      </div>

    </motion.div>
  );
}