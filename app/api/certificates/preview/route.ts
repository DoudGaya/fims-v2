import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { CertificateGenerator } from '@/lib/certificate-generator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/certificates/preview?farmerId=xxx
 * Returns the PDF inline (for <iframe> embedding) without saving to DB.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const farmerId = req.nextUrl.searchParams.get('farmerId');
    if (!farmerId) {
      return NextResponse.json({ error: 'farmerId is required' }, { status: 400 });
    }

    const farmer = await prisma.farmer.findUnique({
      where: { id: farmerId },
      include: {
        farms: true,
        cluster: true,
      },
    });

    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }

    const generator = new CertificateGenerator();
    const pdfArrayBuffer = await generator.generateFarmerCertificate(farmer, farmer.cluster);

    return new NextResponse(pdfArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        // "inline" tells the browser to render it rather than download
        'Content-Disposition': `inline; filename="CCSA-Preview-${farmer.firstName}-${farmer.lastName}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Certificate preview error:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
