# Ollama Setup with DeepSeek R1

This project now uses **Vercel AI SDK** with **Ollama** and **DeepSeek R1** model for local AI functionality instead of OpenRouter API.

## Prerequisites

1. **Install Ollama**: Download and install Ollama from [ollama.ai](https://ollama.ai)
2. **Pull DeepSeek R1 model**: Run the following command to download the model:

```bash
ollama pull deepseek-r1:8b
```

## Setup Instructions

### 1. Install Ollama

**Windows:**
- Download the installer from [ollama.ai](https://ollama.ai)
- Run the installer and follow the instructions

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Start Ollama Service

```bash
ollama serve
```

This will start the Ollama server on `http://localhost:11434` (default port).

### 3. Download DeepSeek R1 Model

```bash
ollama pull deepseek-r1:8b
```

### 4. Verify Installation

You can test if everything is working correctly:

```bash
ollama list
```

You should see `deepseek-r1:8b` in the list of available models.

### 5. Test the Model

```bash
ollama run deepseek-r1:8b "Hello, how are you?"
```

## Configuration

The project uses environment variables for configuration:

### Environment Variables

Create a `.env.local` file in your project root with:

```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:8b
```

**Note**: The application automatically appends `/api` to the base URL for the correct Ollama API endpoint.

### Default Values

If no environment variables are set, the defaults are:
- **Base URL**: `http://localhost:11434` (automatically becomes `http://localhost:11434/api`)
- **Model**: `deepseek-r1:8b`

These settings are configured in `src/ai/ollama/config.ts`.

## Usage

Once Ollama is running with the DeepSeek R1 model, the application will automatically use it for:

- **Test Case Generation**: Creating test cases for Python code
- **Python Code Execution Simulation**: Simulating Python code execution
- **Code Debugging**: Providing debugging assistance and error explanations
- **Code Explanation**: Adding comments to explain code sections

## Troubleshooting

### Ollama Not Running
If you get connection errors, make sure Ollama is running:
```bash
ollama serve
```

### Model Not Available
If the model is not found, pull it again:
```bash
ollama pull deepseek-r1:8b
```

### Port Conflicts
If port 11434 is in use, you can start Ollama on a different port:
```bash
OLLAMA_HOST=0.0.0.0:11435 ollama serve
```

Then update your `.env.local` file:
```env
OLLAMA_BASE_URL=http://localhost:11435
```

## Benefits of Local AI

- **Privacy**: All AI processing happens locally
- **No API Keys**: No need for external API keys
- **Offline Capability**: Works without internet connection
- **Cost Effective**: No per-request charges
- **Fast Response**: Local processing is typically faster
