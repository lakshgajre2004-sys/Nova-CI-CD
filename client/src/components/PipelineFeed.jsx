import React from 'react';
import PipelineCard from './PipelineCard';

export default function PipelineFeed({
  jobs = [],
  type = 'queued',
  onSelectJob
}) {

  const priorityWeight = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  };

  const getPriorityLabel = (job) => {

    const branch =
      (job.branch || '')
        .toLowerCase();

    if (
      branch.includes('hotfix')
    ) {
      return 'CRITICAL';
    }

    if (
      branch === 'main'
    ) {
      return 'HIGH';
    }

    if (
      branch.includes('feature')
    ) {
      return 'MEDIUM';
    }

    return 'LOW';
  };

  /*
  ========================================
  SORT BY PRIORITY + NEWEST
  ========================================
  */

  const sortedJobs =
    [...jobs].sort((a, b) => {

      const aPriority =
        priorityWeight[
        getPriorityLabel(a)
        ];

      const bPriority =
        priorityWeight[
        getPriorityLabel(b)
        ];

      /*
      ========================================
      PRIORITY FIRST
      ========================================
      */

      if (
        bPriority !== aPriority
      ) {

        return (
          bPriority -
          aPriority
        );
      }

      /*
      ========================================
      SAME PRIORITY → NEWEST FIRST
      ========================================
      */

      return (
        new Date(
          b.createdAt
        ) -
        new Date(
          a.createdAt
        )
      );
    });

  /*
  ========================================
  EMPTY STATE
  ========================================
  */

  if (
    sortedJobs.length === 0
  ) {

    return (

      <div
        className="
          border
          border-[#2a313c]
          rounded-xl
          p-8
          text-center
          text-[#45a29e]
          opacity-60
          bg-[#111827]
        "
      >

        <div className="text-4xl mb-3">
          ⚡
        </div>

        <p className="text-sm">
          No {type} pipelines available
        </p>

      </div>
    );
  }

  /*
  ========================================
  PIPELINE LIST
  ========================================
  */

  return (

    <div
      className="
        space-y-4
      "
    >

      {sortedJobs.map(job => (

        <PipelineCard
          key={job.id}
          job={job}
          onClick={() =>
            onSelectJob?.(job.id)
          }
        />

      ))}

    </div>
  );
}