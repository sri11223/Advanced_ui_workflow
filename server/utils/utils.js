const { Pinecone } = require("@pinecone-database/pinecone");
const { PineconeStore } = require("@langchain/pinecone");
const { GroqEmbeddings } = require("@langchain/groq");
const { processPdfsAndCreateVectorStore } = require("./pdf-processor");
const {
  processPdfsAndCreateMemoryVectorStore,
} = require("./pdf-processor-memory");
const path = require("path");

let retriever = null;

// Simple mutex to prevent concurrent API key modifications
let isInitializing = false;
const initQueue = [];

async function withApiKey(apiKey, asyncFunction) {
  return new Promise((resolve, reject) => {
    const execute = async () => {
      if (isInitializing) {
        // If another function is initializing, wait for it to complete
        initQueue.push(() => execute());
        return;
      }

      isInitializing = true;
      const originalApiKey = process.env.PINECONE_API_KEY;

      try {
        process.env.PINECONE_API_KEY = apiKey;
        const result = await asyncFunction();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        // Restore original API key
        if (originalApiKey !== undefined) {
          process.env.PINECONE_API_KEY = originalApiKey;
        } else {
          delete process.env.PINECONE_API_KEY;
        }

        isInitializing = false;

        // Process next item in queue
        if (initQueue.length > 0) {
          const nextFunction = initQueue.shift();
          setTimeout(nextFunction, 0);
        }
      }
    };

    execute();
  });
}

// async function get_retriever() {
//   process.env.PINECONE_API_KEY = process.env.PINECONE_API_KEY1;
//   const PINECONE_INDEX = "knowledge-retrival";
//   const pinecone = new Pinecone();
//   const pineconeIndex = pinecone.Index(PINECONE_INDEX);
//   const embeddings = new PineconeEmbeddings({
//     model: "multilingual-e5-large",
//   });
//   const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
//     pineconeIndex,
//     maxConcurrency: 5,
//   });
//   retriever = vectorStore.asRetriever();
//   process.env.PINECONE_API_KEY = "";
// }

async function get_retriever() {
  try {
    // Use in-memory vector store instead of Pinecone
    const pdfDirectory = path.resolve(__dirname, "..");
    console.log(`Looking for PDFs in directory: ${pdfDirectory}`);

    console.log("Creating in-memory vector store from PDFs...");
    retriever = await processPdfsAndCreateMemoryVectorStore(pdfDirectory);

    console.log("In-memory vector store created and retriever initialized");
    return retriever;
  } catch (error) {
    console.error("Error initializing retriever:", error);
    throw error;
  }
}

module.exports = {
  get_retriever,
  retriever,
};
