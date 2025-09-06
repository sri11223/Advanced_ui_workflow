// Start script to run the integrated server
const { spawn } = require("child_process");
const path = require("path");

console.log("Starting integrated wireframe server...");

// Run the server
const server = spawn("node", ["index.js"], {
  stdio: "inherit",
  cwd: __dirname,
});

server.on("close", (code) => {
  if (code !== 0) {
    console.log(`Server process exited with code ${code}`);
  }
});

// Handle clean shutdown
process.on("SIGINT", () => {
  console.log("Received shutdown signal, stopping server...");
  server.kill("SIGINT");
});

console.log(`
-------------------------------------------------
🚀 Integrated Wireframe System
-------------------------------------------------
- Main API server and Figma WebSocket server started
- See README.md for usage instructions
- See FIGMA-INTEGRATION.md for Figma plugin setup
-------------------------------------------------
`);
