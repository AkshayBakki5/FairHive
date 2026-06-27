/**
 * FairHive Backend – Entry point
 * Connects to MongoDB then starts Express server.
 */
require('dotenv').config();
const app = require('./app');
const { connect } = require('./db/mongoose');

const PORT = process.env.PORT || 3000;

connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`FairHive API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
