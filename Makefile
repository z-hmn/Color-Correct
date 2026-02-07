# One-command setup and run. Usage: make
# Requires: Python 3.11+, make (built-in on macOS/Linux)

.PHONY: setup run

# Default: ensure env is ready, then run the app
run: setup
	@.venv/bin/python run.py

# Create venv and install dependencies
setup:
	@if [ ! -d .venv ]; then \
		echo "Creating virtual environment..."; \
		python3 -m venv .venv; \
		echo "Installing dependencies..."; \
		.venv/bin/pip install -q -r requirements.txt; \
	else \
		.venv/bin/pip install -q -r requirements.txt; \
	fi
	@echo "Environment ready. Run 'make run' or just 'make' to start the app."
