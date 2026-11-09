#!/usr/bin/env python3
"""Print user LaunchAgent plist; caller installs it using launchctl."""
import os
from pathlib import Path
import plistlib
import re
import shutil
import sys

project = Path(__file__).resolve().parent.parent
client_id = os.environ.get("DISCORD_CLIENT_ID", "")
if not re.fullmatch(r"[0-9]{17,20}", client_id):
    sys.exit("Set DISCORD_CLIENT_ID to your Discord application ID")
node = shutil.which("node")
hc = shutil.which("hc")
if not node or not hc or not (project / "dist/daemon.js").is_file():
    sys.exit("Build project and make node and hc available on PATH first")
node, hc = os.path.abspath(node), os.path.abspath(hc)
logs = Path.home() / "Library/Logs/herdr-core-discord-presence"
plistlib.dump({
    "Label": "io.github.caesariodito.herdr-core-discord-presence",
    "ProgramArguments": [node, str(project / "dist/daemon.js")],
    "WorkingDirectory": str(project),
    "EnvironmentVariables": {"DISCORD_CLIENT_ID": client_id, "HC_BIN": hc},
    "RunAtLoad": True,
    "KeepAlive": True,
    "ThrottleInterval": 10,
    "ProcessType": "Background",
    "ExitTimeOut": 20,
    "StandardOutPath": str(logs / "stdout.log"),
    "StandardErrorPath": str(logs / "stderr.log"),
}, sys.stdout.buffer)
