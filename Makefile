# One-command setup and run. Usage: make
# Requires: Python 3.11+, make (built-in on macOS/Linux)

.PHONY: setup run

# Default: ensure env is ready, then run the app
run: setup
	@.venv/bin/python run.py

# Create venv and install dependencies
setup:
	@python3 -c "from dev import ensure_venv; ensure_venv()"
	@echo "Environment ready. Run 'make run' or just 'make' to start the app."
