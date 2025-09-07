/**
 * Test script for the wireframe flattening functionality
 * This tests whether the flattening algorithm correctly handles nested components
 */

const { generateWireframe } = require("./chatbot");
const fs = require("fs").promises;
const path = require("path");

// Create a directory for test outputs if it doesn't exist
const testOutputDir = path.join(__dirname, "test-outputs");
fs.mkdir(testOutputDir, { recursive: true }).catch(console.error);

// This is a nested JSON structure that would typically come from the RAG system
// It contains containers with nested components
const nestedJson = {
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
          {
            type: "input",
            label: "Email",
            x: 20,
            y: 130,
            width: 360,
            height: 40,
            placeholder: "Enter your email address",
          },
        ],
      },
      {
        type: "form",
        label: "Message",
        x: 50,
        y: 420,
        width: 400,
        height: 200,
        components: [
          {
            type: "text",
            label: "Your Message",
            x: 20,
            y: 20,
            fontSize: 18,
            fontWeight: "bold",
          },
          {
            type: "input",
            label: "Message",
            x: 20,
            y: 60,
            width: 360,
            height: 80,
            placeholder: "Type your message here",
          },
        ],
      },
      {
        type: "button",
        label: "Submit",
        x: 200,
        y: 640,
        width: 120,
        backgroundColor: "#337ab7",
        textColor: "#ffffff",
      },
    ],
  },
};

/**
 * Manually flatten a nested component structure
 * This function mimics what the LLM would generate
 * @param {Object} json - The nested JSON object
 * @returns {Object} - The flattened JSON object
 */
function manuallyFlattenComponents(json) {
  const result = {
    json: {
      title: json.json.title,
      components: [],
    },
  };

  // Extract and flatten components
  for (const component of json.json.components) {
    if (component.type === "container" || component.type === "form") {
      // Add the container/form itself as a text component
      result.json.components.push({
        type: "text",
        label: component.label,
        x: component.x,
        y: component.y,
        fontSize: 18,
        fontWeight: "bold",
      });

      // Add nested components with adjusted coordinates
      if (component.components && Array.isArray(component.components)) {
        for (const nestedComponent of component.components) {
          result.json.components.push({
            ...nestedComponent,
            x: component.x + nestedComponent.x,
            y: component.y + nestedComponent.y,
          });
        }
      }
    } else {
      // Add regular components directly
      result.json.components.push({ ...component });
    }
  }

  return result;
}

/**
 * Test the wireframe generation with a nested JSON structure
 */
async function testNestedWireframe() {
  console.log("\n========== Testing wireframe flattening ==========");

  try {
    // First, write the nested JSON to a file for reference
    const nestedFilepath = path.join(
      testOutputDir,
      "nested-wireframe-input.json"
    );
    await fs.writeFile(nestedFilepath, JSON.stringify(nestedJson, null, 2));
    console.log(`Saved nested wireframe JSON to: ${nestedFilepath}`);

    // 1. First, let's use our manual function to flatten it for comparison
    const manuallyFlattened = manuallyFlattenComponents(nestedJson);
    const manualFilepath = path.join(
      testOutputDir,
      "manually-flattened-wireframe.json"
    );
    await fs.writeFile(
      manualFilepath,
      JSON.stringify(manuallyFlattened, null, 2)
    );
    console.log(
      `Saved manually flattened wireframe JSON to: ${manualFilepath}`
    );

    // 2. Now let's test with a prompt that would generate a nested structure
    console.log("\nTesting generateWireframe with a complex prompt...");
    console.time("Generation time");
    const generatedWireframe = await generateWireframe(
      "contact form with personal information section and message section"
    );
    console.timeEnd("Generation time");

    // Save the JSON to a file for further inspection
    const generatedFilepath = path.join(
      testOutputDir,
      "generated-wireframe.json"
    );
    await fs.writeFile(
      generatedFilepath,
      JSON.stringify(generatedWireframe, null, 2)
    );
    console.log(`Saved generated wireframe JSON to: ${generatedFilepath}`);

    // Quick validation
    console.log("\nGenerated Wireframe Structure:");
    console.log("Has json key:", !!generatedWireframe.json);
    console.log(
      "Has components array:",
      generatedWireframe.json &&
        Array.isArray(generatedWireframe.json.components)
    );
    console.log(
      "Total components:",
      generatedWireframe.json?.components?.length || 0
    );

    // Check for nested components (which should be flattened)
    const hasNestedComponents = generatedWireframe.json?.components?.some(
      (c) =>
        c.components && Array.isArray(c.components) && c.components.length > 0
    );
    console.log(
      "Has nested components:",
      hasNestedComponents ? "YES (PROBLEM!)" : "No (Good)"
    );

    // Check for unsupported component types
    const unsupportedTypes =
      generatedWireframe.json?.components
        ?.filter((c) => !["text", "input", "button"].includes(c.type))
        ?.map((c) => c.type) || [];
    console.log(
      "Unsupported component types:",
      unsupportedTypes.length === 0
        ? "None (Good)"
        : unsupportedTypes.join(", ") + " (PROBLEM!)"
    );

    console.log("\nTest completed!");
  } catch (error) {
    console.error("Error testing nested wireframe:", error);
  }
}

// Run the test
testNestedWireframe().catch(console.error);
