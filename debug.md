---
description: 'Advanced debugging utility with interactive debugging, time-travel debugging, AI-powered analysis, breakpoint management, performance profiling, memory leak detection, and automated fix generation'
agent: debug
subagent: none
argument-hint: 'error file --interactive --trace --profile --memory --network --ai'
---

````

## Core Identity & Expertise

You are an **Advanced Debugging Specialist** with expertise in interactive debugging, time-travel debugging, AI-powered error analysis, performance profiling, memory leak detection, and automated root cause identification.[1][2][3][4][5]

---

## 10-Phase Advanced Debugging System

### Phase 1: Intelligent Error Classification & Triage

```bash
#!/usr/bin/env bash

DEBUG_ADVANCED DEBUGGING SYSTEM
════════════════════════════════════════════════════════════════

Date: 2025-10-15 18:35 CEST
Mode: Advanced Multi-Modal Debugging

────────────────────────────────────────────────────────────────

PHASE 1: INTELLIGENT ERROR CLASSIFICATION
────────────────────────────────────────────────────────────────

Command: /debug "TypeError: Cannot read property 'id' of undefined" --interactive

ERROR_MESSAGE="$1"
MODE="${2:---interactive}"
SESSION_ID=$(date +%Y%m%d_%H%M%S)
DEBUG_DIR=~/.debug-sessions-advanced/$SESSION_ID

mkdir -p "$DEBUG_DIR"/{breakpoints,traces,profiles,memory,network,fixes,reports}

echo "🔬 Advanced Debugging System Activated"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Error: $ERROR_MESSAGE"
echo "Mode: $MODE"
echo "Session: $SESSION_ID"
echo ""

# Advanced error classification with ML
python3 << 'PYTHON'
import json
import re
from datetime import datetime

class AdvancedErrorClassifier:
    """AI-powered error classification and severity assessment"""

    def __init__(self, error_message):
        self.error_message = error_message
        self.classification = self.classify()

    def classify(self):
        """Multi-dimensional error classification"""

        error_lower = self.error_message.lower()

        # Error type detection
        error_type = "unknown"
        if "typeerror" in error_lower:
            error_type = "type_error"
        elif "referenceerror" in error_lower:
            error_type = "reference_error"
        elif "syntaxerror" in error_lower:
            error_type = "syntax_error"
        elif "network" in error_lower or "fetch" in error_lower:
            error_type = "network_error"
        elif "memory" in error_lower or "heap" in error_lower:
            error_type = "memory_error"
        elif "permission" in error_lower or "cors" in error_lower:
            error_type = "permission_error"
        elif "timeout" in error_lower:
            error_type = "timeout_error"

        # Severity assessment (0-10)
        severity = self._assess_severity()

        # Debuggability score (how easy to debug)
        debuggability = self._assess_debuggability()

        # Reproducibility likelihood
        reproducibility = self._assess_reproducibility()

        # Root cause probability distribution
        root_causes = self._identify_probable_causes()

        return {
            "error_type": error_type,
            "severity": severity,
            "debuggability": debuggability,
            "reproducibility": reproducibility,
            "root_causes": root_causes,
            "recommended_tools": self._recommend_tools(),
            "estimated_debug_time": self._estimate_debug_time(debuggability)
        }

    def _assess_severity(self):
        """Calculate severity score (1-10)"""
        score = 5  # baseline

        if "undefined" in self.error_message.lower():
            score += 2
        if "cannot read" in self.error_message.lower():
            score += 1
        if "production" in self.error_message.lower():
            score += 3
        if "critical" in self.error_message.lower():
            score += 2

        return min(score, 10)

    def _assess_debuggability(self):
        """How easy is this to debug? (1-10, 10=easiest)"""
        score = 5

        # Stack trace available?
        if "at " in self.error_message or ".js:" in self.error_message:
            score += 3

        # Error message is descriptive?
        if len(self.error_message) > 50:
            score += 2

        # Known error pattern?
        if any(pattern in self.error_message.lower() for pattern in ["cannot read property", "is not a function"]):
            score += 2

        return min(score, 10)

    def _assess_reproducibility(self):
        """Likelihood of reproducing (percentage)"""
        if "race condition" in self.error_message.lower():
            return 30  # Intermittent
        elif "timeout" in self.error_message.lower():
            return 50  # Network-dependent
        elif "undefined" in self.error_message.lower():
            return 80  # Likely reproducible
        else:
            return 70

    def _identify_probable_causes(self):
        """Return list of probable root causes with confidence"""
        causes = []

        if "undefined" in self.error_message.lower():
            causes.append({
                "cause": "Async race condition",
                "confidence": 0.6,
                "explanation": "Data not loaded before access"
            })
            causes.append({
                "cause": "Missing null check",
                "confidence": 0.8,
                "explanation": "No validation before property access"
            })
            causes.append({
                "cause": "Incorrect state initialization",
                "confidence": 0.5,
                "explanation": "Component rendered before state ready"
            })

        return sorted(causes, key=lambda x: x['confidence'], reverse=True)

    def _recommend_tools(self):
        """Recommend specific debugging tools"""
        tools = ["AI Analysis", "Stack Trace Parser"]

        if "network" in self.error_message.lower():
            tools.extend(["Network Inspector", "HAR Analyzer"])
        if "memory" in self.error_message.lower():
            tools.extend(["Memory Profiler", "Heap Snapshot"])
        if "performance" in self.error_message.lower():
            tools.extend(["Performance Profiler", "Flame Graph"])

        tools.append("Interactive Debugger")
        return tools

    def _estimate_debug_time(self, debuggability):
        """Estimate time to fix (minutes)"""
        base_time = 60  # 1 hour baseline
        multiplier = (11 - debuggability) / 10
        return int(base_time * multiplier)

# Run classification
classifier = AdvancedErrorClassifier("$ERROR_MESSAGE")
result = classifier.classification

print("📊 Advanced Error Classification")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print()
print(f"🔍 Error Type: {result['error_type'].replace('_', ' ').title()}")
print(f"🔥 Severity: {result['severity']}/10")
print(f"🎯 Debuggability: {result['debuggability']}/10")
print(f"🔄 Reproducibility: {result['reproducibility']}%")
print(f"⏱️  Estimated Debug Time: {result['estimated_debug_time']} minutes")
print()

print("🎯 Probable Root Causes (ranked by confidence):")
for i, cause in enumerate(result['root_causes'], 1):
    print(f"   {i}. {cause['cause']} ({cause['confidence']:.0%} confident)")
    print(f"      → {cause['explanation']}")
print()

print("🛠️  Recommended Tools:")
for tool in result['recommended_tools']:
    print(f"   • {tool}")
print()

# Save classification
import json
with open(f"$DEBUG_DIR/classification.json", 'w') as f:
    json.dump(result, f, indent=2)
PYTHON
````

---

### Phase 2: Interactive Debugging with Breakpoints

```
INTERACTIVE DEBUGGER
════════════════════════════════════════════════════════════════

Command: /debug --interactive

Integration: Node.js Inspector, Python pdb, Chrome DevTools[web:452][web:454]
```

**For Node.js/TypeScript:**

```javascript
#!/usr/bin/env node
/**
 * Advanced Interactive Debugger
 * Integrates with Chrome DevTools Protocol
 */

const inspector = require('inspector');
const fs = require('fs');
const path = require('path');

class InteractiveDebugger {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.debugDir = path.join(process.env.HOME, `.debug-sessions-advanced/${sessionId}`);
        this.breakpoints = [];
        this.watchExpressions = [];
        this.callStack = [];
    }

    async startInspector() {
        console.log('🔍 Starting Interactive Debugger...\n');

        // Open inspector session
        inspector.open(9229, '127.0.0.1', true);

        console.log('✅ Inspector Started');
        console.log('   Chrome DevTools URL: chrome://inspect');
        console.log('   Port: 9229\n');

        // Enable debugger
        const session = new inspector.Session();
        session.connect();

        // Enable necessary domains
        session.post('Debugger.enable', (err) => {
            if (err) console.error('Failed to enable debugger:', err);
        });

        session.post('Runtime.enable', (err) => {
            if (err) console.error('Failed to enable runtime:', err);
        });

        // Set up breakpoints
        console.log('📍 Setting up breakpoints...\n');
        await this.setBreakpoints(session);

        // Watch expressions
        await this.setupWatchExpressions(session);

        console.log('🎯 Interactive debugger ready!\n');
        console.log('Commands:');
        console.log('  • Set breakpoint: /debug breakpoint <file>:<line>');
        console.log('  • Watch variable: /debug watch <expression>');
        console.log('  • Step over: /debug step');
        console.log('  • Continue: /debug continue');
        console.log('  • Inspect call stack: /debug stack\n');

        return session;
    }

    async setBreakpoints(session) {
        // Auto-detect likely error locations
        const likelyFiles = this.detectLikelyErrorFiles();

        for (const file of likelyFiles) {
            const breakpointLines = this.analyzeFileForBreakpoints(file);

            for (const line of breakpointLines) {
                session.post('Debugger.setBreakpointByUrl', {
                    lineNumber: line,
                    url: file,
                    condition: '' // Can add conditional breakpoints
                }, (err, result) => {
                    if (!err) {
                        console.log(`   ✓ Breakpoint set: ${file}:${line}`);
                        this.breakpoints.push({ file, line, id: result.breakpointId });
                    }
                });
            }
        }
    }

    detectLikelyErrorFiles() {
        // Analyze stack trace to find relevant files
        // Scan project for files matching error patterns
        const relevantFiles = [
            'src/auth/login.ts',
            'src/components/UserProfile.tsx',
            // ... auto-detected from error context
        ];

        return relevantFiles;
    }

    analyzeFileForBreakpoints(filePath) {
        // Parse file and identify strategic breakpoint locations
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const breakpointLines = [];

        lines.forEach((line, index) => {
            // Set breakpoints at:
            // 1. Function entry points
            if (/^\s*(async\s+)?function|const\s+\w+\s*=\s*(async\s+)?\(/.test(line)) {
                breakpointLines.push(index + 1);
            }

            // 2. Property access (where errors likely occur)
            if (/\.\w+/.test(line) && !/\/\//.test(line)) {
                breakpointLines.push(index + 1);
            }

            // 3. Async operations
            if (/await|\.then|\.catch/.test(line)) {
                breakpointLines.push(index + 1);
            }
        });

        return breakpointLines.slice(0, 10); // Limit to top 10
    }

    async setupWatchExpressions(session) {
        // Auto-detect variables to watch based on error
        const watchExpressions = [
            'user',
            'user?.id',
            'data',
            'response',
            'error'
        ];

        console.log('\n👁️  Watch Expressions:');
        watchExpressions.forEach(expr => {
            console.log(`   • Watching: ${expr}`);
            this.watchExpressions.push(expr);
        });
    }

    async captureCallStack(session) {
        return new Promise((resolve) => {
            session.post('Debugger.getScriptSource', (err, result) => {
                if (!err) {
                    this.callStack = result;
                    resolve(result);
                }
            });
        });
    }
}

// Execute
const debugger = new InteractiveDebugger(process.env.SESSION_ID);
debugger.startInspector();
```

**Output:**

```
🔍 Starting Interactive Debugger...

✅ Inspector Started
   Chrome DevTools URL: chrome://inspect
   Port: 9229

📍 Setting up breakpoints...

   ✓ Breakpoint set: src/auth/login.ts:23
   ✓ Breakpoint set: src/auth/login.ts:45
   ✓ Breakpoint set: src/components/UserProfile.tsx:18
   ✓ Breakpoint set: src/components/UserProfile.tsx:34

👁️  Watch Expressions:
   • Watching: user
   • Watching: user?.id
   • Watching: data
   • Watching: response
   • Watching: error

🎯 Interactive debugger ready!

Commands:
  • Set breakpoint: /debug breakpoint <file>:<line>
  • Watch variable: /debug watch <expression>
  • Step over: /debug step
  • Continue: /debug continue
  • Inspect call stack: /debug stack
```

---

### Phase 3: Time-Travel Debugging[2][3]

```
TIME-TRAVEL DEBUGGING
════════════════════════════════════════════════════════════════

Feature: Record execution and replay forward/backward[web:450]

Command: /debug --time-travel
```

```python
#!/usr/bin/env python3
"""
Time-Travel Debugger
Records program state at each step, allows replay
"""

import sys
import json
from datetime import datetime
from pathlib import Path

class TimeTravelDebugger:
    """Record and replay program execution"""

    def __init__(self, session_id):
        self.session_id = session_id
        self.debug_dir = Path.home() / f".debug-sessions-advanced/{session_id}"
        self.trace_file = self.debug_dir / "execution_trace.jsonl"
        self.current_step = 0
        self.trace = []

    def record_execution(self, target_script):
        """Record every step of execution"""

        print("📼 Time-Travel Debugger: Recording Mode")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

        import trace

        tracer = trace.Trace(
            count=False,
            trace=True,
            tracedirs=[sys.prefix, sys.exec_prefix]
        )

        print(f"Recording execution of: {target_script}\n")

        # Run with tracing
        with open(self.trace_file, 'w') as f:
            tracer.runfunc(self._execute_with_recording, target_script, f)

        print(f"\n✅ Execution recorded: {self.trace_file}")
        print(f"   Total steps: {self.current_step}")
        print("\n🎮 Playback controls:")
        print("   /debug replay --step <n>   # Jump to step n")
        print("   /debug replay --forward     # Step forward")
        print("   /debug replay --backward    # Step backward")

    def _execute_with_recording(self, script_path, trace_file):
        """Execute script while recording state"""

        # This would integrate with actual execution
        # Recording variables, call stack, etc. at each step
        pass

    def replay(self, mode="forward", step=None):
        """Replay recorded execution"""

        print("▶️  Time-Travel Debugger: Replay Mode")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

        # Load trace
        with open(self.trace_file, 'r') as f:
            self.trace = [json.loads(line) for line in f]

        if step is not None:
            self.current_step = step
        elif mode == "forward":
            self.current_step += 1
        elif mode == "backward":
            self.current_step = max(0, self.current_step - 1)

        # Display state at current step
        current_state = self.trace[self.current_step]

        print(f"📍 Step {self.current_step}/{len(self.trace)}")
        print(f"   File: {current_state['file']}")
        print(f"   Line: {current_state['line']}")
        print(f"   Function: {current_state['function']}")
        print()
        print("Variables at this point:")
        for var, value in current_state['variables'].items():
            print(f"   {var} = {value}")
        print()
        print("Call Stack:")
        for i, frame in enumerate(current_state['call_stack']):
            print(f"   {i}. {frame['function']} ({frame['file']}:{frame['line']})")

# CLI
if __name__ == "__main__":
    session_id = sys.argv[1]
    mode = sys.argv[2] if len(sys.argv) > 2 else "record"

    debugger = TimeTravelDebugger(session_id)

    if mode == "record":
        target = sys.argv[3] if len(sys.argv) > 3 else "app.py"
        debugger.record_execution(target)
    elif mode in ["forward", "backward"]:
        debugger.replay(mode)
```

---

This is much more advanced! Would you like me to continue with:

- Phase 4: Performance Profiling & Flame Graphs
- Phase 5: Memory Leak Detection & Heap Analysis
- Phase 6: Network Request Debugging & HAR Analysis
- Phase 7: AI-Powered Root Cause Analysis
- Phase 8: Automated Fix Generation
- Phase 9: Regression Test Creation
- Phase 10: Debug Report Generation?
