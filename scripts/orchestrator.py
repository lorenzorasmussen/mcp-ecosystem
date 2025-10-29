#!/usr/bin/env python3
"""
OpenCode Orchestrator Engine
Spawns and coordinates multiple child agents with summary aggregation
"""

import json
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

@dataclass
class AgentTask:
    """Represents a task assigned to an agent"""
    agent_name: str
    objective: str
    deliverables: List[str]
    dependencies: List[str]
    status: str = "pending"  # pending, spawned, in_progress, complete, blocked
    session_id: Optional[str] = None
    summary: Optional[str] = None
    
@dataclass
class OrchestratorSession:
    """Orchestrator session state"""
    session_id: str
    project_name: str
    timestamp: str
    tasks: List[AgentTask]
    phase: str
    status: str

class OpenCodeOrchestrator:
    """Multi-agent orchestration with OpenCode's native agent spawning"""
    
    def __init__(self, project_request: str):
        self.project_request = project_request
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.orchestration_dir = Path.home() / f".orchestration/{self.session_id}"
        self.orchestration_dir.mkdir(parents=True, exist_ok=True)
        
        self.session = OrchestratorSession(
            session_id=self.session_id,
            project_name=project_request[:50],
            timestamp=datetime.now().isoformat(),
            tasks=[],
            phase="initialization",
            status="active"
        )
    
    def analyze_and_plan(self):
        """Analyze project and create task breakdown"""
        
        print("🎯 Orchestrator: Analyzing Project")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"Project: {self.project_request}")
        print()
        
        # Create task plan based on project
        tasks = self._generate_task_plan()
        
        self.session.tasks = tasks
        self._save_session()
        
        print(f"📋 Created {len(tasks)} agent tasks")
        print()
        
        return tasks
    
    def _generate_task_plan(self) -> List[AgentTask]:
        """Generate agent tasks based on project request"""
        
        request_lower = self.project_request.lower()
        tasks = []
        
        # Phase 1: Planning & Research (parallel)
        tasks.append(AgentTask(
            agent_name="planner",
            objective=f"Create detailed project breakdown for: {self.project_request}",
            deliverables=[
                "Work breakdown structure (WBS)",
                "Task dependencies map",
                "Sprint plan",
                "Risk assessment"
            ],
            dependencies=[]
        ))
        
        tasks.append(AgentTask(
            agent_name="researcher",
            objective=f"Research best practices and technologies for: {self.project_request}",
            deliverables=[
                "Technology recommendations",
                "Best practices guide",
                "Security considerations",
                "Example implementations"
            ],
            dependencies=[]
        ))
        
        # Phase 2: Architecture (depends on planning)
        tasks.append(AgentTask(
            agent_name="architect",
            objective=f"Design system architecture for: {self.project_request}",
            deliverables=[
                "Architecture diagram",
                "Data models",
                "API specifications",
                "Technology stack decisions"
            ],
            dependencies=["planner", "researcher"]
        ))
        
        # Phase 3: Implementation (depends on architecture)
        tasks.append(AgentTask(
            agent_name="builder",
            objective=f"Implement core functionality for: {self.project_request}",
            deliverables=[
                "Source code",
                "Database migrations",
                "Configuration files"
            ],
            dependencies=["architect"]
        ))
        
        # Phase 4: Quality Assurance (parallel, depends on implementation)
        tasks.append(AgentTask(
            agent_name="tester",
            objective="Write comprehensive test suite",
            deliverables=[
                "Unit tests",
                "Integration tests",
                "Test coverage report"
            ],
            dependencies=["builder"]
        ))
        
        if any(keyword in request_lower for keyword in ["auth", "security", "jwt"]):
            tasks.append(AgentTask(
                agent_name="security",
                objective="Perform security audit and vulnerability scan",
                deliverables=[
                    "Security audit report",
                    "Vulnerability scan results",
                    "Remediation recommendations"
                ],
                dependencies=["builder"]
            ))
        
        tasks.append(AgentTask(
            agent_name="documentation",
            objective="Create comprehensive documentation",
            deliverables=[
                "API documentation",
                "User guide",
                "Developer setup instructions",
                "Architecture documentation"
            ],
            dependencies=["builder"]
        ))
        
        return tasks
    
    def spawn_agents(self, phase: str = "all"):
        """Spawn agents for current phase"""
        
        # Get tasks for current phase based on dependencies
        ready_tasks = self._get_ready_tasks()
        
        if not ready_tasks:
            print("⏸  No tasks ready to spawn (waiting on dependencies)")
            return
        
        print(f"🚀 Spawning {len(ready_tasks)} agent(s) for parallel execution")
        print()
        
        for task in ready_tasks:
            self._spawn_agent(task)
        
        # Monitor and wait for completion
        self._monitor_agents(ready_tasks)
    
    def _get_ready_tasks(self) -> List[AgentTask]:
        """Get tasks that are ready to execute (dependencies met)"""
        
        ready = []
        completed_agents = [t.agent_name for t in self.session.tasks if t.status == "complete"]
        
        for task in self.session.tasks:
            if task.status == "pending":
                # Check if all dependencies are complete
                deps_met = all(dep in completed_agents for dep in task.dependencies)
                if deps_met:
                    ready.append(task)
        
        return ready
    
    def _spawn_agent(self, task: AgentTask):
        """Spawn a child agent in new session"""
        
        print(f"🤖 Spawning @{task.agent_name}")
        print(f"   Objective: {task.objective}")
        print(f"   Deliverables: {len(task.deliverables)} items")
        print()
        
        # Create agent prompt with orchestrator protocol
        agent_prompt = f"""
{task.objective}

**Expected Deliverables:**
{chr(10).join(f'- {d}' for d in task.deliverables)}

**Important:** When you complete your work, provide a summary in the parent orchestrator session using this format:

## Agent Summary: {task.agent_name}
**Status:** ✅ Complete

### Tasks Completed
[List what you accomplished]

### Key Deliverables
[Paths to files you created]

### Decisions Made
[Important choices you made]

### Recommendations
[Next steps or suggestions]

Working directory: {self.orchestration_dir / task.agent_name}
"""
        
        # Save task context
        task_dir = self.orchestration_dir / task.agent_name
        task_dir.mkdir(exist_ok=True)
        
        (task_dir / "task.md").write_text(agent_prompt)
        
        # In OpenCode, spawning happens via @mention in chat
        # This script simulates it and provides the command
        print(f"   💬 To spawn in OpenCode:")
        print(f"      @{task.agent_name} {task.objective[:60]}...")
        print()
        
        task.status = "spawned"
        task.session_id = f"{self.session_id}_{task.agent_name}"
        self._save_session()
    
    def _monitor_agents(self, tasks: List[AgentTask]):
        """Monitor spawned agents (placeholder for actual implementation)"""
        
        print("📊 Monitoring Agent Progress")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print()
        print("Active child sessions:")
        for task in tasks:
            print(f"   🔵 @{task.agent_name} - {task.status}")
        print()
        print("💡 Use Ctrl+Right/Left to navigate between sessions")
        print("💡 Request summaries when agents complete their work")
        print()
    
    def aggregate_summaries(self):
        """Aggregate all agent summaries into master report"""
        
        print("📊 Aggregating Agent Summaries")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print()
        
        completed_tasks = [t for t in self.session.tasks if t.status == "complete"]
        
        report = f"""
# Project Orchestration Report

**Project:** {self.project_request}
**Session ID:** {self.session_id}
**Date:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

## Executive Summary

Total Agents: {len(self.session.tasks)}
Completed: {len(completed_tasks)}
Status: {self.session.status}

## Agent Summaries

"""
        
        for task in completed_tasks:
            report += f"""
### {task.agent_name.title()}

**Objective:** {task.objective}

**Deliverables:**
{chr(10).join(f'- {d}' for d in task.deliverables)}

**Summary:**
{task.summary or 'Pending summary from agent'}

---

"""
        
        # Save master report
        report_file = self.orchestration_dir / "orchestration_report.md"
        report_file.write_text(report)
        
        print(f"✅ Master report created: {report_file}")
        print()
        
        return report
    
    def _save_session(self):
        """Save orchestration session state"""
        
        session_file = self.orchestration_dir / "session.json"
        with open(session_file, 'w') as f:
            json.dump(asdict(self.session), f, indent=2)

# CLI interface
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: orchestrator.py '<project request>'")
        sys.exit(1)
    
    project_request = sys.argv[1]
    
    orchestrator = OpenCodeOrchestrator(project_request)
    
    # Execute orchestration
    orchestrator.analyze_and_plan()
    orchestrator.spawn_agents()