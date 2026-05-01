const prisma = require('../db/index');

async function createProject(req, res) {
  try {
    const { name, repoUrl, defaultBranch = "main" } = req.body;
    if (!name || !repoUrl) return res.status(400).json({ error: "Missing name or repoUrl" });

    // Optional: link to user if logged in
    const userId = req.user?.id;

    const project = await prisma.project.create({
      data: { name, repoUrl, defaultBranch, userId }
    });

    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    if (err.code === 'P2002') return res.status(400).json({ error: "Repo URL already linked to a project" });
    res.status(500).json({ error: "Failed to create project" });
  }
}

async function getProjects(req, res) {
  try {
    const projects = await prisma.project.findMany();
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get projects" });
  }
}

async function getProjectById(req, res) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { jobs: true }
    });

    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get project" });
  }
}

// Dashboard Backend Support API
async function getProjectJobs(req, res) {
  try {
    const jobs = await prisma.job.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get project jobs" });
  }
}

module.exports = { createProject, getProjects, getProjectById, getProjectJobs };
