const express = require('express');
const router = express.Router();
const { createProject, getProjects, getProjectById, getProjectJobs } = require('../projects/projectController');
const { verifyToken } = require('../auth/authController');

// Optional auth, we can use verifyToken middleware for createProject
router.post('/', createProject);
router.get('/', getProjects);
router.get('/:id', getProjectById);
router.get('/:id/jobs', getProjectJobs);

module.exports = router;
