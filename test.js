const Papa = require('papaparse');
const fs = require('fs');

const text = fs.readFileSync('/workspaces/gst-saathi/business_bank_statement_sample.csv', 'utf-8');

const rawParse = Papa.parse(text, {
  header: false,
  skipEmptyLines: true,
});

console.log(rawParse.data.slice(0, 3));
