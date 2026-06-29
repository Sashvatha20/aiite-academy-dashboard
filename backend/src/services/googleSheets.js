const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

if (!spreadsheetId) {
  throw new Error('GOOGLE_SPREADSHEET_ID is missing in environment variables');
}

let serviceAccount;

try {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_FILE) {
    const filePath = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_FILE);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    serviceAccount = JSON.parse(fileContent);
  } else {
    throw new Error('Provide GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_FILE');
  }
} catch (err) {
  console.error('Google Sheets credential load failed:', err.message);
  throw new Error('Failed to load Google service account credentials');
}

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({
  version: 'v4',
  auth,
});

module.exports = {
  sheets,
  spreadsheetId,
};