/**
 * Test script for WebSocket connection with Figma plugin
 * This tests whether the WebSocket connection is working and if the Figma plugin is receiving the JSON
 */

const WebSocket = require("ws");
const fs = require("fs").promises;
const path = require("path");

// Create a directory for test outputs if it doesn't exist
const testOutputDir = path.join(__dirname, "test-outputs");
fs.mkdir(testOutputDir, { recursive: true }).catch(console.error);

// Sample wireframe JSON (already in the correct format for the Figma plugin)
const wireframeJson = {
  title: "Login Screen",
  components: [
    {
      type: "text",
      label: "Login to Your Account",
      x: 150,
      y: 50,
      fontSize: 24,
      fontWeight: "bold",
    },
    {
      type: "input",
      label: "Username",
      x: 50,
      y: 120,
      width: 300,
      height: 40,
      placeholder: "Enter your username",
    },
    {
      type: "input",
      label: "Password",
      x: 50,
      y: 180,
      width: 300,
      height: 40,
      placeholder: "Enter your password",
    },
    {
      type: "button",
      label: "Login",
      x: 50,
      y: 240,
      width: 300,
      backgroundColor: "#337ab7",
      textColor: "#ffffff",
    },
  ],
};

// Another test using your provided JSON (unwrapped from the json key)
const yourWireframeJson = {
  title: "Login Screen",
  components: [
    {
      type: "input",
      label: "",
      x: 400,
      y: 225,
      width: 250,
      height: 40,
      fontSize: 16,
      fontFamily: "Open Sans",
      textColor: "#333333",
      placeholder: "Username",
      border: "1px solid #cccccc",
    },
    {
      type: "input",
      label: "",
      x: 400,
      y: 275,
      width: 250,
      height: 40,
      fontSize: 16,
      fontFamily: "Open Sans",
      textColor: "#333333",
      placeholder: "Password",
      border: "1px solid #cccccc",
    },
    {
      type: "button",
      label: "Login",
      x: 400,
      y: 325,
      width: 250,
      height: 40,
      fontSize: 16,
      fontFamily: "Open Sans",
      textColor: "#ffffff",
      backgroundColor: "#4CAF50",
      border: "none",
    },
    {
      type: "button",
      label: "Create Account",
      x: 400,
      y: 375,
      width: 250,
      height: 40,
      fontSize: 16,
      fontFamily: "Open Sans",
      textColor: "#4CAF50",
      backgroundColor: "#f7f7f7",
      border: "1px solid #cccccc",
    },
    {
      type: "text",
      label: "Error Message",
      x: 400,
      y: 420,
      width: 250,
      height: 20,
      fontSize: 14,
      fontFamily: "Open Sans",
      textColor: "#ff0000",
      visible: false,
    },
  ],
};

/**
 * Connect to the WebSocket server and send the wireframe JSON directly
 */
async function testWebSocketConnection() {
  console.log("Testing WebSocket connection with Figma plugin...");

  // Save test wireframes to files
  await fs.writeFile(
    path.join(testOutputDir, "test-websocket-wireframe.json"),
    JSON.stringify(wireframeJson, null, 2)
  );

  await fs.writeFile(
    path.join(testOutputDir, "your-websocket-wireframe.json"),
    JSON.stringify(yourWireframeJson, null, 2)
  );

  return new Promise((resolve, reject) => {
    // Connect to the WebSocket server
    const ws = new WebSocket("ws://localhost:8080");

    ws.on("open", () => {
      console.log("Connected to WebSocket server");

      // Send the first test message
      console.log("Sending test wireframe...");
      ws.send(
        JSON.stringify({
          type: "wireframe-json",
          data: wireframeJson,
        })
      );

      // Wait 2 seconds, then send the second test message
      setTimeout(() => {
        console.log("Sending your wireframe...");
        ws.send(
          JSON.stringify({
            type: "wireframe-json",
            data: yourWireframeJson,
          })
        );

        console.log(
          "Messages sent. Check your Figma plugin to see if the wireframes appear."
        );

        // Close the connection after another 2 seconds
        setTimeout(() => {
          ws.close();
          resolve();
        }, 2000);
      }, 2000);
    });

    ws.on("message", (data) => {
      console.log("Received message from server:", data);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      reject(error);
    });

    ws.on("close", () => {
      console.log("WebSocket connection closed");
    });
  });
}

/**
 * Test sending the wireframe directly to the endpoint
 */
async function testFixedEndpoint() {
  console.log("\nTesting fixed endpoint with unwrapped JSON...");

  // Create payload with your wireframe JSON but UNWRAPPED (not inside a json key)
  const payload = yourWireframeJson;

  // Save the payload to a file
  await fs.writeFile(
    path.join(testOutputDir, "fixed-endpoint-payload.json"),
    JSON.stringify(payload, null, 2)
  );

  try {
    const response = await fetch("http://localhost:5000/figma/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ json: payload }),
    });

    const result = await response.json();
    console.log("Response:", result);

    await fs.writeFile(
      path.join(testOutputDir, "fixed-endpoint-response.json"),
      JSON.stringify(result, null, 2)
    );

    console.log(
      "Test completed. Check your Figma plugin to see if the wireframe appears."
    );
  } catch (error) {
    console.error("Error testing fixed endpoint:", error);
  }
}

// Run tests
async function runTests() {
  console.log("========== Testing Figma WebSocket Connection ==========");

  try {
    // Test WebSocket connection
    await testWebSocketConnection();

    // Test fixed endpoint
    await testFixedEndpoint();

    console.log("\nAll tests completed!");
  } catch (error) {
    console.error("Error running tests:", error);
  }
}

// Run the tests
runTests().catch(console.error);
