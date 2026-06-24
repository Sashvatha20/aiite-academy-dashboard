const { google } = require('googleapis');
const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

if (!spreadsheetId) {
  throw new Error('GOOGLE_SPREADSHEET_ID is missing in environment variables');
}

if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is missing in environment variables');
}

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

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