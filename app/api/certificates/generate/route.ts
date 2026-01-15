import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { CertificateGenerator } from '@/lib/certificate-generator';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optional: Check permissions
    // const hasPerms = await checkPermission(session.user.id, 'FARMERS_READ');
    // if (!hasPerms) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { farmerId } = body;

    if (!farmerId) {
      return NextResponse.json({ error: 'Farmer ID is required' }, { status: 400 });
    }

    // Fetch farmer, farms, and cluster
    const farmer = await prisma.farmer.findUnique({
      where: { id: farmerId },
      include: {
        farms: true,
        cluster: true
      }
    });

    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }

    // Generate Certificate
    const generator = new CertificateGenerator();
    const pdfArrayBuffer = await generator.generateFarmerCertificate(farmer, farmer.cluster);

    // Save certificate record
    const certificateId = `CCSA-${new Date().getFullYear()}-${farmerId.slice(-6).toUpperCase()}`;

    await prisma.certificate.upsert({
      where: { certificateId },
      update: {
        issuedDate: new Date(),
        status: 'active',
        qrCode: certificateId
      },
      create: {
        certificateId,
        farmerId,
        issuedDate: new Date(),
        status: 'active',
        qrCode: certificateId
      }
    });

    // Return PDF
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="CCSA-Certificate-${farmer.firstName}-${farmer.lastName}.pdf"`);

    return new NextResponse(pdfArrayBuffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Certificate generation error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
