const express = require('express');
const router = express.Router();
const { getWorkerStats } = require('../services/workers');

router.get('/', (req, res) => {
  res.json(getWorkerStats());
});

module.exports = router;
