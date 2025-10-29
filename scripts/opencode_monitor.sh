#!/bin/bash

# Script to monitor .opencode directories and prevent creation of forbidden filenames: agents, commands, subagents

forbidden_names=("agents" "commands" "subagents")

opencode_dirs=$(find /Users/lorenzorasmussen -maxdepth 3 -type d -name ".opencode" 2>/dev/null)

for dir in $opencode_dirs; do
  # Start fswatch for each directory in background
  nohup fswatch -0 --event Created --event MovedTo "$dir" | while IFS= read -r -d '' event; do
    filename=$(basename "$event")
    if [[ " ${forbidden_names[*]} " =~ " $filename " ]]; then
      echo "$(date): Removing forbidden file/dir: $event" >> /tmp/opencode_monitor.log
      rm -rf "$event" 2>/dev/null
    fi
  done &
done

echo "Monitoring started for $(echo $opencode_dirs | wc -w) .opencode directories. Log at /tmp/opencode_monitor.log"