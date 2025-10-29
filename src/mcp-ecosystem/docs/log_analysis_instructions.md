# Log Analysis Instructions for AI-Assisted Summarization

## Overview
This guide provides instructions for analyzing log files using AI (specifically llama3.2:1b), focusing on summarization, insight extraction, and handling context limitations. The approach uses the existing OllamaSummaries project as a base, adapted for log analysis.

## Key Considerations
- **Model Limitations**: llama3.2:1b has ~4K token context window. Use chunking and hashing for large files.
- **Context Preservation**: Maintain chronological order and relationships between log entries.
- **Incremental Processing**: Process files in batches, building cumulative summaries.

## Analysis Workflow

### 1. File Discovery and Sorting
- Scan target directory for `.log` files
- Sort by modification time (oldest first) for chronological processing
- Group related files if timestamps indicate continuity

### 2. Content Preparation
- **Chunking Strategy**: Split large files into 2K-token chunks with 200-token overlap
- **Metadata Extraction**: Extract timestamps, log levels, components from each entry
- **Hashing for Context**: Create SHA-256 hashes of chunks for deduplication and reference

### 3. AI-Prompted Analysis
Use structured prompts for each processing stage:

#### Initial Summary Prompt:
```
Analyze this log chunk. Provide:
- Key events and their timestamps
- Error patterns and frequencies
- User actions and system responses
- Potential issues or anomalies

Log chunk:
[CONTENT]
```

#### Pattern Recognition Prompt:
```
Identify patterns in these log summaries:
- Recurring error sequences
- Performance bottlenecks
- User behavior patterns
- System state changes

Summaries:
[ACCUMULATED_SUMMARIES]
```

#### Insight Generation Prompt:
```
Based on the complete timeline, provide:
- Root cause analysis for issues
- Recommendations for improvement
- Risk assessment
- Future monitoring suggestions

Timeline:
[COMPLETE_TIMELINE]
```

### 4. Output Structure
Generate JSON with this format:
```json
{
  "analysis_summary": {
    "common_issues": [{"issue": "desc", "tags": ["tag"]}],
    "identified_patterns": [{"pattern": "desc", "tags": ["tag"]}],
    "key_insights": ["insight"]
  },
  "event_timeline": [
    {"file_name": "file.log", "timestamp": "ISO", "summary": "narrative", "tags": ["tag"]}
  ]
}
```

## Implementation Using OllamaSummaries

### Adaptations Needed
1. **Model Change**: Update config.json to use "llama3.2:1b"
2. **Context Management**: Implement chunking in summarize_stream.py
3. **Prompt Templates**: Create log-specific prompts in queue/ directory
4. **Incremental Summarization**: Modify to build cumulative analysis

### Code Snippets

#### Chunking Function:
```python
def chunk_text(text, chunk_size=2000, overlap=200):
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = ' '.join(words[i:i + chunk_size])
        chunks.append(chunk)
    return chunks
```

#### Hash-Based Deduplication:
```python
import hashlib

def hash_chunk(chunk):
    return hashlib.sha256(chunk.encode()).hexdigest()

# Store processed hashes to avoid re-analysis
processed_hashes = set()
```

#### Timeline Building:
```python
def build_timeline(summaries, file_info):
    timeline = []
    for summary, info in zip(summaries, file_info):
        timeline.append({
            "file_name": info["name"],
            "timestamp": info["mtime"],
            "summary": summary,
            "tags": extract_tags(summary)
        })
    return sorted(timeline, key=lambda x: x["timestamp"])
```

## Tools and Files to Create

### 1. log_analyzer.py
Main script that:
- Scans directories
- Chunks files
- Calls Ollama for analysis
- Builds final JSON

### 2. prompts/ directory
- initial_analysis.prompt
- pattern_recognition.prompt
- insight_generation.prompt

### 3. utils/ directory
- chunker.py
- hasher.py
- timeline_builder.py

### 4. cache/ directory
Store intermediate results and hashes to resume processing.

## Usage Example
```bash
python log_analyzer.py --dir ~/Downloads --output analysis.json --model llama3.2:1b
```

This approach leverages the OllamaSummaries framework while addressing context limitations through intelligent chunking and incremental analysis.