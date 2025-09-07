@echo off
echo Testing the non-working JSON with the updated Figma plugin code
echo.

REM Define the JSON payload file
set JSON_FILE=test-outputs\non-working-test.json

REM Create the test-outputs directory if it doesn't exist
if not exist test-outputs mkdir test-outputs

REM Create a test JSON file with the non-working payload
echo {^
  "json": {^
    "title": "Login Screen",^
    "components": [^
      {^
        "type": "text",^
        "label": "",^
        "x": 375,^
        "y": 200,^
        "width": 300,^
        "height": 250,^
        "fontSize": 16,^
        "fontWeight": "normal",^
        "backgroundColor": "#FFFFFF",^
        "borderRadius": 5,^
        "padding": 20^
      },^
      {^
        "type": "input",^
        "label": "Username",^
        "x": 400,^
        "y": 225,^
        "width": 250,^
        "height": 40,^
        "fontSize": 16,^
        "fontFamily": "Open Sans",^
        "placeholder": "Username"^
      },^
      {^
        "type": "input",^
        "label": "Password",^
        "x": 400,^
        "y": 275,^
        "width": 250,^
        "height": 40,^
        "fontSize": 16,^
        "fontFamily": "Open Sans",^
        "placeholder": "Password"^
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
        "backgroundColor": "#4CAF50",^
        "textColor": "#FFFFFF",^
        "borderRadius": 5^
      },^
      {^
        "type": "text",^
        "label": "Error Message",^
        "x": 400,^
        "y": 375,^
        "width": 250,^
        "fontSize": 14,^
        "fontFamily": "Open Sans",^
        "textColor": "#FF0000"^
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
