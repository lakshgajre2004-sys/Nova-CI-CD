import React, {
  useState,
  useEffect
} from 'react';

import axios from 'axios';

import { io } from 'socket.io-client';

import {
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';

import { AnimatePresence } from 'framer-motion';

import { Toaster } from 'react-hot-toast';

import { BASE_URL } from './config/api';

import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import LiveLogTerminal from './components/LiveLogTerminal';

import Dashboard from './pages/Dashboard';
import Pipelines from './pages/Pipelines';
import Workers from './pages/Workers';
import Runtime from './pages/Runtime';
import Analytics from './pages/Analytics';
import Deployments from './pages/Deployments';
import Logs from './pages/Logs';

export default function App() {

  const [dashboard, setDashboard] =
    useState({
      queued: [],
      inProgress: [],
      completed: [],
      failed: []
    });

  const [selectedJobId, setSelectedJobId] =
    useState(null);

  const [socket, setSocket] =
    useState(null);

  const location =
    useLocation();

  /*
  ========================================
  FETCH DASHBOARD
  ========================================
  */

  const fetchDashboard =
    async () => {

      try {

        const res =
          await axios.get(
            `${BASE_URL}/api/jobs/dashboard`
          );

        const data =
          res.data;

        /*
        ========================================
        SAFE STATE UPDATE
        ========================================
        */

        setDashboard({

          queued:
            data.queued || [],

          inProgress:
            data.inProgress || [],

          completed:
            data.completed || [],

          failed:
            data.failed || []

        });

      } catch (err) {

        console.error(
          'Dashboard fetch failed:',
          err
        );
      }
    };

  /*
  ========================================
  SOCKET + LIVE REFRESH
  ========================================
  */

  useEffect(() => {

    fetchDashboard();

    const newSocket =
      io(BASE_URL);

    setSocket(newSocket);

    /*
    ========================================
    LIVE JOB UPDATE
    ========================================
    */

    const updateUI =
      () => {

        fetchDashboard();
      };

    newSocket.on(
      'job_update',
      updateUI
    );

    /*
    ========================================
    CLEANUP
    ========================================
    */

    return () => {

      newSocket.off(
        'job_update',
        updateUI
      );

      newSocket.disconnect();
    };

  }, []);

  /*
  ========================================
  APP LAYOUT
  ========================================
  */

  return (

    <div
      className="
        flex
        h-screen
        overflow-hidden
        bg-[#0b0c10]
        text-[#c5c6c7]
      "
    >

      <Toaster
        position="top-right"
      />

      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN AREA */}
      <div
        className="
          flex
          flex-col
          flex-1
          overflow-hidden
        "
      >

        {/* TOP NAV */}
        <TopNav
          onTrigger={fetchDashboard}
        />

        {/* PAGE CONTENT */}
        <main
          className="
            flex-1
            overflow-y-auto
            p-6
          "
        >

          <AnimatePresence
            mode="wait"
          >

            <Routes
              location={location}
              key={location.pathname}
            >

              {/* DASHBOARD */}
              <Route
                path="/"
                element={
                  <Dashboard
                    dashboard={dashboard}
                    onSelectJob={
                      setSelectedJobId
                    }
                  />
                }
              />

              {/* PIPELINES */}
              <Route
                path="/pipelines"
                element={
                  <Pipelines
                    dashboard={dashboard}
                    onSelectJob={
                      setSelectedJobId
                    }
                  />
                }
              />

              {/* WORKERS */}
              <Route
                path="/workers"
                element={<Workers />}
              />

              {/* RUNTIME */}
              <Route
                path="/runtime"
                element={<Runtime />}
              />

              {/* ANALYTICS */}
              <Route
                path="/analytics"
                element={<Analytics />}
              />

              {/* DEPLOYMENTS */}
              <Route
                path="/deployments"
                element={<Deployments />}
              />

              {/* LOGS */}
              <Route
                path="/logs"
                element={<Logs />}
              />

              {/* FALLBACK */}
              <Route
                path="*"
                element={
                  <Navigate
                    to="/"
                    replace
                  />
                }
              />

            </Routes>

          </AnimatePresence>

        </main>

      </div>

      {/* LIVE TERMINAL */}
      {

        selectedJobId && (

          <LiveLogTerminal
            jobId={selectedJobId}
            socket={socket}
            onClose={() =>
              setSelectedJobId(null)
            }
          />

        )

      }

    </div>
  );
}