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
      return {
        isValid: true,
        firstName: data.data.firstname || data.data.firstName,
        middleName: data.data.middlename || data.data.middleName,
        lastName: data.data.lastname || data.data.lastName,
        dateOfBirth: data.data.birthdate || data.data.dateOfBirth,
        gender: data.data.gender?.toUpperCase() || 'MALE',
        maritalStatus: data.data.maritalstatus || data.data.maritalStatus,
        phone: data.data.telephoneno || data.data.phone,
        email: data.data.email,
        photo: data.data.photo,
        title: data.data.title,
        religion: data.data.religion,
        profession: data.data.profession,
        educationlevel: data.data.educationlevel,
        nin: nin
      };
    } else {
      throw new Error(data.message || 'NIN not found or invalid');
    }
  } catch (error: any) {
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
      // Mock response for development if API not configured
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          data: {
            isValid: true,
            firstName: 'Test',
            lastName: 'User',
            nin: nin,
            gender: 'MALE'
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
    ProductionLogger.error('NIN verification error:', error.message);
    return NextResponse.json({ 
      error: error.message || 'Failed to verify NIN' 
    }, { status: 500 });
  }
}
