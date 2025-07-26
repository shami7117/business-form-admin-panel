// utils/googleSheetsClient.ts

import { google } from 'googleapis';

const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

export class GoogleSheetsClient {
  private oauth2Client: any;
  private sheetsAPI: any;

  constructor() {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
      throw new Error('Missing required Google OAuth credentials');
    }

    this.oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    this.oauth2Client.setCredentials({
      refresh_token: GOOGLE_REFRESH_TOKEN,
    });

    this.sheetsAPI = google.sheets({ version: 'v4', auth: this.oauth2Client });
  }

  async appendToSheet(sheetName: string, values: any[]): Promise<void> {
    try {
      await this.sheetsAPI.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEETS_ID,
        range: `${sheetName}!A:Z`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [values],
        },
      });
    } catch (error) {
      console.error(`Error appending to ${sheetName}:`, error);
      throw error;
    }
  }

  async createSheetsIfNotExist(): Promise<void> {
    try {
      // Get existing sheets
      const spreadsheet = await this.sheetsAPI.spreadsheets.get({
        spreadsheetId: GOOGLE_SHEETS_ID,
      });

      const existingSheets = spreadsheet.data.sheets?.map((sheet: any) => sheet.properties?.title) || [];

      const requiredSheets = [
        {
          name: 'Sessions',
          headers: ['Session ID', 'Timestamp', 'User Agent', 'Current Step', 'Exit Reason', 'Time Spent (s)', 'Form Data']
        },
        {
          name: 'Step Analytics',
          headers: ['Session ID', 'Step', 'Step Name', 'Action', 'Timestamp', 'Answer', 'Time Spent (s)']
        },
        {
          name: 'Session Updates',
          headers: ['Session ID', 'Timestamp', 'Current Step', 'Form Data', 'Exit Reason', 'Time Spent (s)']
        }
      ];
      
      // Create missing sheets
      for (const sheet of requiredSheets) {
        if (!existingSheets.includes(sheet.name)) {
          await this.sheetsAPI.spreadsheets.batchUpdate({
            spreadsheetId: GOOGLE_SHEETS_ID,
            requestBody: {
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: sheet.name,
                    },
                  },
                },
              ],
            },
          });
          
          // Add headers
          await this.sheetsAPI.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEETS_ID,
            range: `${sheet.name}!A:Z`,
            valueInputOption: 'RAW',
            requestBody: {
              values: [sheet.headers],
            },
          });
        }
      }
    } catch (error) {
      console.error('Error creating sheets:', error);
      throw error;
    }
  }

  async readFromSheet(sheetName: string, range?: string): Promise<any[][]> {
    try {
      const response = await this.sheetsAPI.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEETS_ID,
        range: range || `${sheetName}!A:Z`,
      });

      return response.data.values || [];
    } catch (error) {
      console.error(`Error reading from ${sheetName}:`, error);
      throw error;
    }
  }

  async updateSheet(sheetName: string, range: string, values: any[][]): Promise<void> {
    try {
      await this.sheetsAPI.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEETS_ID,
        range: `${sheetName}!${range}`,
        valueInputOption: 'RAW',
        requestBody: {
          values,
        },
      });
    } catch (error) {
      console.error(`Error updating ${sheetName}:`, error);
      throw error;
    }
  }

  async clearSheet(sheetName: string, range?: string): Promise<void> {
    try {
      await this.sheetsAPI.spreadsheets.values.clear({
        spreadsheetId: GOOGLE_SHEETS_ID,
        range: range || `${sheetName}!A:Z`,
      });
    } catch (error) {
      console.error(`Error clearing ${sheetName}:`, error);
      throw error;
    }
  }
}

// Export a singleton instance
export const googleSheetsClient = new GoogleSheetsClient();