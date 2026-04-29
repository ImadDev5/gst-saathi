const { parseCSV } = require('./inngest/functions');
const fs = require('fs');

const buf = fs.readFileSync('../business_bank_statement_sample.csv');
console.log(parseCSV(buf, 'st', 'tr').slice(0, 2));
