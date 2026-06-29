# Local Setup

This guide walks through setting up a full local development environment.

## Clone the Repository

```bash
git clone https://github.com/your-org/eyegents.git
cd eyegents
```

## Install Dependencies

```bash
npm ci
```

This installs all workspace dependencies from the lockfile.

## Start Services

Launch the required infrastructure containers:

```bash
docker compose up -d ollama qdrant
```

- **Ollama** — local LLM inference
- **Qdrant** — vector database

## Pull Models

Download the required models for local inference:

```bash
./scripts/pull-models.sh
```

## Build Packages

Compile all workspace packages:

```bash
npm run build
```

## Run the MCP Server

Start the MCP server in development mode:

```bash
npm run dev
```

## Run the Indexer

Start the document indexer service:

```bash
docker compose --profile indexing up indexer
```

## Optional: OpenRouter Setup

If you want to use OpenRouter as a model provider instead of local Ollama:

```bash
# Create a Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r scripts/requirements.txt

# Set your API key
export OPENROUTER_API_KEY="your-api-key-here"
```

You can test the OpenRouter integration with:

```bash
./scripts/openrouter-test.py
```
