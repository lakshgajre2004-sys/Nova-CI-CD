# 🚀 Nova CI/CD

A **simulated Jenkins CI/CD system** built with Node.js that mimics real-world pipeline execution using scheduling, worker simulation, and real-time monitoring.

---

## 🎯 Features

* 🔁 Job Triggering via API (Webhook Simulation)
* ⚙️ Jenkins Master (Controller Backend)
* 📊 Job Scheduler with Priority Queue
* 🧩 Pipeline Manager (Stage Execution)
* 👷 Worker Simulation (Node / Python / General)
* 🔄 Parallel Job Execution
* 📡 Real-time Updates using WebSockets
* 📈 Load & Delay Simulation

---

## 🏗️ Architecture

```text
Webhook/API → Scheduler → Worker → Pipeline → Dashboard
```

---

## ⚙️ Tech Stack

* Node.js (Express)
* Socket.IO
* React (Frontend)
* Tailwind CSS

---

## ▶️ How to Run

### Backend

```bash
npm install
node server.js
```

Runs on:
http://localhost:4000

---

### Frontend

```bash
cd client
npm install
npm run dev
```

Runs on:
http://localhost:5173

---

## 🧪 API Endpoints

### Trigger Job

POST /api/jobs/trigger

```json
{
  "repo": "repo1",
  "branch": "main"
}
```

---

### Dashboard

GET /api/jobs/dashboard

---

## 🧠 Key Concepts Implemented

* CI/CD Pipeline Simulation
* Job Scheduling & Priority Handling
* Worker-based Execution Model
* Load Simulation
* Real-time Event Streaming

---

## 🏁 Conclusion

Nova CI/CD simulates a real Jenkins-like system with scalable architecture, parallel execution, and observability.

Webhook test
