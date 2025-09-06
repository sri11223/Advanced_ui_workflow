const fs = require("fs");
const path = require("path");
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { FakeEmbeddings } = require("langchain/embeddings/fake");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");

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

// Function to create embeddings and store in memory
const createMemoryVectorStore = async (documents) => {
  try {
    // Use fake embeddings for testing
    const embeddings = new FakeEmbeddings({
      // This will create deterministic but fake embeddings
      // that will at least let us test the system
      size: 1536, // Typical embedding dimension
    });

    // Create vector store from documents
    console.log("Creating in-memory vector store from documents...");
    const vectorStore = await MemoryVectorStore.fromDocuments(
      documents,
      embeddings
    );

    console.log("In-memory vector store created successfully");
    return vectorStore;
  } catch (error) {
    console.error("Error creating in-memory vector store:", error);
    throw error;
  }
};

// Main function to process PDFs and create vector store
const processPdfsAndCreateMemoryVectorStore = async (pdfDirectory) => {
  try {
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
    const vectorStore = await createMemoryVectorStore(docChunks);

    // Create retriever
    const retriever = vectorStore.asRetriever({
      k: 5,
      searchType: "similarity",
    });

    return retriever;

    return retriever;
  } catch (error) {
    console.error(
      "Error processing PDFs and creating memory vector store:",
      error
    );
    throw error;
  }
};

module.exports = {
  processPdfsAndCreateMemoryVectorStore,
};
