/**
 * Example 2: Multi-Agent Swarm Orchestration
 *
 * Demonstrates creating a hierarchical task graph with dependencies
 * and delegating work across specialized worker agents.
 */

import { TaskGraphEngine } from "../src/orchestration/task-graph.js";
import { createTestDb } from "../src/__tests__/mocks.js";

async function main() {
  console.log("Initializing Swarm Task Graph...");
  const db = createTestDb();
  const graph = new TaskGraphEngine(db.raw);

  // 1. Create a root goal
  const goal = graph.createGoal({
    title: "Build and Deploy Decentralized API Service",
    description: "Multi-agent swarm goal to research, implement, and verify an API service.",
  });
  console.log(`Created Goal: ${goal.id} — "${goal.title}"`);

  // 2. Add dependent tasks
  const researchTask = graph.createTask({
    goalId: goal.id,
    title: "1. Research API Schema & Dependencies",
    description: "Analyze endpoint requirements and security policies.",
    agentRole: "researcher",
    priority: 80,
  });

  const codingTask = graph.createTask({
    goalId: goal.id,
    title: "2. Implement Core Server Endpoints",
    description: "Write TypeScript HTTP handlers and SQLite models.",
    agentRole: "developer",
    priority: 70,
    dependencies: [researchTask.id],
  });

  const reviewTask = graph.createTask({
    goalId: goal.id,
    title: "3. Run Security Audit and Test Suite",
    description: "Verify injection defenses, policy rules, and rate limits.",
    agentRole: "auditor",
    priority: 60,
    dependencies: [codingTask.id],
  });

  // 3. Inspect ready tasks (only researchTask is unblocked initially)
  const readyTasks = graph.getReadyTasks(goal.id);
  console.log(`\nReady for execution (${readyTasks.length}):`);
  for (const t of readyTasks) {
    console.log(`• [${t.agentRole}] ${t.title}`);
  }

  // 4. Simulate completing task 1 -> task 2 becomes ready
  console.log("\nCompleting Task 1...");
  graph.updateTaskStatus(researchTask.id, "completed", "Schema research complete.");

  const nextReady = graph.getReadyTasks(goal.id);
  console.log(`Next ready tasks (${nextReady.length}):`);
  for (const t of nextReady) {
    console.log(`• [${t.agentRole}] ${t.title}`);
  }
}

main().catch(console.error);
