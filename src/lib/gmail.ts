import { google } from 'googleapis';

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// Add a function to get an authenticated Gmail client
export function getAuthenticatedGmailClient({ access_token }: { access_token: string }) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token });
  
  return google.gmail({
    version: 'v1',
    auth
  });
} 