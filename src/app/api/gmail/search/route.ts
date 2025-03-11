// src/app/api/gmail/search/route.ts
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { gmail_v1 } from 'googleapis';

interface EmailHeader {
  name: string;
  value: string;
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

// Function to calculate relevance score based on query and email content
function calculateRelevanceScore(query: string, email: any): number {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
  if (queryTerms.length === 0) return 0;
  
  const subject = email.subject?.toLowerCase() || '';
  const body = email.body?.toLowerCase() || '';
  const snippet = email.snippet?.toLowerCase() || '';
  const from = email.from?.toLowerCase() || '';
  
  let score = 0;
  
  // Check for exact phrase match (highest relevance)
  if (subject.includes(query.toLowerCase()) || body.includes(query.toLowerCase())) {
    score += 100;
  }
  
  // Check for individual term matches
  for (const term of queryTerms) {
    // Subject matches are highly relevant
    if (subject.includes(term)) {
      score += 20;
    }
    
    // Snippet matches are quite relevant
    if (snippet.includes(term)) {
      score += 10;
    }
    
    // Body matches are relevant
    if (body.includes(term)) {
      score += 5;
    }
    
    // From matches can be relevant
    if (from.includes(term)) {
      score += 3;
    }
  }
  
  // Boost score for recent emails
  const emailDate = new Date(email.date);
  const now = new Date();
  const daysDifference = Math.floor((now.getTime() - emailDate.getTime()) / (1000 * 3600 * 24));
  
  if (daysDifference < 1) {
    score += 15; // Today
  } else if (daysDifference < 7) {
    score += 10; // This week
  } else if (daysDifference < 30) {
    score += 5;  // This month
  }
  
  return score;
}

export async function POST(req: Request) {
  try {
    const { tokens, query } = await req.json();
    const gmail = google.gmail({ version: 'v1', auth: getOAuthClient(tokens) });

    // First, always fetch recent emails to ensure we have results
    const searchResponse = await gmail.users.messages.list({
      userId: 'me',
      q: 'category:primary',
      maxResults: 20, // Fetch 20 recent emails
    });

    if (!searchResponse.data.messages) {
      return NextResponse.json({ emails: [] });
    }

    // If we have a meaningful query, also try to search for it specifically
    let queryMessages: gmail_v1.Schema$Message[] = [];
    if (query && query.length > 3) {
      try {
        const queryResponse = await gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: 30, // Fetch up to 30 query-specific emails
        });
        
        if (queryResponse.data.messages) {
          queryMessages = queryResponse.data.messages;
        }
      } catch (error) {
        console.error('Query-specific search failed:', error);
        // Continue with just the recent emails
      }
    }

    // Combine and deduplicate message IDs
    const messageIds = new Set<string>();
    const allMessages: gmail_v1.Schema$Message[] = [];
    
    // Add recent messages first
    searchResponse.data.messages!.forEach(message => {
      if (message.id && !messageIds.has(message.id)) {
        messageIds.add(message.id);
        allMessages.push(message);
      }
    });
    
    // Then add query-specific messages
    queryMessages.forEach(message => {
      if (message.id && !messageIds.has(message.id)) {
        messageIds.add(message.id);
        allMessages.push(message);
      }
    });

    const emails = await Promise.all(
      allMessages.map(async (message) => {
        const email = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full',
        });
        
        const headers = email.data.payload?.headers || [];
        const getHeader = (name: string) => headers.find(h => h.name === name)?.value || '';
        
        // Get the email body
        const body = email.data.payload?.parts?.[0]?.body?.data || 
                    email.data.payload?.body?.data;

        const decodedBody = body ? 
          Buffer.from(body, 'base64').toString('utf-8') : 
          '';

        // Enhanced metadata processing
        const subject = getHeader('Subject');
        const type = determineEmailType(subject, decodedBody);
        const importance = determineImportance(email.data.labelIds || [], subject);
        const hasAttachments = email.data.payload?.parts?.some(part => part.filename && part.filename.length > 0) || false;
        
        return {
          id: email.data.id,
          snippet: email.data.snippet,
          type,
          importance,
          hasAttachments,
          headers,
          date: getHeader('Date'),
          subject: subject,
          from: getHeader('From'),
          to: getHeader('To'),
          body: decodedBody,
          labels: email.data.labelIds || []
        };
      })
    );

    // Calculate relevance scores and sort emails
    const scoredEmails = emails.map(email => ({
      ...email,
      relevanceScore: calculateRelevanceScore(query, email)
    }));

    // Sort by relevance score (highest first)
    scoredEmails.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Helper function to determine email type
    function determineEmailType(subject: string, body: string): string {
      const lowerSubject = subject.toLowerCase();
      const lowerBody = body.toLowerCase();
      
      if (lowerSubject.includes('meeting') || lowerSubject.includes('invite') || 
          lowerBody.includes('zoom.us') || lowerBody.includes('meet.google.com')) {
        return 'meeting';
      }
      
      if (lowerSubject.includes('order') || lowerSubject.includes('shipping') || 
          lowerSubject.includes('tracking') || lowerSubject.includes('delivered')) {
        return 'order';
      }
      
      if (lowerSubject.includes('flight') || lowerSubject.includes('itinerary') || 
          lowerSubject.includes('booking') || lowerBody.includes('reservation')) {
        return 'travel';
      }
      
      if (lowerSubject.includes('document') || lowerSubject.includes('shared') || 
          lowerBody.includes('google doc') || lowerBody.includes('google sheet') ||
          lowerSubject.includes('sign') || lowerBody.includes('signature') ||
          lowerSubject.includes('contract') || lowerBody.includes('docusign')) {
        return 'document';
      }
      
      return 'general';
    }

    // Helper function to determine importance
    function determineImportance(labels: string[], subject: string): 'high' | 'medium' | 'low' {
      const lowerSubject = subject.toLowerCase();
      
      // Check for explicit importance markers
      if (labels.includes('IMPORTANT') || 
          lowerSubject.includes('urgent') || 
          lowerSubject.includes('asap') ||
          lowerSubject.includes('important')) {
        return 'high';
      }
      
      // Check for potential medium importance indicators
      if (labels.includes('CATEGORY_UPDATES') ||
          lowerSubject.includes('reminder') ||
          lowerSubject.includes('action required')) {
        return 'medium';
      }
      
      return 'low';
    }

    return NextResponse.json({ emails: scoredEmails });
  } catch (error) {
    console.error('Gmail search error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}