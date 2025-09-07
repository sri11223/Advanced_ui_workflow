figma.showUI(__html__, { width: 420, height: 280 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === "wireframe-json") {
    await renderWireframe(msg.data);
    figma.ui.postMessage({
      type: "log",
      text: "✅ Wireframe updated in real time",
    });
  }
};

async function renderWireframe(jsonObj) {
  // Remove previous frames if needed
  figma.currentPage
    .findAll(
      (n) => n.type === "FRAME" && n.name === (jsonObj.title || "Screen")
    )
    .forEach((n) => n.remove());

  const frame = figma.createFrame();
  frame.resize(360, 720);
  frame.name = jsonObj.title || "Screen";
  frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];

  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  for (const comp of jsonObj.components || []) {
    switch (comp.type) {
      case "text":
        await createText(frame, comp);
        break;
      case "input":
        await createInput(frame, comp);
        break;
      case "button":
        await createButton(frame, comp);
        break;
      case "link":
        await createLink(frame, comp);
        break;
      default:
        // Default to text
        await createText(frame, comp);
    }
  }
}

async function createText(frame, comp) {
  const text = figma.createText();
  text.characters = comp.label || "Text";
  text.x = comp.x || 20;
  text.y = comp.y || 20;
  text.fontSize = comp.fontSize || 14;
  text.fontName = {
    family: "Inter",
    style: comp.fontWeight === "bold" ? "Bold" : "Regular",
  };

  if (comp.color) {
    const color = hexToRgb(comp.color);
    text.fills = [{ type: "SOLID", color }];
  }

  if (comp.width) text.resize(comp.width, text.height);

  frame.appendChild(text);
  return text;
}

async function createInput(frame, comp) {
  // Create container rectangle
  const rect = figma.createRectangle();
  rect.x = comp.x || 20;
  rect.y = comp.y || 20;
  rect.resize(comp.width || 200, comp.height || 40);
  rect.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  rect.strokeWeight = 1;
  rect.strokes = [{ type: "SOLID", color: { r: 0.8, g: 0.8, b: 0.8 } }];
  rect.cornerRadius = 4;

  // Create placeholder text
  const text = figma.createText();
  text.characters = comp.placeholder || comp.label || "Input";
  text.x = rect.x + 10;
  text.y = rect.y + (rect.height - 20) / 2;
  text.fontSize = 14;
  text.fills = [{ type: "SOLID", color: { r: 0.6, g: 0.6, b: 0.6 } }];

  // If it's a password field, replace with dots
  if (comp.isPassword) {
    text.characters = "••••••••";
  }

  frame.appendChild(rect);
  frame.appendChild(text);
  return { rect, text };
}

async function createButton(frame, comp) {
  // Create button rectangle
  const rect = figma.createRectangle();
  rect.x = comp.x || 20;
  rect.y = comp.y || 20;
  rect.resize(comp.width || 200, comp.height || 40);

  // Set background color
  if (comp.backgroundColor) {
    const bgColor = hexToRgb(comp.backgroundColor);
    rect.fills = [{ type: "SOLID", color: bgColor }];
  } else {
    rect.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.48, b: 0.72 } }];
  }

  rect.cornerRadius = 4;

  // Create button text
  const text = figma.createText();
  text.characters = comp.label || "Button";
  text.x = rect.x + (rect.width - text.width) / 2;
  text.y = rect.y + (rect.height - text.height) / 2;
  text.fontSize = 14;
  text.fontName = { family: "Inter", style: "Bold" };

  // Set text color
  if (comp.textColor) {
    const textColor = hexToRgb(comp.textColor);
    text.fills = [{ type: "SOLID", color: textColor }];
  } else {
    text.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  }

  frame.appendChild(rect);
  frame.appendChild(text);
  return { rect, text };
}

async function createLink(frame, comp) {
  const text = figma.createText();
  text.characters = comp.label || "Link";
  text.x = comp.x || 20;
  text.y = comp.y || 20;
  text.fontSize = comp.fontSize || 14;

  // Set link color
  if (comp.color) {
    const color = hexToRgb(comp.color);
    text.fills = [{ type: "SOLID", color }];
  } else {
    text.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.48, b: 0.72 } }];
  }

  // Add underline
  text.textDecoration = "UNDERLINE";

  if (comp.width) text.resize(comp.width, text.height);

  frame.appendChild(text);
  return text;
}

// Helper function to convert hex color to RGB
function hexToRgb(hex) {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Parse hex values
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16) / 255;
    g = parseInt(hex[1] + hex[1], 16) / 255;
    b = parseInt(hex[2] + hex[2], 16) / 255;
  } else {
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
  }

  return { r, g, b };
}
