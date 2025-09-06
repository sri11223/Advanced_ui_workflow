# Wireframe AI Backend + Plugin

## Backend
1. cd backend
2. npm install
3. npm start
   - REST API runs at http://localhost:3000
   - WebSocket runs at ws://localhost:8080

Send JSON from AI model like this:
POST http://localhost:3000/generate
{
  "json": {
    "title": "Login Screen",
    "components": [
      { "type": "input", "label": "Username" },
      { "type": "input", "label": "Password" },
      { "type": "button", "label": "Login" }
    ]
  }
}

The plugin will instantly render it inside Figma.

## Plugin
1. Open Figma → Plugins → Development → Import plugin from manifest
2. Select /figma-plugin/manifest.json
3. Run "Wireframe Importer + AI Assistant"
4. Backend will push wireframe JSON directly → appears automatically
