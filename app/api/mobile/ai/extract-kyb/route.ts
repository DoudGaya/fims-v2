import { NextRequest, NextResponse } from 'next/server';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const authResult = await getMobileUser(req);
    if ('error' in authResult) return authResult.error;

    const { user } = authResult;
    const roleError = requireRole(user, 'agri_business_agent', 'admin');
    if (roleError) return roleError;

    const body = await req.json();
    const { imageBase64 } = body; 

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
       console.error('GEMINI_API_KEY is missing.');
       return NextResponse.json({ error: 'AI capabilities are currently unavailable due to missing API key.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
            {
                role: 'user',
                parts: [
                    { 
                        inlineData: {
                            data: base64Data,
                            mimeType: 'image/jpeg'
                        }
                    },
                    {
                        text: "Extract the following business information from this document (which is likely a Nigerian CAC certificate or a business card). Output ONLY a valid JSON object with these exact keys: 'businessName', 'cacNumber' (or registration number), 'tin' (Tax Identification Number), 'contactName', 'address', 'servicesOffered' (any product samples, services rendered, or description of business activities). If a field is not found, leave it as null."
                    }
                ]
            }
        ],
        config: {
            responseMimeType: "application/json",
        }
    });

    if (!response.text) {
        throw new Error('No response text generated');
    }
    
    const extractedData = JSON.parse(response.text);

    return NextResponse.json(extractedData);

  } catch (error: any) {
    console.error('Error extracting KYB data:', error);
    return NextResponse.json({ error: 'Failed to extract data', details: error.message }, { status: 500 });
  }
}
