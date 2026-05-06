import React from 'react';

import {
  Activity,
  LayoutDashboard,
  GitBranch,
  Terminal,
  Server,
  Box,
  BarChart3,
  Rocket
} from 'lucide-react';

import {
  NavLink
} from 'react-router-dom';

import {
  motion
} from 'framer-motion';

const navItems = [

  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    path: '/'
  },

  {
    icon: GitBranch,
    label: 'Pipelines',
    path: '/pipelines'
  },

  {
    icon: Server,
    label: 'Workers',
    path: '/workers'
  },

  {
    icon: Activity,
    label: 'Runtime',
    path: '/runtime'
  },

  {
    icon: BarChart3,
    label: 'Analytics',
    path: '/analytics'
  },

  {
    icon: Rocket,
    label: 'Deployments',
    path: '/deployments'
  },

  {
    icon: Box,
    label: 'Logs',
    path: '/logs'
  }

];

export default function Sidebar() {

  return (

    <aside
      className="
        w-64
        min-w-64
        bg-[#111217]
        border-r
        border-[#2a313c]
        flex
        flex-col
        z-30
        overflow-hidden
      "
    >

      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <div
        className="
          h-16
          flex
          items-center
          px-6
          border-b
          border-[#2a313c]
          bg-[#0f1115]
        "
      >

        <div
          className="
            w-10
            h-10
            rounded-xl
            bg-gradient-to-br
            from-[#66fcf1]
            to-[#45a29e]
            flex
            items-center
            justify-center
            shadow-[0_0_20px_rgba(102,252,241,0.25)]
          "
        >

          <Activity
            className="
              w-5
              h-5
              text-black
            "
          />

        </div>

        <div className="ml-3">

          <h1
            className="
              text-lg
              font-bold
              tracking-wider
              text-[#66fcf1]
            "
          >
            NOVA CI
          </h1>

          <p
            className="
              text-[10px]
              text-[#45a29e]
              uppercase
              tracking-widest
            "
          >
            Pipeline Orchestration
          </p>

        </div>

      </div>

      {/* ================================= */}
      {/* NAVIGATION */}
      {/* ================================= */}

      <div
        className="
          flex-1
          overflow-y-auto
          px-4
          py-6
        "
      >

        <div
          className="
            text-[10px]
            uppercase
            tracking-[0.25em]
            text-[#45a29e]
            mb-5
            px-2
          "
        >
          Navigation
        </div>

        <div className="space-y-2">

          {
            navItems.map((item) => {

              const Icon = item.icon;

              return (

                <NavLink
                  key={item.label}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>

                    `
                      group
                      relative
                      flex
                      items-center
                      px-4
                      py-3
                      rounded-xl
                      transition-all
                      duration-300
                      overflow-hidden

                      ${isActive
                      ? `
                            bg-[#1a1d24]
                            text-[#66fcf1]
                            border
                            border-[#66fcf1]/20
                            shadow-[0_0_20px_rgba(102,252,241,0.08)]
                          `
                      : `
                            text-[#c5c6c7]
                            hover:bg-[#17191f]
                            hover:text-white
                          `
                    }
                    `
                  }
                >

                  {({ isActive }) => (

                    <>

                      {/* ACTIVE BACKGROUND */}
                      {
                        isActive && (

                          <motion.div

                            layoutId="sidebar-active"

                            className="
                              absolute
                              inset-0
                              bg-gradient-to-r
                              from-[#66fcf1]/5
                              to-transparent
                              rounded-xl
                            "

                            transition={{
                              type: 'spring',
                              stiffness: 350,
                              damping: 30
                            }}
                          />
                        )
                      }

                      {/* ICON */}
                      <div
                        className="
                          relative
                          z-10
                          flex
                          items-center
                          justify-center
                          w-9
                          h-9
                          rounded-lg
                          bg-[#111217]
                          border
                          border-[#2a313c]
                          mr-3
                        "
                      >

                        <Icon
                          className={`
                            w-4
                            h-4
                            transition-all

                            ${isActive
                              ? 'text-[#66fcf1]'
                              : 'text-[#45a29e] group-hover:text-[#66fcf1]'
                            }
                          `}
                        />

                      </div>

                      {/* LABEL */}
                      <span
                        className="
                          relative
                          z-10
                          font-medium
                          text-sm
                          tracking-wide
                        "
                      >
                        {item.label}
                      </span>

                      {/* ACTIVE DOT */}
                      {
                        isActive && (

                          <motion.div

                            layoutId="sidebar-dot"

                            className="
                              ml-auto
                              relative
                              z-10
                              w-2
                              h-2
                              rounded-full
                              bg-[#66fcf1]
                              shadow-[0_0_12px_#66fcf1]
                            "
                          />
                        )
                      }

                    </>
                  )}

                </NavLink>
              );
            })
          }

        </div>

      </div>

      {/* ================================= */}
      {/* FOOTER */}
      {/* ================================= */}

      <div
        className="
          p-4
          border-t
          border-[#2a313c]
          bg-[#0f1115]
        "
      >

        <div
          className="
            flex
            items-center
            p-3
            rounded-xl
            bg-[#17191f]
            border
            border-[#2a313c]
          "
        >

          <div
            className="
              w-10
              h-10
              rounded-full
              bg-gradient-to-br
              from-[#66fcf1]
              to-[#45a29e]
              flex
              items-center
              justify-center
              text-black
              font-bold
              shadow-[0_0_15px_rgba(102,252,241,0.25)]
            "
          >
            N
          </div>

          <div className="ml-3">

            <div
              className="
                text-sm
                font-semibold
                text-white
              "
            >
              Nova Engine
            </div>

            <div
              className="
                text-xs
                text-[#45a29e]
              "
            >
              Realtime CI Runtime
            </div>

          </div>

        </div>

      </div>

    </aside>
  );
}