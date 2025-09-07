@echo off
echo Testing the /figma/generate endpoint with the enhanced JSON structure
echo.

REM Define the JSON payload file
set JSON_FILE=test-outputs\enhanced-test-payload.json

REM Create the test-outputs directory if it doesn't exist
if not exist test-outputs mkdir test-outputs

REM Create a test JSON file with your payload
echo {^
  "json": {^
    "title": "Login Screen",^
    "components": [^
      {^
        "type": "input",^
        "label": "",^
        "x": 400,^
        "y": 225,^
        "width": 250,^
        "height": 40,^
        "fontSize": 16,^
        "fontFamily": "Open Sans",^
        "textColor": "#333333",^
        "placeholder": "Username",^
        "border": "1px solid #cccccc"^
      },^
      {^
        "type": "input",^
        "label": "",^
        "x": 400,^
        "y": 275,^
        "width": 250,^
        "height": 40,^
        "fontSize": 16,^
        "fontFamily": "Open Sans",^
        "textColor": "#333333",^
        "placeholder": "Password",^
        "border": "1px solid #cccccc"^
      },^
      {^
        "type": "button",^
        "label": "Login",^
        "x": 400,^
        "y": 325,^
        "width": 250,^
        "height": 40,^
        "fontSize": 16,^
        "fontFamily": "Open Sans",^
        "textColor": "#ffffff",^
        "backgroundColor": "#4CAF50",^
        "border": "none"^
      },^
      {^
        "type": "button",^
        "label": "Create Account",^
        "x": 400,^
        "y": 375,^
        "width": 250,^
        "height": 40,^
        "fontSize": 16,^
        "fontFamily": "Open Sans",^
        "textColor": "#4CAF50",^
        "backgroundColor": "#f7f7f7",^
        "border": "1px solid #cccccc"^
      },^
      {^
        "type": "text",^
        "label": "Error Message",^
        "x": 400,^
        "y": 420,^
        "width": 250,^
        "height": 20,^
        "fontSize": 14,^
        "fontFamily": "Open Sans",^
        "textColor": "#ff0000",^
        "visible": false^
      }^
    ]^
  }^
} > %JSON_FILE%

echo JSON payload saved to %JSON_FILE%

REM Send the JSON to the endpoint
echo Sending request to /figma/generate endpoint...
curl -X POST http://localhost:5000/figma/generate ^
  -H "Content-Type: application/json" ^
  -d @%JSON_FILE% ^
  -w "\n\nStatus code: %%{http_code}\n"

echo.
echo Test completed!
echo If you got a 200 status code, the test was successful.
echo Check your Figma plugin to see if the wireframe appears correctly.
echo.
echo Press any key to exit
pause > nul
