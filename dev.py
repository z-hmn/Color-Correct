#!/usr/bin/env python3
"""
One-command setup and run for new developers.
Usage: python3 dev.py

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
    """Ensure .venv and its dependencies are ready. Return its Python path."""
    if sys.platform == "win32":
        venv_python = VENV_DIR / "Scripts" / "python.exe"
    else:
        venv_python = VENV_DIR / "bin" / "python"

    if not venv_python.exists():
        print("Creating virtual environment...")
        run([sys.executable, "-m", "venv", str(VENV_DIR)])

    # Environments created by uv do not include pip by default.
    pip_check = run(
        [
            str(venv_python),
            "-c",
            "import importlib.util; raise SystemExit(importlib.util.find_spec('pip') is None)",
        ],
        check=False,
    )
    if pip_check.returncode == 1:
        print("Installing pip in the virtual environment...")
        run([str(venv_python), "-m", "ensurepip", "--upgrade"])
    else:
        pip_check.check_returncode()

    print("Installing dependencies...")
    run([str(venv_python), "-m", "pip", "install", "-q", "-r", str(REQUIREMENTS)])

    return venv_python


def main() -> None:
    venv_python = ensure_venv()
    run_app = ROOT / "run.py"
    print("Starting the app...")
    print("Open http://127.0.0.1:5000 in your browser.\n")
    run([str(venv_python), str(run_app)])


if __name__ == "__main__":
    main()
