# Figma Integration for Wireframe Visualization

This integration allows you to visualize generated wireframes directly in Figma and iteratively edit them using natural language prompts.

## How it works

1. The main server (index.js) now includes a WebSocket server that communicates with the Figma plugin.
2. When a wireframe is generated, it's automatically converted to Figma's format and sent to any connected Figma plugins.
3. The plugin renders the wireframe in real-time within Figma.
4. Users can then provide natural language prompts in the plugin UI to update the wireframe.
5. The server stores the context of the current wireframe and uses the RAG system to intelligently update it based on user prompts.

## Setup Instructions

1. Install the required WebSocket package:

   ```
   npm install ws --save
   ```

2. Start the server:

   ```
   npm start
   ```

3. The server will run on port 5000 (or the port specified in your .env file)
   and the WebSocket server for Figma will run on port 8080.

4. Install the Figma plugin from the `figma` directory.

## API Endpoints

- `/generate-wireframe` - Generate a wireframe from a text prompt
- `/figma/generate` - Send a wireframe JSON directly to Figma
- `/figma/update` - Update an existing wireframe based on a natural language prompt

## Example Wireframe JSON Format

See the `figma-wireframe-template.json` file for an example of the wireframe format
that the Figma plugin understands.

## Using the Iterative Editing Feature

After a wireframe is generated and displayed in Figma:

1. The plugin UI will show a text input field where you can type natural language prompts
2. Enter a prompt describing the changes you want (e.g., "Make the buttons larger" or "Add a search field at the top")
3. Click the "Update Wireframe" button
4. The server will use the RAG system to intelligently update the wireframe while maintaining design consistency
5. The updated wireframe will be automatically rendered in Figma

## Developing the Figma Plugin

The Figma plugin code is in the `figma` directory. To modify the plugin:

1. Edit the files in the `figma` directory
2. Install the plugin in Figma using the "Load local plugin" option
3. Any changes to the plugin code will require reloading the plugin in Figma
