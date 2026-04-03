const express = require('express');
const cors = require('cors');
const http = require('http'); // HTTP server for socket.io
const jobRoutes = require('./routes/jobs');
const workerRoutes = require('./routes/workers');
const { init } = require('./websocket/socket'); // Socket entry

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Main Job Controller Routes
app.use('/api/jobs', jobRoutes);

// Workers Endpoint
app.use('/api/workers', workerRoutes);

// Base route for sanity ping
app.get('/', (req, res) => {
  res.send('Jenkins Master (Controller) Backend Running');
});

// Attach Socket.IO to the server instance
init(server);

// Start the server
server.listen(PORT, () => {
  console.log(`Jenkins Master orchestrator listening on port ${PORT}`);
});
