/**
 * Direct test for the Figma /figma/generate endpoint
 * This script uses the fetch API to test the endpoint directly
 */

const fs = require("fs").promises;
const path = require("path");
const http = require("http");

// Create a directory for test outputs if it doesn't exist
const testOutputDir = path.join(__dirname, "test-outputs");
fs.mkdir(testOutputDir, { recursive: true }).catch(console.error);

// Test JSON payload
const testPayload = {
  json: {
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
  },
};

/**
 * Test the /figma/generate endpoint
 */
async function testFigmaGenerateEndpoint() {
  console.log("Testing /figma/generate endpoint...");

  // Save the test payload to a file
  const payloadPath = path.join(testOutputDir, "test-payload.json");
  await fs.writeFile(payloadPath, JSON.stringify(testPayload, null, 2));
  console.log(`Saved test payload to: ${payloadPath}`);

  // Create a promise that resolves when the request is complete
  return new Promise((resolve, reject) => {
    // Create the request
    const options = {
      hostname: "localhost",
      port: 5000,
      path: "/figma/generate",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(JSON.stringify(testPayload)),
      },
    };

    const req = http.request(options, (res) => {
      console.log(`Status code: ${res.statusCode}`);

      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", async () => {
        console.log("Response received");

        try {
          // Try to parse the response as JSON
          const responseJson = JSON.parse(data);
          console.log("Response:", responseJson);

          // Save the response to a file
          const responsePath = path.join(
            testOutputDir,
            "figma-generate-response.json"
          );
          await fs.writeFile(
            responsePath,
            JSON.stringify(responseJson, null, 2)
          );
          console.log(`Saved response to: ${responsePath}`);

          resolve(responseJson);
        } catch (error) {
          console.error("Error parsing response:", error);
          console.log("Raw response:", data);
          reject(error);
        }
      });
    });

    req.on("error", (error) => {
      console.error("Error making request:", error);
      reject(error);
    });

    // Write the payload to the request
    req.write(JSON.stringify(testPayload));
    req.end();
  });
}

/**
 * Test the /figma/update endpoint
 */
async function testFigmaUpdateEndpoint() {
  console.log("\nTesting /figma/update endpoint...");

  // Update prompt
  const updatePrompt = {
    prompt: "add a forgot password link and make the login button green",
  };

  // Save the update prompt to a file
  const promptPath = path.join(testOutputDir, "update-prompt.json");
  await fs.writeFile(promptPath, JSON.stringify(updatePrompt, null, 2));
  console.log(`Saved update prompt to: ${promptPath}`);

  // Create a promise that resolves when the request is complete
  return new Promise((resolve, reject) => {
    // Create the request
    const options = {
      hostname: "localhost",
      port: 5000,
      path: "/figma/update",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(JSON.stringify(updatePrompt)),
      },
    };

    const req = http.request(options, (res) => {
      console.log(`Status code: ${res.statusCode}`);

      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", async () => {
        console.log("Response received");

        try {
          // Try to parse the response as JSON
          const responseJson = JSON.parse(data);
          console.log("Response:", responseJson);

          // Save the response to a file
          const responsePath = path.join(
            testOutputDir,
            "figma-update-response.json"
          );
          await fs.writeFile(
            responsePath,
            JSON.stringify(responseJson, null, 2)
          );
          console.log(`Saved response to: ${responsePath}`);

          resolve(responseJson);
        } catch (error) {
          console.error("Error parsing response:", error);
          console.log("Raw response:", data);
          reject(error);
        }
      });
    });

    req.on("error", (error) => {
      console.error("Error making request:", error);
      reject(error);
    });

    // Write the payload to the request
    req.write(JSON.stringify(updatePrompt));
    req.end();
  });
}

// Run tests
async function runTests() {
  console.log("========== Testing Figma Endpoints ==========");
  console.log(
    "Make sure the server is running on port 5000 before running this test."
  );

  try {
    // Test the /figma/generate endpoint
    await testFigmaGenerateEndpoint();

    // Test the /figma/update endpoint
    await testFigmaUpdateEndpoint();

    console.log("\nAll tests completed!");
  } catch (error) {
    console.error("Error running tests:", error);
  }
}

// Run the tests
runTests().catch(console.error);
