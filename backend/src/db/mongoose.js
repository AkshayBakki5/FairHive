/**
 * MongoDB connection via Mongoose.
 * Call connect() once in index.js before app.listen().
 */
const mongoose = require('mongoose');

async function connect() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fairhive';
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}

module.exports = { connect };
