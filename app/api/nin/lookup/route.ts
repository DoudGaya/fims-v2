import { NextRequest, NextResponse } from 'next/server';
import ProductionLogger from '@/lib/productionLogger';

// NIN API configuration
const NIN_API_BASE_URL = process.env.NIN_API_BASE_URL;
const NIN_API_KEY = process.env.NIN_API_KEY;

// Function to lookup NIN from external API
async function lookupNINFromAPI(nin: string) {
  try {
    const url = `${NIN_API_BASE_URL}/api/lookup/nin?op=level-4&nin=${nin}`;
    
    ProductionLogger.debug(`Making NIN API request for NIN: ****${nin.slice(-4)}`);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "api-key": NIN_API_KEY || ''
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    ProductionLogger.debug("NIN Verification Response status:", data.status);
    
    // Check if the API returned success
    if (data.status === 200 && data.data) {
      return data.data;
    } else {
      // Handle specific "norecord" case
      if (data.message === 'norecord' || data.status === 404) {
        const error: any = new Error('NIN not found');
        error.code = 'NIN_NOT_FOUND';
        throw error;
      }
      throw new Error(data.message || 'NIN not found or invalid');
    }
  } catch (error: any) {
    // Pass through specific errors
    if (error.code === 'NIN_NOT_FOUND') throw error;
    
    ProductionLogger.error('NIN API lookup error:', error.message);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nin } = body;

    if (!nin) {
      return NextResponse.json({ error: 'NIN is required' }, { status: 400 });
    }

    if (!NIN_API_BASE_URL || !NIN_API_KEY) {
      ProductionLogger.warn('NIN API not configured');
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          data: {
            firstname: 'Test',
            lastname: 'User',
            nin: nin
          }
        });
      }
      return NextResponse.json({ error: 'NIN verification service unavailable' }, { status: 503 });
    }

    const result = await lookupNINFromAPI(nin);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    ProductionLogger.error('NIN lookup error:', error.message);
    return NextResponse.json({ 
      error: error.message || 'Failed to lookup NIN' 
    }, { status: 500 });
  }
}
