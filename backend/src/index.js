/**
 * FairHive Backend – Entry point
 * Starts Express server after loading env and initializing Firebase.
 */
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`FairHive API running on http://localhost:${PORT}`);
});
