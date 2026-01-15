import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const states = await prisma.state.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      states: states
    });
  } catch (error) {
    console.error('Error fetching states:', error);
    
    // Fallback data in case of database issues
    const fallbackStates = [
      { id: 'abia', name: 'Abia', code: 'AB' },
      { id: 'adamawa', name: 'Adamawa', code: 'AD' },
      { id: 'akwa-ibom', name: 'Akwa Ibom', code: 'AK' },
      { id: 'anambra', name: 'Anambra', code: 'AN' },
      { id: 'bauchi', name: 'Bauchi', code: 'BA' },
      { id: 'bayelsa', name: 'Bayelsa', code: 'BY' },
      { id: 'benue', name: 'Benue', code: 'BE' },
      { id: 'borno', name: 'Borno', code: 'BO' },
      { id: 'cross-river', name: 'Cross River', code: 'CR' },
      { id: 'delta', name: 'Delta', code: 'DE' },
      { id: 'ebonyi', name: 'Ebonyi', code: 'EB' },
      { id: 'edo', name: 'Edo', code: 'ED' },
      { id: 'ekiti', name: 'Ekiti', code: 'EK' },
      { id: 'enugu', name: 'Enugu', code: 'EN' },
      { id: 'fct', name: 'FCT - Abuja', code: 'FC' },
      { id: 'gombe', name: 'Gombe', code: 'GO' },
      { id: 'imo', name: 'Imo', code: 'IM' },
      { id: 'jigawa', name: 'Jigawa', code: 'JI' },
      { id: 'kaduna', name: 'Kaduna', code: 'KD' },
      { id: 'kano', name: 'Kano', code: 'KN' },
      { id: 'katsina', name: 'Katsina', code: 'KT' },
      { id: 'kebbi', name: 'Kebbi', code: 'KE' },
      { id: 'kogi', name: 'Kogi', code: 'KO' },
      { id: 'kwara', name: 'Kwara', code: 'KW' },
      { id: 'lagos', name: 'Lagos', code: 'LA' },
      { id: 'nasarawa', name: 'Nasarawa', code: 'NA' },
      { id: 'niger', name: 'Niger', code: 'NI' },
      { id: 'ogun', name: 'Ogun', code: 'OG' },
      { id: 'ondo', name: 'Ondo', code: 'ON' },
      { id: 'osun', name: 'Osun', code: 'OS' },
      { id: 'oyo', name: 'Oyo', code: 'OY' },
      { id: 'plateau', name: 'Plateau', code: 'PL' },
      { id: 'rivers', name: 'Rivers', code: 'RI' },
      { id: 'sokoto', name: 'Sokoto', code: 'SO' },
      { id: 'taraba', name: 'Taraba', code: 'TA' },
      { id: 'yobe', name: 'Yobe', code: 'YO' },
      { id: 'zamfara', name: 'Zamfara', code: 'ZA' }
    ];

    return NextResponse.json({
      success: true,
      states: fallbackStates,
      note: 'Using fallback data due to database error'
    });
  }
}
