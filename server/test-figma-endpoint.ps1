# Test the figma/generate endpoint
# This script sends a wireframe JSON directly to the endpoint

# Create test output directory if it doesn't exist
mkdir -p test-outputs

# Define the JSON payload file
JSON_FILE="test-outputs/test-payload.json"

# Create a test JSON file
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

echo "JSON payload saved to $JSON_FILE"

# Send the JSON to the endpoint
echo "Sending request to /figma/generate endpoint..."
curl -X POST http://localhost:5000/figma/generate \
  -H "Content-Type: application/json" \
  -d @"$JSON_FILE" \
  -w "\n\nStatus code: %{http_code}\n"

echo ""
echo "Test completed!"
echo "If you got a 200 status code, the test was successful."
