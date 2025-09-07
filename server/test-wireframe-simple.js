/**
 * Simple test script for validating wireframe JSON structure
 * This script doesn't depend on the retrievers or LLM client being initialized
 */

const fs = require("fs").promises;
const path = require("path");

// Create a directory for test outputs if it doesn't exist
const testOutputDir = path.join(__dirname, "test-outputs");
fs.mkdir(testOutputDir, { recursive: true }).catch(console.error);

// Example of a valid wireframe JSON
const validWireframeJson = {
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

// Example of a nested wireframe JSON (needs flattening)
const nestedWireframeJson = {
  json: {
    title: "Contact Form",
    components: [
      {
        type: "text",
        label: "Contact Us",
        x: 150,
        y: 30,
        fontSize: 28,
        fontWeight: "bold",
      },
      {
        type: "container",
        label: "Personal Information",
        x: 50,
        y: 100,
        width: 400,
        height: 300,
        components: [
          {
            type: "text",
            label: "Personal Information",
            x: 20,
            y: 20,
            fontSize: 18,
            fontWeight: "bold",
          },
          {
            type: "input",
            label: "First Name",
            x: 20,
            y: 60,
            width: 170,
            height: 40,
            placeholder: "Enter your first name",
          },
          {
            type: "input",
            label: "Last Name",
            x: 210,
            y: 60,
            width: 170,
            height: 40,
            placeholder: "Enter your last name",
          },
        ],
      },
    ],
  },
};

/**
 * Flattens nested component structures
 * @param {Object} wireframeJson - The wireframe JSON to flatten
 * @returns {Object} - The flattened wireframe JSON
 */
function flattenComponents(wireframeJson) {
  const result = {
    json: {
      title: wireframeJson.json.title,
      components: [],
    },
  };

  const flattenComponentsRecursive = (components, parentX = 0, parentY = 0) => {
    components.forEach((component) => {
      // Skip if it's not an object
      if (typeof component !== "object") return;

      // Create a copy of the component without nested components
      const flatComponent = { ...component };

      // Adjust x and y based on parent coordinates if they're nested
      if (parentX !== 0 || parentY !== 0) {
        flatComponent.x = (flatComponent.x || 0) + parentX;
        flatComponent.y = (flatComponent.y || 0) + parentY;
      }

      // Check for unsupported component types and convert them
      if (!["text", "input", "button"].includes(flatComponent.type)) {
        // Convert container/form to a text label
        if (
          flatComponent.type === "container" ||
          flatComponent.type === "form"
        ) {
          flatComponent.type = "text";
          flatComponent.label =
            flatComponent.label ||
            flatComponent.type.charAt(0).toUpperCase() +
              flatComponent.type.slice(1);
          flatComponent.fontSize = flatComponent.fontSize || 16;
        } else {
          // Default to input for unknown types
          flatComponent.type = "input";
          flatComponent.label = flatComponent.label || flatComponent.type;
          flatComponent.placeholder = flatComponent.placeholder || "Enter text";
        }
      }

      // Remove any nested components array
      const nestedComponents = flatComponent.components;
      delete flatComponent.components;

      // Ensure button text is in label property
      if (
        flatComponent.type === "button" &&
        flatComponent.text &&
        !flatComponent.label
      ) {
        flatComponent.label = flatComponent.text;
        delete flatComponent.text;
      }

      // Add to flattened components
      result.json.components.push(flatComponent);

      // Process nested components if they exist
      if (Array.isArray(nestedComponents)) {
        flattenComponentsRecursive(
          nestedComponents,
          flatComponent.x,
          flatComponent.y
        );
      }
    });
  };

  flattenComponentsRecursive(wireframeJson.json.components);
  return result;
}

/**
 * Validate a wireframe JSON structure
 * @param {Object} wireframeJson - The wireframe JSON to validate
 * @returns {Object} - Validation result
 */
function validateWireframeJson(wireframeJson) {
  const result = {
    isValid: true,
    errors: [],
    hasJsonKey: false,
    hasTitle: false,
    hasComponents: false,
    componentTypes: [],
    unsupportedTypes: [],
    hasNestedComponents: false,
  };

  // Check top-level structure
  if (!wireframeJson) {
    result.isValid = false;
    result.errors.push("Wireframe JSON is null or undefined");
    return result;
  }

  // Check if it has json key
  if (!wireframeJson.json) {
    result.isValid = false;
    result.errors.push('Missing top-level "json" key');
    return result;
  }
  result.hasJsonKey = true;

  // Check if it has title
  if (!wireframeJson.json.title) {
    result.isValid = false;
    result.errors.push('Missing "title" in json object');
  } else {
    result.hasTitle = true;
  }

  // Check if it has components array
  if (
    !wireframeJson.json.components ||
    !Array.isArray(wireframeJson.json.components)
  ) {
    result.isValid = false;
    result.errors.push('Missing or invalid "components" array in json object');
    return result;
  }
  result.hasComponents = true;

  // Check components
  wireframeJson.json.components.forEach((component, index) => {
    // Check if component is an object
    if (typeof component !== "object") {
      result.isValid = false;
      result.errors.push(`Component at index ${index} is not an object`);
      return;
    }

    // Check if component has a type
    if (!component.type) {
      result.isValid = false;
      result.errors.push(`Component at index ${index} is missing a type`);
      return;
    }

    // Record component type
    result.componentTypes.push(component.type);

    // Check if component type is supported
    if (!["text", "input", "button"].includes(component.type)) {
      result.unsupportedTypes.push(component.type);
    }

    // Check if component has nested components
    if (
      component.components &&
      Array.isArray(component.components) &&
      component.components.length > 0
    ) {
      result.hasNestedComponents = true;
    }

    // Check if component has required properties based on its type
    switch (component.type) {
      case "text":
        if (!component.label) {
          result.isValid = false;
          result.errors.push(
            `Text component at index ${index} is missing a label`
          );
        }
        break;
      case "input":
        if (!component.label) {
          result.isValid = false;
          result.errors.push(
            `Input component at index ${index} is missing a label`
          );
        }
        break;
      case "button":
        if (!component.label) {
          result.isValid = false;
          result.errors.push(
            `Button component at index ${index} is missing a label`
          );
        }
        break;
    }

    // Check if component has x and y coordinates
    if (typeof component.x !== "number" || typeof component.y !== "number") {
      result.isValid = false;
      result.errors.push(
        `Component at index ${index} is missing x or y coordinates`
      );
    }
  });

  return result;
}

// Run tests
async function runTests() {
  console.log("========== Testing Wireframe JSON Validation ==========");

  // Test valid wireframe
  console.log("\nTesting valid wireframe JSON:");
  const validResult = validateWireframeJson(validWireframeJson);
  console.log("Validation result:", validResult);

  // Save valid wireframe to file
  const validFilePath = path.join(testOutputDir, "valid-wireframe.json");
  await fs.writeFile(
    validFilePath,
    JSON.stringify(validWireframeJson, null, 2)
  );
  console.log(`Saved valid wireframe to: ${validFilePath}`);

  // Test nested wireframe
  console.log("\nTesting nested wireframe JSON:");
  const nestedResult = validateWireframeJson(nestedWireframeJson);
  console.log("Validation result:", nestedResult);

  // Save nested wireframe to file
  const nestedFilePath = path.join(testOutputDir, "nested-wireframe.json");
  await fs.writeFile(
    nestedFilePath,
    JSON.stringify(nestedWireframeJson, null, 2)
  );
  console.log(`Saved nested wireframe to: ${nestedFilePath}`);

  // Test flattening
  console.log("\nTesting flattening nested wireframe:");
  const flattenedWireframe = flattenComponents(nestedWireframeJson);
  const flattenedResult = validateWireframeJson(flattenedWireframe);
  console.log("Flattened validation result:", flattenedResult);

  // Save flattened wireframe to file
  const flattenedFilePath = path.join(
    testOutputDir,
    "flattened-wireframe.json"
  );
  await fs.writeFile(
    flattenedFilePath,
    JSON.stringify(flattenedWireframe, null, 2)
  );
  console.log(`Saved flattened wireframe to: ${flattenedFilePath}`);

  console.log("\nAll tests completed!");
}

// Run the tests
runTests().catch(console.error);
