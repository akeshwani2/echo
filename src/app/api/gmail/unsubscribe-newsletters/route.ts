import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

interface Newsletter {
  id: string;
  name: string;
  email: string;
  lastEmail?: any;
}

function getOAuthClient(tokens: any): OAuth2Client {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

export async function POST(req: Request) {
  try {
    const { tokens, newsletters } = await req.json();
    
    if (!tokens || !newsletters || !Array.isArray(newsletters)) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }
    
    const gmail = google.gmail({ version: 'v1', auth: getOAuthClient(tokens) });
    const results = [];
    
    // Process each newsletter
    for (const newsletter of newsletters) {
      try {
        // Create a filter to automatically archive emails from this sender
        await gmail.users.settings.filters.create({
          userId: 'me',
          requestBody: {
            criteria: {
              from: newsletter.email
            },
            action: {
              addLabelIds: ['TRASH'], // Send directly to trash
              removeLabelIds: ['INBOX'] // Remove from inbox
            }
          }
        });
        
        // If the newsletter has a lastEmail, try to find unsubscribe link
        if (newsletter.lastEmail && newsletter.lastEmail.id) {
          try {
            // Get the full email to look for unsubscribe headers
            const email = await gmail.users.messages.get({
              userId: 'me',
              id: newsletter.lastEmail.id,
              format: 'full'
            });
            
            const headers = email.data.payload?.headers || [];
            const unsubscribeHeader = headers.find(h => 
              h.name?.toLowerCase() === 'list-unsubscribe' || 
              h.name?.toLowerCase() === 'unsubscribe'
            );
            
            if (unsubscribeHeader && unsubscribeHeader.value) {
              // Extract the unsubscribe URL
              const unsubscribeUrl = extractUrlFromHeader(unsubscribeHeader.value);
              
              if (unsubscribeUrl) {
                // We found an unsubscribe URL, but we can't automatically visit it
                // In a real implementation, you might use a service to visit this URL
                // or notify the user to manually visit it
                results.push({
                  newsletter: newsletter.name,
                  status: 'partial',
                  message: 'Filter created. Manual unsubscribe required.',
                  unsubscribeUrl
                });
                continue;
              }
            }
          } catch (error) {
            console.error(`Error processing unsubscribe for ${newsletter.name}:`, error);
          }
        }
        
        // Default result if we couldn't find an unsubscribe link
        results.push({
          newsletter: newsletter.name,
          status: 'success',
          message: 'Filter created to automatically trash future emails.'
        });
      } catch (error) {
        console.error(`Error unsubscribing from ${newsletter.name}:`, error);
        results.push({
          newsletter: newsletter.name,
          status: 'error',
          message: 'Failed to create filter.'
        });
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Processed ${newsletters.length} newsletter subscriptions.`,
      results 
    });
  } catch (error) {
    console.error('Error in unsubscribe-newsletters API:', error);
    return NextResponse.json({ 
      error: 'Failed to process unsubscribe request' 
    }, { status: 500 });
  }
}

// Helper function to extract URL from unsubscribe header
function extractUrlFromHeader(headerValue: string): string | null {
  // Try to extract URL from angle brackets (common format)
  const urlMatch = headerValue.match(/<([^>]+)>/);
  if (urlMatch && urlMatch[1] && urlMatch[1].startsWith('http')) {
    return urlMatch[1];
  }
  
  // Try to extract any URL
  const generalUrlMatch = headerValue.match(/(https?:\/\/[^\s]+)/);
  if (generalUrlMatch && generalUrlMatch[1]) {
    return generalUrlMatch[1];
  }
  
  // Try to extract mailto link
  const mailtoMatch = headerValue.match(/(mailto:[^\s,]+)/);
  if (mailtoMatch && mailtoMatch[1]) {
    return mailtoMatch[1];
  }
  
  return null;
} 