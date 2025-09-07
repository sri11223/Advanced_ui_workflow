# Test the figma/update endpoint
# This script tests the wireframe update functionality

# Create test output directory if it doesn't exist
mkdir -p test-outputs

# Define the JSON payload file
JSON_FILE="test-outputs/test-payload.json"

# Create a test JSON file with the initial wireframe
cat > "$JSON_FILE" << EOF
{
  "json": {
    "title": "Login Screen",
    "components": [
      {
        "type": "text",
        "label": "Login to Your Account",
        "x": 150,
        "y": 50,
        "fontSize": 24,
        "fontWeight": "bold"
      },
      {
        "type": "input",
        "label": "Username",
        "x": 50,
        "y": 120,
        "width": 300,
        "height": 40,
        "placeholder": "Enter your username"
      },
      {
        "type": "input",
        "label": "Password",
        "x": 50,
        "y": 180,
        "width": 300,
        "height": 40,
        "placeholder": "Enter your password"
      },
      {
        "type": "button",
        "label": "Login",
        "x": 50,
        "y": 240,
        "width": 300,
        "backgroundColor": "#337ab7",
        "textColor": "#ffffff"
      }
    ]
  }
}
EOF

echo "Initial wireframe JSON saved to $JSON_FILE"

# Step 1: Send the initial wireframe to the /figma/generate endpoint
echo "Step 1: Sending initial wireframe to /figma/generate endpoint..."
curl -X POST http://localhost:5000/figma/generate \
  -H "Content-Type: application/json" \
  -d @"$JSON_FILE" \
  -w "\n\nStatus code: %{http_code}\n"

echo ""
echo "Initial wireframe sent. Now sending update prompt..."

# Step 2: Update the wireframe with a prompt
UPDATE_PROMPT_FILE="test-outputs/update-prompt.json"
cat > "$UPDATE_PROMPT_FILE" << EOF
{
  "prompt": "add a forgot password link and make the login button green"
}
EOF

echo "Step 2: Sending update prompt to /figma/update endpoint..."
curl -X POST http://localhost:5000/figma/update \
  -H "Content-Type: application/json" \
  -d @"$UPDATE_PROMPT_FILE" \
  -o "test-outputs/update-response.json" \
  -w "\n\nStatus code: %{http_code}\n"

echo ""
echo "Update request complete. Response saved to test-outputs/update-response.json"
echo "You can check the test-outputs directory for all the test files."
