const fs = require("fs");
const path = require("path");
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { ChatGroq } = require("@langchain/groq");
const { GroqEmbeddings } = require("@langchain/groq");
const { Pinecone } = require("@pinecone-database/pinecone");
const { PineconeStore } = require("@langchain/pinecone");

// Function to get all PDF files in a directory
const getPdfFiles = (directory) => {
  try {
    const files = fs.readdirSync(directory);
    return files
      .filter((file) => path.extname(file).toLowerCase() === ".pdf")
      .map((file) => path.join(directory, file));
  } catch (error) {
    console.error(`Error reading directory ${directory}:`, error);
    return [];
  }
};

// Function to load and process PDF documents
const loadPdfDocuments = async (pdfPaths) => {
  try {
    let allDocs = [];

    for (const pdfPath of pdfPaths) {
      console.log(`Loading PDF: ${pdfPath}`);
      const loader = new PDFLoader(pdfPath);
      const docs = await loader.load();

      // Add metadata including the source file name
      const fileName = path.basename(pdfPath);
      docs.forEach((doc) => {
        doc.metadata.source = fileName;
      });

      allDocs = [...allDocs, ...docs];
    }

    console.log(
      `Loaded ${allDocs.length} document chunks from ${pdfPaths.length} PDFs`
    );
    return allDocs;
  } catch (error) {
    console.error("Error loading PDF documents:", error);
    throw error;
  }
};

// Function to split documents into chunks
const splitDocuments = async (documents) => {
  try {
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docChunks = await textSplitter.splitDocuments(documents);
    console.log(`Split documents into ${docChunks.length} chunks`);
    return docChunks;
  } catch (error) {
    console.error("Error splitting documents:", error);
    throw error;
  }
};

// Function to create embeddings and store in Pinecone
const createVectorStore = async (documents, apiKey, indexName) => {
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is not set");
  }

  try {
    // Initialize embeddings
    const embeddings = new GroqEmbeddings({
      apiKey: apiKey,
      model: "llama-3.1-8b-text", // Using Llama 3 for embeddings
    });

    // Initialize Pinecone
    console.log("Initializing Pinecone...");
    const pinecone = new Pinecone();

    // Check if index exists
    console.log("Checking available indexes...");
    const indexList = await pinecone.listIndexes();
    console.log(
      "Available indexes:",
      indexList.indexes?.map((idx) => idx.name) || []
    );

    const indexExists = indexList.indexes?.some(
      (idx) => idx.name === indexName
    );

    // Create index if it doesn't exist
    if (!indexExists) {
      console.log(`Index "${indexName}" not found. Creating it...`);

      await pinecone.createIndex({
        name: indexName,
        dimension: 4096, // Dimension for Llama 3 embeddings
        metric: "cosine",
        spec: {
          serverless: {
            cloud: "aws",
            region: "ap-south-1a", // Change to your preferred region
          },
        },
      });

      console.log(`Index "${indexName}" created successfully`);
      console.log("Waiting for index to be ready...");
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }

    // Get index
    const pineconeIndex = pinecone.Index(indexName);

    // Create vector store from documents
    console.log("Creating vector store from documents...");
    const vectorStore = await PineconeStore.fromDocuments(
      documents,
      embeddings,
      {
        pineconeIndex,
        maxConcurrency: 5,
      }
    );

    console.log("Vector store created successfully");
    return vectorStore;
  } catch (error) {
    console.error("Error creating vector store:", error);
    throw error;
  }
};

// Main function to process PDFs and create vector store
const processPdfsAndCreateVectorStore = async (
  pdfDirectory,
  groqApiKey,
  pineconeApiKey,
  indexName
) => {
  try {
    // Save original environment variables
    const originalGroqApiKey = process.env.GROQ_API_KEY;
    const originalPineconeApiKey = process.env.PINECONE_API_KEY;

    // Set environment variables
    process.env.GROQ_API_KEY = groqApiKey;
    process.env.PINECONE_API_KEY = pineconeApiKey;

    // Get PDF files
    const pdfFiles = getPdfFiles(pdfDirectory);

    if (pdfFiles.length === 0) {
      console.log("No PDF files found in the specified directory");
      return null;
    }

    console.log(`Found ${pdfFiles.length} PDF files`);

    // Load PDF documents
    const documents = await loadPdfDocuments(pdfFiles);

    // Split documents into chunks
    const docChunks = await splitDocuments(documents);

    // Create vector store
    const vectorStore = await createVectorStore(
      docChunks,
      groqApiKey,
      indexName
    );

    // Create retriever
    const retriever = vectorStore.asRetriever({
      k: 5,
      searchType: "similarity",
    });

    // Restore original environment variables
    if (originalGroqApiKey !== undefined) {
      process.env.GROQ_API_KEY = originalGroqApiKey;
    } else {
      delete process.env.GROQ_API_KEY;
    }

    if (originalPineconeApiKey !== undefined) {
      process.env.PINECONE_API_KEY = originalPineconeApiKey;
    } else {
      delete process.env.PINECONE_API_KEY;
    }

    return retriever;
  } catch (error) {
    console.error("Error processing PDFs and creating vector store:", error);
    throw error;
  }
};

module.exports = {
  processPdfsAndCreateVectorStore,
};
