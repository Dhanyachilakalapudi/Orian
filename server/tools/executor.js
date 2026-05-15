// ============================================
// Workflow Executor - Main Orchestration Logic
// ============================================
// Purpose: Orchestrate the entire autonomous agent workflow

const { runPlanner, getExecutionOrder, getSubtask } = require('../agents/planner');
const { routeTask } = require('../agents/router');
const { runWebAgent } = require('../agents/webAgent');
const { runFileAgent, createMarkdownReport } = require('../agents/fileAgent');
const { runCodeAgent } = require('../agents/codeAgent');
const { runCritic, isApproved } = require('../agents/critic');
const { runSummarizer } = require('../agents/summarizer');
const { updateGoalStatus, addTaskLog } = require('../db/sqlite');
const { emitTaskUpdate, emitTaskComplete, emitError } = require('../sockets/socket');

/**
 * Execute the complete autonomous workflow for a goal
 * @param {string} goalId - Unique goal ID
 * @param {Object} goalData - Goal data {goal, description}
 * @param {Object} io - Socket.io instance
 * @returns {Promise<Object>} - Final result and report
 */
async function executeGoal(goalId, goalData, io) {
  const startTime = Date.now();

  try {
    console.log(`\n========== EXECUTING GOAL: ${goalId} ==========`);
    console.log(`Goal: "${goalData.goal}"\n`);

    // Update status
    await updateGoalStatus(goalId, 'running');

    // Emit initial update
    emitTaskUpdate(io, goalId, {
      stage: 'initialization',
      message: 'Starting autonomous workflow',
      progress: 0,
    });

    // ============================================
    // PHASE 1: PLANNING
    // ============================================
    console.log('\n>>> PHASE 1: PLANNING');
    emitTaskUpdate(io, goalId, {
      stage: 'planning',
      message: 'Planner analyzing goal and creating plan',
      progress: 10,
    });

    const plan = await runPlanner(goalId, goalData.goal, goalData.description, io);

    console.log(`✓ Plan created with ${plan.subtasks.length} subtasks`);
    console.log(`✓ Estimated time: ${plan.total_estimated_time_minutes} minutes`);

    emitTaskUpdate(io, goalId, {
      stage: 'planning_complete',
      message: `Plan ready: ${plan.subtasks.length} subtasks`,
      progress: 15,
      plan,
    });

    // ============================================
    // PHASE 2: ROUTING
    // ============================================
    console.log('\n>>> PHASE 2: ROUTING');
    emitTaskUpdate(io, goalId, {
      stage: 'routing',
      message: 'Router assigning tasks to specialist agents',
      progress: 20,
    });

    const routingDecisions = [];
    for (const task of plan.subtasks) {
      const decision = await routeTask(goalId, task, io);
      routingDecisions.push(decision);
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`✓ All ${routingDecisions.length} tasks routed`);

    // Get execution order
    const executionOrder = getExecutionOrder(plan);
    console.log(`✓ Execution order determined: ${executionOrder.length} batches`);

    emitTaskUpdate(io, goalId, {
      stage: 'routing_complete',
      message: `Tasks routed to ${new Set(routingDecisions.map((r) => r.assignedAgent)).size} agents`,
      progress: 25,
      routing: routingDecisions,
    });

    // ============================================
    // PHASE 3: EXECUTION
    // ============================================
    console.log('\n>>> PHASE 3: EXECUTION');

    const results = {
      web_searches: [],
      generated_files: [],
      code_executions: [],
      analyses: [],
    };

    let completedTasks = 0;
    const totalTasks = plan.subtasks.length;

    // Execute tasks in order respecting dependencies
    for (let batchIndex = 0; batchIndex < executionOrder.length; batchIndex++) {
      const batchIds = executionOrder[batchIndex];

      console.log(`\nBatch ${batchIndex + 1}/${executionOrder.length}: ${batchIds.length} tasks`);

      // Execute tasks sequentially to avoid rate limits
      const batchResults = [];
      for (const taskId of batchIds) {
          const task = getSubtask(plan, taskId);
          const routing = routingDecisions.find((r) => r.taskId === taskId);

          if (!task || !routing) {
            throw new Error(`Task ${taskId} not found in plan or routing`);
          }

          console.log(`  → Task ${taskId}: ${task.task} [${routing.assignedAgent}]`);

          const progress = 25 + (completedTasks / totalTasks) * 50;
          emitTaskUpdate(io, goalId, {
            stage: 'execution_in_progress',
            message: `Executing task: ${task.task}`,
            progress,
            currentTask: taskId,
          });

          const result = await executeTask(goalId, task, routing, io);
          completedTasks++;
          batchResults.push({ taskId, task: task.task, agent: routing.assignedAgent, result });

          await new Promise(r => setTimeout(r, 1000));
      }

      // Store results by agent type
      batchResults.forEach((batchResult) => {
        const { agent, result } = batchResult;

        if (agent === 'web_search') {
          results.web_searches.push(result);
        } else if (agent === 'file_generation') {
          results.generated_files.push(result);
        } else if (agent === 'code_execution') {
          results.code_executions.push(result);
        } else if (agent === 'analysis') {
          results.analyses.push(result);
        }
      });

      console.log(`✓ Batch ${batchIndex + 1} complete`);
    }

    console.log(`\n✓ All tasks executed`);

    emitTaskUpdate(io, goalId, {
      stage: 'execution_complete',
      message: 'All tasks completed',
      progress: 75,
      results,
    });

    // ============================================
    // PHASE 4: SYNTHESIS & REPORTING
    // ============================================
    console.log('\n>>> PHASE 4: SYNTHESIS & REPORTING');
    emitTaskUpdate(io, goalId, {
      stage: 'synthesis',
      message: 'Synthesizing results into report',
      progress: 80,
    });

    // Combine all findings
    const allFindings = [
      ...results.web_searches,
      ...results.analyses,
    ];

    const synthesisContent = formatSynthesis(goalData.goal, allFindings, results);

    // Generate report file
    console.log('Generating final report...');

    const reportFile = await createMarkdownReport(goalId, {
      title: `Report: ${goalData.goal}`,
      sections: [
        {
          title: 'Executive Summary',
          content: synthesisContent.summary,
        },
        {
          title: 'Findings',
          content: synthesisContent.findings,
        },
        {
          title: 'Generated Artifacts',
          content: synthesisContent.artifacts,
        },
        {
          title: 'Execution Summary',
          content: synthesisContent.execution,
        },
      ],
      metadata: {
        createdAt: new Date().toISOString(),
        summary: synthesisContent.summary,
      },
    }, io);

    console.log(`✓ Report generated: ${reportFile.filename}`);

    emitTaskUpdate(io, goalId, {
      stage: 'report_generated',
      message: 'Final report generated',
      progress: 85,
      report: reportFile,
    });

    // ============================================
    // PHASE 5: QUALITY REVIEW (OPTIONAL)
    // ============================================
    console.log('\n>>> PHASE 5: QUALITY REVIEW');
    emitTaskUpdate(io, goalId, {
      stage: 'quality_review',
      message: 'Critic reviewing output quality',
      progress: 90,
    });

    const criticAssessment = await runCritic(
      goalId,
      synthesisContent.summary,
      goalData.goal,
      io
    );

    console.log(`✓ Quality assessment: ${criticAssessment.status}`);
    console.log(`✓ Quality score: ${criticAssessment.score}`);

    emitTaskUpdate(io, goalId, {
      stage: 'quality_complete',
      message: `Quality assessment: ${criticAssessment.status}`,
      progress: 92,
      assessment: criticAssessment,
    });

    // ============================================
    // PHASE 6: SUMMARIZATION
    // ============================================
    console.log('\n>>> PHASE 6: SUMMARIZATION');
    emitTaskUpdate(io, goalId, {
      stage: 'summarization',
      message: 'Creating executive summary',
      progress: 95,
    });

    const summary = await runSummarizer(goalId, synthesisContent.summary, {
      focus: 'key findings and actionable insights',
    }, io);

    console.log(`✓ Summary created (${summary.keyPoints.length} key points)`);

    // ============================================
    // FINAL RESULT
    // ============================================
    console.log('\n>>> FINALIZING');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    const finalResult = {
      goalId,
      goal: goalData.goal,
      status: 'completed',
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
      phases: {
        planning: true,
        routing: true,
        execution: true,
        synthesis: true,
        review: criticAssessment.status,
        summarization: true,
      },
      results: {
        searchCount: results.web_searches.length,
        filesGenerated: results.generated_files.length,
        codeExecutions: results.code_executions.length,
        analyses: results.analyses.length,
      },
      quality: {
        score: criticAssessment.score,
        status: criticAssessment.status,
        approved: isApproved(criticAssessment),
      },
      summary: {
        main: summary.summary,
        keyPoints: summary.keyPoints,
        highlights: summary.highlights,
      },
      report: reportFile,
    };

    // Save final result to database
    await updateGoalStatus(goalId, 'completed', finalResult);

    // Log completion
    await addTaskLog(goalId, 'execution_complete', 'Goal execution completed successfully', {
      duration,
      quality: finalResult.quality.score,
    });

    console.log(`\n✓ Goal execution complete in ${duration}s`);
    console.log(`✓ Quality score: ${finalResult.quality.score}`);
    console.log(`\n========== GOAL COMPLETED ==========\n`);

    // Emit final completion
    emitTaskComplete(io, goalId, finalResult);

    return finalResult;
  } catch (error) {
    console.error(`\n✗ Goal execution failed: ${error.message}`);
    console.error(error.stack);

    // Update status to failed
    await updateGoalStatus(goalId, 'failed', {
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    // Log error
    await addTaskLog(goalId, 'execution_error', `Goal failed: ${error.message}`);

    // Emit error
    emitError(io, goalId, error.message, {
      stack: error.stack,
    });

    throw error;
  }
}

/**
 * Execute a single task
 * @param {string} goalId - Goal ID
 * @param {Object} task - Task from plan
 * @param {Object} routing - Routing decision
 * @param {Object} io - Socket.io instance
 * @returns {Promise<Object>} - Task result
 */
async function executeTask(goalId, task, routing, io) {
  const agent = routing.assignedAgent;
  const parameters = routing.parameters || {};

  try {
    console.log(`    Executing with ${agent}...`);

    switch (agent) {
      case 'web_search':
        return await runWebAgent(
          goalId,
          parameters.query || task.task,
          { maxResults: parameters.maxResults || 5 },
          io
        );

      case 'file_generation':
        return await runFileAgent(
          goalId,
          parameters.content || task.task,
          {
            filename: parameters.filename || 'output.md',
            format: parameters.format || 'markdown',
          },
          io
        );

      case 'code_execution':
        return await runCodeAgent(
          goalId,
          parameters.task || task.task,
          {
            language: parameters.language || 'javascript',
            execute: true,
          },
          io
        );

      case 'analysis':
        // For analysis, use web search to gather data then synthesize
        return await runWebAgent(
          goalId,
          parameters.query || task.task,
          { maxResults: 10 },
          io
        );

      default:
        throw new Error(`Unknown agent: ${agent}`);
    }
  } catch (error) {
    console.error(`    ✗ Task execution failed: ${error.message}`);
    throw error;
  }
}

/**
 * Format synthesis from all findings
 * @param {string} goal - Original goal
 * @param {Array<Object>} findings - All findings from agents
 * @param {Object} results - Results object
 * @returns {Object} - Formatted content
 */
function formatSynthesis(goal, findings, results) {
  let summary = `## Overview\n\nThis report summarizes findings related to: "${goal}"\n\n`;

  if (findings.length > 0) {
    summary += '### Key Findings\n';
    findings.forEach((finding, i) => {
      if (finding.synthesis?.summary) {
        summary += `${i + 1}. ${finding.synthesis.summary}\n\n`;
      }
    });
  }

  let findingsContent = '### Detailed Findings\n';
  findings.forEach((finding) => {
    if (finding.query) {
      findingsContent += `\n#### ${finding.query}\n`;
    }
    if (finding.sources) {
      findingsContent += `**Sources:** ${finding.sources.length} sources found\n`;
    }
  });

  let artifactsContent = '### Generated Artifacts\n';
  if (results.generated_files.length > 0) {
    artifactsContent += '\n**Files:**\n';
    results.generated_files.forEach((file) => {
      artifactsContent += `\n#### ${file.filename}\n\`\`\`\n${file.content || ''}\n\`\`\`\n`;
    });
  }
  if (results.code_executions.length > 0) {
    artifactsContent += '\n**Code:**\n';
    results.code_executions.forEach((code) => {
      artifactsContent += `\n#### ${code.description || 'code'} (${code.language})\n\`\`\`${code.language}\n${code.code || ''}\n\`\`\`\n`;
    });
  }

  const executionContent = `### Execution Summary
- Total tasks executed: ${(results.generated_files.length + results.code_executions.length + results.web_searches.length)}
- Web searches: ${results.web_searches.length}
- Files generated: ${results.generated_files.length}
- Code executions: ${results.code_executions.length}
- Analyses: ${results.analyses.length}`;

  return {
    summary,
    findings: findingsContent,
    artifacts: artifactsContent,
    execution: executionContent,
  };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  executeGoal,
  executeTask,
  formatSynthesis,
};