@echo off
echo Testing /figma/generate endpoint with a simple wireframe JSON
echo This will send a wireframe JSON directly to the endpoint

REM Define the JSON payload
set JSON_FILE=test-payload.json

REM Create a test JSON file
echo {^
  "json": {^
    "title": "Login Screen",^
    "components": [^
      {^
        "type": "text",^
        "label": "Login to Your Account",^
        "x": 150,^
        "y": 50,^
        "fontSize": 24,^
        "fontWeight": "bold"^
      },^
      {^
        "type": "input",^
        "label": "Username",^
        "x": 50,^
        "y": 120,^
        "width": 300,^
        "height": 40,^
        "placeholder": "Enter your username"^
      },^
      {^
        "type": "input",^
        "label": "Password",^
        "x": 50,^
        "y": 180,^
        "width": 300,^
        "height": 40,^
        "placeholder": "Enter your password"^
      },^
      {^
        "type": "button",^
        "label": "Login",^
        "x": 50,^
        "y": 240,^
        "width": 300,^
        "backgroundColor": "#337ab7",^
        "textColor": "#ffffff"^
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
echo.
echo Press any key to exit
pause > nul
