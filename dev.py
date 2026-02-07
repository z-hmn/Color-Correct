#!/usr/bin/env python3
"""
One-command setup and run for new developers.
Usage: python dev.py

Creates a virtual environment if needed, installs dependencies, then starts the app.
Works on Windows, macOS, and Linux.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VENV_DIR = ROOT / ".venv"
REQUIREMENTS = ROOT / "requirements.txt"


def run(cmd: list[str], env: dict | None = None, check: bool = True) -> subprocess.CompletedProcess:
    env = {**os.environ, **(env or {})}
    return subprocess.run(cmd, cwd=ROOT, env=env, check=check)


def ensure_venv() -> Path:
    """Create .venv if it doesn't exist. Return path to venv Python."""
    if sys.platform == "win32":
        venv_python = VENV_DIR / "Scripts" / "python.exe"
        venv_pip = VENV_DIR / "Scripts" / "pip.exe"
    else:
        venv_python = VENV_DIR / "bin" / "python"
        venv_pip = VENV_DIR / "bin" / "pip"

    if not venv_python.exists():
        print("Creating virtual environment...")
        run([sys.executable, "-m", "venv", str(VENV_DIR)])
        print("Installing dependencies...")
        run([str(venv_python), "-m", "pip", "install", "-q", "-r", str(REQUIREMENTS)])
    else:
        # Ensure deps are installed (idempotent)
        run([str(venv_pip), "install", "-q", "-r", str(REQUIREMENTS)], check=False)

    return venv_python


def main() -> None:
    venv_python = ensure_venv()
    run_app = ROOT / "run.py"
    print("Starting the app...")
    print("Open http://127.0.0.1:5000 in your browser.\n")
    run([str(venv_python), str(run_app)])


if __name__ == "__main__":
    main()
