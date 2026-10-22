import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { formatPollingUnit } from '@/lib/textUtils';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const household = await prisma.household.findFirst({
      where: {
        OR: [
          { id },
          { houseNumber: id },
          { offlineId: id },
        ],
      },
      include: {
        agent: {
          select: {
            displayName: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!household) {
      return new NextResponse('Household record not found', { status: 404 });
    }

    // Load logo as base64
    let logoBase64 = '';
    try {
      const logoPath = path.join(process.cwd(), 'public', 'certificate-logo.png');
      if (fs.existsSync(logoPath)) {
        const fileBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${fileBuffer.toString('base64')}`;
      }
    } catch (e) {
      console.warn('Could not read certificate-logo.png:', e);
    }

    // Determine verification URL
    const host = req.headers.get('host') || 'fims.cosmopolitan.edu.ng';
    const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${proto}://${host}`;
    const verificationUrl = `${baseUrl}/verify-dwelling/${household.houseNumber}`;

    // Generate QR Code data URL
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 180,
      color: {
        dark: '#081B33',
        light: '#FFFFFF',
      },
    });

    const fullName = [household.headFirstName, household.headMiddleName, household.headLastName]
      .filter(Boolean)
      .join(' ');

    const issueDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const registeredDate = new Date(household.createdAt).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const agentName = household.agent
      ? household.agent.displayName || `${household.agent.firstName || ''} ${household.agent.lastName || ''}`.trim()
      : 'CCSA Field Enumerator';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dwelling Document - ${household.houseNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: #f1f5f9;
      color: #0f172a;
    }
    .page-container {
      max-width: 820px;
      margin: 20px auto;
      background: #ffffff;
      padding: 24px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }
    .outer-frame {
      border: 3px solid #081B33;
      border-radius: 12px;
      padding: 24px;
      position: relative;
      background: #ffffff;
    }
    .inner-frame {
      border: 1px solid #C5A059;
      border-radius: 8px;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding-bottom: 14px;
      border-bottom: 2px solid #081B33;
      margin-bottom: 16px;
    }
    .logo-img {
      width: 78px;
      height: 78px;
      object-fit: contain;
      margin-bottom: 8px;
    }
    .org-title {
      font-size: 15px;
      font-weight: 900;
      color: #081B33;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin: 0;
    }
    .org-sub {
      font-size: 13px;
      font-weight: 700;
      color: #0369a1;
      margin: 2px 0 0 0;
    }
    .org-tagline {
      font-size: 11px;
      font-weight: 800;
      color: #b45309;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin: 3px 0 0 0;
    }
    .divider {
      height: 2px;
      background: linear-gradient(90deg, transparent, #C5A059, #081B33, #C5A059, transparent);
      margin: 10px auto;
      width: 85%;
    }
    .doc-title {
      font-size: 16px;
      font-weight: 900;
      color: #081B33;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin: 0;
    }
    .doc-sub {
      font-size: 10.5px;
      color: #64748b;
      margin: 2px 0 0 0;
      font-weight: 600;
    }
    .house-code-box {
      background: #f8fafc;
      border: 2px solid #081B33;
      border-radius: 8px;
      padding: 10px 16px;
      text-align: center;
      margin: 14px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .house-code-label {
      font-size: 10px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      text-align: left;
    }
    .house-code-val {
      font-family: 'Courier New', Courier, monospace;
      font-size: 20px;
      font-weight: 900;
      color: #081B33;
      letter-spacing: 1px;
      text-align: left;
    }
    .status-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 6px;
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .auth-banner {
      display: flex;
      gap: 16px;
      align-items: center;
      background: #fdfbf7;
      border: 1px solid #e2d9c8;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
    }
    .qr-container {
      width: 100px;
      height: 100px;
      flex-shrink: 0;
      background: #ffffff;
      padding: 4px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-container img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .auth-text {
      flex: 1;
    }
    .auth-headline {
      font-size: 11px;
      font-weight: 800;
      color: #081B33;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 3px 0;
    }
    .auth-desc {
      font-size: 10px;
      color: #475569;
      line-height: 1.4;
      margin: 0 0 4px 0;
    }
    .auth-url {
      font-family: monospace;
      font-size: 9.5px;
      color: #0369a1;
      font-weight: 700;
      word-break: break-all;
    }
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    .ledger-table th {
      background: #081B33;
      color: #ffffff;
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 7px 10px;
      text-align: left;
      border: 1px solid #081B33;
    }
    .ledger-table td {
      padding: 6px 10px;
      font-size: 11px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .cell-label {
      width: 32%;
      background: #f8fafc;
      font-weight: 700;
      color: #475569;
    }
    .cell-val {
      font-weight: 600;
      color: #0f172a;
    }
    .badge-validated {
      display: inline-block;
      font-size: 9px;
      font-weight: 800;
      padding: 1.5px 6px;
      border-radius: 4px;
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
      margin-left: 6px;
    }
    .badge-unvalidated {
      display: inline-block;
      font-size: 9px;
      font-weight: 800;
      padding: 1.5px 6px;
      border-radius: 4px;
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
      margin-left: 6px;
    }
    .footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 10px;
      margin-top: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 9px;
      color: #64748b;
    }
    .footer-left {
      max-width: 65%;
      line-height: 1.4;
    }
    .footer-right {
      text-align: right;
      font-weight: 700;
      font-family: monospace;
    }
    .actions-bar {
      margin-bottom: 16px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .btn {
      background: #081B33;
      color: white;
      border: none;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn:hover {
      background: #0369a1;
    }
    @media print {
      body {
        background: #ffffff;
      }
      .page-container {
        max-width: 100%;
        margin: 0;
        padding: 0;
        box-shadow: none;
      }
      .actions-bar {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="actions-bar">
      <button class="btn" onclick="window.print()">Print / Save as PDF</button>
      <button class="btn" style="background:#475569;" onclick="window.close()">Close Window</button>
    </div>

    <div class="outer-frame">
      <div class="inner-frame">
        <!-- Header -->
        <div class="header">
          ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" alt="CCSA Logo" />` : ''}
          <h1 class="org-title">Centre for Climate-Smart Agriculture</h1>
          <div class="org-sub">Cosmopolitan University Abuja</div>
          <div class="org-tagline">CCSA / AGROMONEY • Energy & Rural Development</div>
          <div class="divider"></div>
          <h2 class="doc-title">Official Dwelling Identification & Energy Registry Document</h2>
          <div class="doc-sub">National Household Georeferencing & Productive Energy Mapping System</div>
        </div>

        <!-- House Code Box -->
        <div class="house-code-box">
          <div>
            <div class="house-code-label">Standardized House Code</div>
            <div class="house-code-val">${household.houseNumber}</div>
          </div>
          <div>
            <span class="status-badge">Registry Status: ${household.interventionStatus}</span>
          </div>
        </div>

        <!-- Cryptographic QR & Verification Block -->
        <div class="auth-banner">
          <div class="qr-container">
            <img src="${qrCodeDataUrl}" alt="Verification QR Code" />
          </div>
          <div class="auth-text">
            <div class="auth-headline">Cryptographic Tamper-Evident Verification</div>
            <div class="auth-desc">
              Scan this QR code with any smartphone camera or QR reader to verify authenticity and inspect complete live credentials on the CCSA National Registry.
            </div>
            <div class="auth-url">${verificationUrl}</div>
          </div>
        </div>

        <!-- 1. Head of Household Ledger -->
        <table class="ledger-table">
          <thead>
            <tr>
              <th colspan="2">1. Head of Household Credential</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="cell-label">Full Legal Name</td>
              <td class="cell-val">${fullName}</td>
            </tr>
            <tr>
              <td class="cell-label">National Identity (NIN)</td>
              <td class="cell-val">
                ${household.headNin || 'N/A'}
                ${household.headNinVerified ? '<span class="badge-validated">✓ NIMC Confirmed</span>' : '<span class="badge-unvalidated">Unverified</span>'}
              </td>
            </tr>
            <tr>
              <td class="cell-label">Primary Phone Number</td>
              <td class="cell-val">
                ${household.headPhone || 'N/A'}
                ${household.headPhoneVerified ? '<span class="badge-validated">✓ Validated via OTP</span>' : '<span class="badge-unvalidated">Not Validated</span>'}
              </td>
            </tr>
            <tr>
              <td class="cell-label">Demographic Details</td>
              <td class="cell-val">
                Gender: ${household.headGender || 'MALE'} • Marital: ${household.headMaritalStatus || 'N/A'} • Occupation: ${household.headEmploymentStatus || 'N/A'}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 2. Physical Location & Administrative Mapping -->
        <table class="ledger-table">
          <thead>
            <tr>
              <th colspan="2">2. Physical Location & Spatial Georeferencing</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="cell-label">Full Dwelling Address</td>
              <td class="cell-val">
                ${household.address ? `<strong>${household.address}</strong><br />` : ''}
                ${[household.ward, household.lga, household.state].filter(Boolean).join(', ')}
                ${household.gpsAddress ? `<div style="font-size:10px; color:#64748b; margin-top:2px;">GPS Addr: ${household.gpsAddress}</div>` : ''}
              </td>
            </tr>
            <tr>
              <td class="cell-label">Administrative Boundary</td>
              <td class="cell-val">State: <strong>${household.state}</strong> • LGA: <strong>${household.lga}</strong> • Ward: <strong>${household.ward}</strong></td>
            </tr>
            <tr>
              <td class="cell-label">Polling Unit (INEC)</td>
              <td class="cell-val">${formatPollingUnit(household.pollingUnit)}</td>
            </tr>
            <tr>
              <td class="cell-label">GPS Georeference</td>
              <td class="cell-val" style="font-family: monospace;">
                ${household.latitude && household.longitude ? `Lat: ${household.latitude.toFixed(6)}, Lng: ${household.longitude.toFixed(6)}` : 'Captured'}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 3. Occupancy & Productive Energy Profile -->
        <table class="ledger-table">
          <thead>
            <tr>
              <th colspan="2">3. Household Demographics & Energy Profile</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="cell-label">Registered Occupants</td>
              <td class="cell-val">
                <strong>${household.totalHouseholdMembers || 1} Residents</strong> (${household.wivesCount} Wives, ${household.childrenCount} Children, ${household.otherDependentsCount} Dependents)
              </td>
            </tr>
            <tr>
              <td class="cell-label">Primary Energy Source</td>
              <td class="cell-val">${household.primaryEnergySource || 'Grid / Standalone Solar / None'}</td>
            </tr>
            <tr>
              <td class="cell-label">Productive Use of Energy (PUE)</td>
              <td class="cell-val">
                ${household.hasPUE ? '<strong style="color:#059669;">Active Productive Equipment on Site</strong>' : 'Residential Dwelling Only'}
                ${household.pueType ? ` (${household.pueType})` : ''}
                ${household.pueEquipment?.length ? `<br /><span style="font-size:10px; color:#475569;">Equipment: ${household.pueEquipment.join(', ')}</span>` : ''}
              </td>
            </tr>
            <tr>
              <td class="cell-label">Telecommunications</td>
              <td class="cell-val">
                Providers: ${household.telcoProviders?.join(', ') || 'Active'} • Coverage: ${household.networkType || 'GSM'}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Footer -->
        <div class="footer">
          <div class="footer-left">
            Issued: <strong>${issueDate}</strong> • Registered: ${registeredDate} • Enumerator: ${agentName}<br />
            This official document is generated and cryptographically cataloged by CCSA at Cosmopolitan University Abuja. Unauthorized alteration is a violation of federal law.
          </div>
          <div class="footer-right">
            DOC REF: ${household.id.slice(-10).toUpperCase()}<br />
            CCSA-DWELLING-REG
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Dwelling document generation error:', error);
    return new NextResponse(`Failed to generate dwelling document: ${error.message}`, { status: 500 });
  }
}
