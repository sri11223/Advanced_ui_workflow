// MongoDB-backed database service (replaces Supabase)
const { MongoDBService } = require('./mongodb');

const db = new MongoDBService();

module.exports = { db };
