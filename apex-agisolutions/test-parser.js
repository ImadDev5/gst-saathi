require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

// We need to transpile TypeScript on the fly so we can import parseCSV from functions.ts.
// It's easier to use ts-node.
