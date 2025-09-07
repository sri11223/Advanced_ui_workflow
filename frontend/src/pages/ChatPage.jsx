import axios from "axios";
import { useState, useEffect } from "react";

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [prompt, setPrompt] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [lastResponse, setLastResponse] = useState(null);

  // Load sessionId from localStorage on component mount
  useEffect(() => {
    const storedSessionId = localStorage.getItem("questionnaireSessionId");
    if (storedSessionId) {
      setSessionId(storedSessionId);
    }
  }, []);

  // Function to clear session and start fresh
  const clearSession = () => {
    localStorage.removeItem("questionnaireSessionId");
    setSessionId(null);
    setCurrentQuestion(0);
    setTotalQuestions(0);
    setMessages([]);
    setNewMessage("");
    setPrompt("");
    setLastResponse(null);
  };

  const handleSendMessage = async () => {
    if (!newMessage) return;

    if (!sessionId) {
      console.log("Starting new session with prompt:", prompt);
      try {
        const response = await axios.post(
          "http://localhost:5000/api/questionnaire/start",
          { prompt: prompt }
        );
        console.log("Start response:", response.data);

        // Store questionnaire details in state
        const {
          sessionId: newSessionId,
          question,
          totalQuestions: total,
          currentQuestion: current,
        } = response.data;

        setSessionId(newSessionId);
        setTotalQuestions(total);
        setCurrentQuestion(current);
        setLastResponse(response.data);

        // Store sessionId in localStorage
        localStorage.setItem("questionnaireSessionId", newSessionId);

        // Add the question to messages
        setMessages([
          ...messages,
          {
            type: "question",
            content: question,
            currentQuestion: current,
            totalQuestions: total,
          },
        ]);
        setNewMessage("");
      } catch (error) {
        console.error("Error starting questionnaire:", error);
      }
      return;
    }

    // Add user's answer to messages immediately for real-time feedback
    const userAnswer = newMessage;
    setMessages((prev) => [...prev, { type: "answer", content: userAnswer }]);
    setNewMessage(""); // Clear input immediately

    // Handle answering questions
    try {
      const response = await axios.post(
        `http://localhost:5000/api/questionnaire/answer`,
        { sessionId: sessionId, answer: userAnswer }
      );

      console.log("Answer response:", response.data);
      setLastResponse(response.data);

      // Update current question count from API response
      const { currentQuestion: apiCurrentQuestion, totalQuestions: apiTotalQuestions } = response.data;
      setCurrentQuestion(apiCurrentQuestion);
      setTotalQuestions(apiTotalQuestions);

      console.log(`Question progress: ${apiCurrentQuestion}/${apiTotalQuestions}`);
      console.log("Response data:", response.data);

      // Check if questionnaire is complete - wireframe data indicates completion
      const isComplete = (
        response.data.completed === true ||
        (response.data.wireframe && response.data.wireframe.json)
      );

      if (isComplete) {
        console.log("Questionnaire completed! Preparing to call Figma generate API...");

        // Check if response has wireframe data
        if (response.data.wireframe && response.data.wireframe.json) {
          console.log("Wireframe data found:", response.data.wireframe.json);
          try {
            console.log("Calling Figma generate API with data:", response.data.wireframe.json);
            const figmaResponse = await axios.post(
              "http://localhost:5000/figma/generate",
              response.data.wireframe.json // Send only the JSON object from wireframe
            );

            console.log("Figma generate response:", figmaResponse.data);

            // Add completion message
            setMessages((prev) => [
              ...prev,
              {
                type: "completion",
                content: "Questionnaire completed! Figma design generated successfully!",
                figmaData: figmaResponse.data,
                wireframeData: response.data.wireframe.json
              },
            ]);

            // Clear sessionId from localStorage as questionnaire is complete
            localStorage.removeItem("questionnaireSessionId");
            setSessionId(null);
            setCurrentQuestion(0);
            setTotalQuestions(0);
          } catch (figmaError) {
            console.error("Error generating Figma design:", figmaError);
            setMessages((prev) => [
              ...prev,
              {
                type: "error",
                content: "Error generating Figma design. Please try again.",
              },
            ]);
          }
        } else {
          console.error("No wireframe data found in response");
          setMessages((prev) => [
            ...prev,
            {
              type: "error",
              content: "No wireframe data received. Please try again.",
            },
          ]);
        }
      } else {
        // Continue with questionnaire - add the next question to messages if available
        if (response.data.question) {
          setMessages((prev) => [
            ...prev,
            {
              type: "question",
              content: response.data.question,
              currentQuestion: apiCurrentQuestion,
              totalQuestions: apiTotalQuestions,
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error answering question:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          content: "Error processing your answer. Please try again.",
        },
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col">
      <div className="p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">UI/UX Design Questionnaire</h1>
            {sessionId && (
              <div className="mt-2 text-sm text-gray-300">
                Session: {sessionId} | Progress: {currentQuestion}/
                {totalQuestions}
              </div>
            )}
          </div>
          {sessionId && (
            <button
              onClick={clearSession}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
            >
              New Session
            </button>
          )}
        </div>
      </div>

      <div className="flex-grow p-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className="mb-4">
            {msg.type === "question" && (
              <div className="flex justify-start">
                <div className="inline-block p-3 rounded-lg bg-blue-600 max-w-2xl">
                  <div className="text-xs text-blue-200 mb-1">
                    Question {msg.currentQuestion}/{msg.totalQuestions}
                  </div>
                  <div>{msg.content}</div>
                </div>
              </div>
            )}

            {msg.type === "answer" && (
              <div className="flex justify-end">
                <div className="inline-block p-3 rounded-lg bg-green-600 max-w-2xl">
                  {msg.content}
                </div>
              </div>
            )}

            {msg.type === "completion" && (
              <div className="flex justify-center">
                <div className="inline-block p-4 rounded-lg bg-purple-600 max-w-4xl text-center">
                  <div className="text-lg font-semibold mb-2">
                    🎉 {msg.content}
                  </div>
                  {msg.figmaData && (
                    <div className="text-sm text-purple-200 mb-3">
                      Figma design generated successfully!
                    </div>
                  )}
                  {msg.wireframeData && (
                    <div className="bg-purple-700/50 rounded-lg p-3 mt-3 text-left">
                      <div className="text-sm font-medium text-purple-200 mb-2">
                        Generated Wireframe: {msg.wireframeData.title}
                      </div>
                      <div className="text-xs text-purple-300">
                        Components: {msg.wireframeData.components?.length || 0} elements
                      </div>
                      <div className="text-xs text-purple-300 mt-1">
                        Types: {msg.wireframeData.components?.map(c => c.type).join(', ') || 'None'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {msg.type === "error" && (
              <div className="flex justify-center">
                <div className="inline-block p-3 rounded-lg bg-red-600 max-w-2xl">
                  ❌ {msg.content}
                </div>
              </div>
            )}

            {/* Legacy support for old message format */}
            {!msg.type && (
              <div className="inline-block p-2 rounded bg-blue-600">
                {msg.answer || msg.question}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              if (!sessionId) {
                setPrompt(e.target.value);
              }
            }}
            placeholder={
              !sessionId
                ? "Describe your UI/UX project to start the questionnaire..."
                : "Type your answer..."
            }
            className="w-full px-4 py-3 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white rounded-l-lg"
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-r-lg transition-colors"
          >
            {!sessionId ? "Start" : "Send"}
          </button>
        </div>

        {sessionId && totalQuestions > 0 && (
          <div className="mt-3">
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(currentQuestion / totalQuestions) * 100}%`,
                }}
              ></div>
            </div>
            <div className="text-sm text-gray-400 mt-1 text-center">
              {currentQuestion > totalQuestions
                ? "Questionnaire complete!"
                : `${totalQuestions - currentQuestion + 1} questions remaining`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
