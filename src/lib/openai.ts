import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateEmailContent(params: {
  recipient: string;
  instructions: string;
}) {
  try {
    const { recipient, instructions } = params;
    
    const prompt = `
    Please compose an email to ${recipient} based on the following instructions:
    "${instructions}"
    
    Format the response as a JSON object with the following fields:
    - subject: A concise, relevant subject line for the email
    - body: The complete email body
    `;
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : '{}';
      const content = JSON.parse(jsonStr);
      
      return {
        subject: content.subject || "Email Subject",
        body: content.body || "Email body content not generated."
      };
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      // Fallback response if parsing fails
      return {
        subject: "Email Subject",
        body: text || "Email body content not generated."
      };
    }
  } catch (error) {
    console.error('Error generating email content:', error);
    throw new Error('Failed to generate email content');
  }
}

export async function generateEmailReply(params: {
  originalEmail: {
    from: string;
    to: string;
    subject: string;
    body: string;
    date: string;
  };
  tone?: string;
  userInstructions?: string;
}) {
  try {
    const { originalEmail, tone = 'professional', userInstructions = '' } = params;
    
    const prompt = `
    Original Email:
    From: ${originalEmail.from}
    To: ${originalEmail.to}
    Subject: ${originalEmail.subject}
    Date: ${originalEmail.date}
    Body: ${originalEmail.body.substring(0, 1500)}${originalEmail.body.length > 1500 ? '...' : ''}

    Please compose a reply to this email with a ${tone} tone.
    ${userInstructions ? `Additional instructions: ${userInstructions}` : ''}
    `;
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text || "I couldn't generate a reply.";
  } catch (error) {
    console.error('Error generating email reply:', error);
    throw new Error('Failed to generate email reply');
  }
} 