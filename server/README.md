# Integrated Wireframe Generation System

This system combines RAG-based wireframe generation with Figma visualization capabilities.

## Components

1. **RAG System** - Uses LangChain with Groq/Gemini LLMs to generate wireframes based on UX design documents
2. **Questionnaire System** - Interactive wireframe creation through a series of questions
3. **Figma Integration** - Visualize wireframes directly in Figma

## Installation

1. Install dependencies:

   ```
   npm install --legacy-peer-deps
   ```

2. Create a `.env` file with your API keys:
   ```
   GROQ_API_KEY=your_groq_api_key
   GOOGLE_API_KEY=your_gemini_api_key
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_INDEX=your_pinecone_index
   PINECONE_ENVIRONMENT=your_pinecone_environment
   PORT=5001
   WSPORT=8080
   ```

## Starting the Server

```
npm start
```

This will start:

- The main server on port 5001 (or as specified in .env)
- The Figma WebSocket server on port 8080 (or as specified in .env)

## API Endpoints

### Wireframe Generation

```
POST /generate-wireframe
{
  "prompt": "Create a login page with username and password fields"
}
```

### Questionnaire-based Generation

```
POST /api/questionnaire/start
{
  "prompt": "Create a login page"
}
```

### Direct Figma Integration

```
POST /figma/generate
{
  "json": {
    "title": "Login Screen",
    "components": [...]
  }
}
```

## Figma Integration

See [FIGMA-INTEGRATION.md](./FIGMA-INTEGRATION.md) for details on setting up the Figma plugin.

## Fallback Mechanisms

The system includes robust fallback mechanisms:

1. LLM API failures - Falls back from Groq to Gemini 2.5 Flash
2. JSON parsing failures - Automatic repair for malformed JSON
3. Rate limiting - Prevents API abuse
4. Persistent caching - Improves performance and resilience

## File Structure

- `index.js` - Main server with all endpoints including Figma integration
- `chatbot.js` - RAG system for wireframe generation
- `questionnaire.js` - Interactive wireframe creation
- `utils/` - Utility functions for robust operation
  - `utils.js` - General utilities
  - `robust-llm.js` - Fallback-enabled LLM client
  - `persistent-cache.js` - Caching system
  - `rate-limiter.js` - API rate limiting

## Development

For development, use:

```
npm run dev
```
