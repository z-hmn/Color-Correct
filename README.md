# Color Correct

A color correction learning app with lessons and quizzes.

## Quick start (one command)

After cloning the repo, get the app running with **one command**:

| Platform   | Command      |
|-----------|--------------|
| Any (Windows, Mac, Linux) | `python3 dev.py` |
| Mac / Linux               | `make`          |

This creates a virtual environment, installs dependencies, and starts the server. Then open **http://127.0.0.1:5000** in your browser. When you're done, press **Ctrl+C** in the terminal to stop the server.

You only need **Python 3.11+** installed (see [.python-version](.python-version); 3.12 recommended).

---

## Manual setup (optional)

If you prefer to set up the environment yourself:

Use one of the following so everyone gets the same dependencies.

### Option A: uv (recommended)

[uv](https://docs.astral.sh/uv/) provides fast, reproducible installs and a lockfile.

```bash
# Install uv if needed: curl -LsSf https://astral.sh/uv/install.sh | sh
uv venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
uv sync
```

This creates `.venv`, installs from [pyproject.toml](pyproject.toml), and generates `uv.lock` for exact versions. Commit `uv.lock` so all developers get the same dependency tree.

### Option B: pip + venv

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

[requirements.txt](requirements.txt) pins direct dependencies for reproducibility.

## Run (after manual setup)

From the project root with the virtual environment activated:

```bash
python3 run.py
```

Or use `make run` (Mac/Linux). Then open http://127.0.0.1:5000 in your browser.

## Troubleshooting

**"Port 5000 is already in use"** — A previous run of the app (or another process) is still using the port. Stop it first:

1. Find the process: `lsof -i :5000` (look for the PID in the output).
2. Stop it: `kill <PID>` (use the number from step 1). If it doesn’t exit: `kill -9 <PID>`.
3. Start the app again: `python3 dev.py` or `make`.

One-liner to kill whatever is on port 5000: `kill $(lsof -t -i :5000)` (Mac/Linux).

## Deploy to Render

The app is set up to deploy on [Render](https://render.com)

1. Push this repo to GitHub
2. In the [Render Dashboard](https://dashboard.render.com), click **New → Blueprint**.
3. Connect the GitHub repo. Render will read [render.yaml](render.yaml) and create a **Web Service** with the right build and start commands.
4. In the new service, open **Environment** and add a **SECRET_KEY** variable (e.g. a long random string). This is used for Flask sessions in production.
5. Deploy. The app will be available at `https://<your-service>.onrender.com`.


## Adding dependencies

- **With uv:** add the package in `pyproject.toml` under `[project].dependencies`, then run `uv lock` and commit `uv.lock`. Install with `uv sync`.
- **With pip:** add the package to `pyproject.toml`, run `pip install <package>` then `pip freeze | grep -v '^-e' > requirements.txt` to update pins, or add the line to `requirements.txt` with a pinned version.

## Project layout

- `run.py` – Flask app entrypoint
- `data.json` / `quiz_content.json` – content data
- `templates/` – HTML templates
- `static/` – CSS, JS, images
