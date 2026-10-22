import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { formatPollingUnit, toTitleCase } from '@/lib/textUtils';
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

    // Load both logos as base64
    let certLogoBase64 = '';
    let ccsaLogoBase64 = '';
    try {
      const certLogoPath = path.join(process.cwd(), 'public', 'certificate-logo.png');
      if (fs.existsSync(certLogoPath)) {
        const fileBuffer = fs.readFileSync(certLogoPath);
        certLogoBase64 = `data:image/png;base64,${fileBuffer.toString('base64')}`;
      }

      const ccsaLogoPath = path.join(process.cwd(), 'public', 'ccsa-logo.png');
      if (fs.existsSync(ccsaLogoPath)) {
        const fileBuffer = fs.readFileSync(ccsaLogoPath);
        ccsaLogoBase64 = `data:image/png;base64,${fileBuffer.toString('base64')}`;
      }
    } catch (e) {
      console.warn('Could not read logos:', e);
    }

    // Determine verification URL
    const host = req.headers.get('host') || 'fims.cosmopolitan.edu.ng';
    const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${proto}://${host}`;
    const verificationUrl = `${baseUrl}/verify-dwelling/${household.houseNumber}`;

    // Generate high-resolution QR Code
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 280,
      color: {
        dark: '#081B33',
        light: '#FFFFFF',
      },
    });

    // Lookup cluster lead for this location
    let clusterLeadName = 'Sadiq Abdulaziz';
    try {
      const cluster = await prisma.cluster.findFirst({
        where: {
          OR: [
            { clusterLeadLGA: { equals: household.lga, mode: 'insensitive' } },
            { clusterLeadState: { equals: household.state, mode: 'insensitive' } },
            { title: { contains: household.lga, mode: 'insensitive' } },
          ],
        },
        select: {
          clusterLeadFirstName: true,
          clusterLeadLastName: true,
        },
      });

      if (cluster && (cluster.clusterLeadFirstName || cluster.clusterLeadLastName)) {
        clusterLeadName = `${cluster.clusterLeadFirstName || ''} ${cluster.clusterLeadLastName || ''}`.trim();
      }
    } catch (e) {
      console.warn('Could not query cluster lead:', e);
    }

    const formattedClusterLead = toTitleCase(clusterLeadName);
    const clusterLeadSig = clusterLeadName
      .split(' ')
      .filter(Boolean)
      .map((w, idx, arr) => (idx === arr.length - 1 ? toTitleCase(w) : `${w[0].toUpperCase()}.`))
      .join(' ');

    const rawFullName = [household.headFirstName, household.headMiddleName, household.headLastName]
      .filter(Boolean)
      .join(' ');
    const formattedFullName = toTitleCase(rawFullName);

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

    // Capitalized Location & Demographic details
    const formattedState = toTitleCase(household.state);
    const formattedLga = toTitleCase(household.lga);
    const formattedWard = toTitleCase(household.ward);
    const formattedAddress = toTitleCase(household.address) || 'Designated Community Settlement';
    const formattedPollingUnit = toTitleCase(formatPollingUnit(household.pollingUnit));
    const formattedGender = toTitleCase(household.headGender || 'Male');
    const formattedMarital = toTitleCase(household.headMaritalStatus || 'Married');
    const formattedOccupation = toTitleCase(household.headEmploymentStatus || 'Self-Employed / Farming');
    const formattedEnergy = toTitleCase(household.primaryEnergySource || 'National Grid / Solar');
    const formattedPue = household.hasPUE ? toTitleCase(household.pueType || 'Active Equipment') : 'Residential Only';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CCSA Official Dwelling Certificate - ${household.houseNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Great+Vibes&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');

    @page {
      size: A4 portrait;
      margin: 6mm 8mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: #e2e8f0;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }

    /* Screen Wrapper */
    .screen-wrap {
      padding: 20px 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .actions-bar {
      width: 100%;
      max-width: 196mm;
      margin-bottom: 14px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .btn {
      font-family: 'Inter', sans-serif;
      background: #081B33;
      color: #ffffff;
      border: 1px solid #081B33;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
      transition: background 0.15s ease;
    }
    .btn:hover {
      background: #0d2d53;
    }
    .btn-secondary {
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .btn-secondary:hover {
      background: #f1f5f9;
    }

    /* Rigid Single-Page A4 Certificate Container */
    .certificate-sheet {
      width: 196mm;
      background: #ffffff;
      position: relative;
      margin: 0 auto;
      padding: 8mm 10mm;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.12);
      border-radius: 4px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      page-break-inside: avoid;
      page-break-after: avoid;
    }

    /* Classical Security Framing */
    .security-border {
      position: absolute;
      top: 3mm;
      left: 3mm;
      right: 3mm;
      bottom: 3mm;
      border: 2px solid #081B33;
      border-radius: 6px;
      pointer-events: none;
    }
    .security-inner-border {
      position: absolute;
      top: 4.5mm;
      left: 4.5mm;
      right: 4.5mm;
      bottom: 4.5mm;
      border: 1px solid #C5A059;
      border-radius: 4px;
      pointer-events: none;
    }

    /* Corner Security Accents */
    .corner-ornament {
      position: absolute;
      width: 14px;
      height: 14px;
      border-color: #081B33;
      pointer-events: none;
    }
    .corner-tl { top: 5mm; left: 5mm; border-top: 2px solid #081B33; border-left: 2px solid #081B33; }
    .corner-tr { top: 5mm; right: 5mm; border-top: 2px solid #081B33; border-right: 2px solid #081B33; }
    .corner-bl { bottom: 5mm; left: 5mm; border-bottom: 2px solid #081B33; border-left: 2px solid #081B33; }
    .corner-br { bottom: 5mm; right: 5mm; border-bottom: 2px solid #081B33; border-right: 2px solid #081B33; }

    /* Security Watermark */
    .watermark {
      position: absolute;
      top: 48%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 80px;
      font-weight: 900;
      letter-spacing: 12px;
      color: rgba(8, 27, 51, 0.024);
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
      text-transform: uppercase;
    }

    .content-area {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
    }

    /* Header Section with Dual Logos */
    .header {
      text-align: center;
      padding-bottom: 4px;
    }
    .header-dual-logos {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .header-logo-wrap {
      width: 65px;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .header-logo-wrap.left-logo {
      justify-content: flex-start;
    }
    .header-logo-wrap.right-logo {
      justify-content: flex-end;
    }
    .logo-img {
      max-width: 65px;
      max-height: 50px;
      object-fit: contain;
    }
    .header-titles {
      flex: 1;
      text-align: center;
    }
    .org-title {
      font-size: 14px;
      font-weight: 900;
      color: #081B33;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      margin: 0;
      line-height: 1.15;
    }
    .org-sub {
      font-size: 11.5px;
      font-weight: 700;
      color: #0369a1;
      margin-top: 1.5px;
      letter-spacing: 0.3px;
    }
    .org-tagline {
      font-size: 8.5px;
      font-weight: 800;
      color: #b45309;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin-top: 1.5px;
    }

    .gold-divider {
      height: 2px;
      background: linear-gradient(90deg, transparent, #C5A059, #081B33, #C5A059, transparent);
      margin: 6px auto 5px auto;
      width: 85%;
    }

    .doc-main-title {
      font-size: 13.5px;
      font-weight: 900;
      color: #081B33;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin: 0;
    }
    .doc-caption {
      font-size: 9px;
      color: #64748b;
      font-weight: 500;
      letter-spacing: 0.2px;
      margin-top: 1px;
    }

    /* Structured Credential Tables */
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 7px;
    }
    .ledger-table th {
      background: #081B33;
      color: #ffffff;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4.5px 8px;
      text-align: left;
      border: 1px solid #081B33;
    }
    .ledger-table th.gold-header {
      background: #1e293b;
      border-left: 3px solid #C5A059;
    }
    .ledger-table th.green-header {
      background: #0f172a;
      border-left: 3px solid #10b981;
    }
    .ledger-table td {
      padding: 4.5px 8px;
      font-size: 9.5px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .cell-label {
      width: 28%;
      background: #f8fafc;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      font-size: 8.5px;
      letter-spacing: 0.3px;
    }
    .cell-val {
      font-weight: 600;
      color: #0f172a;
    }
    .cell-val strong {
      font-weight: 700;
      color: #081B33;
    }
    .font-mono {
      font-family: 'Courier New', Courier, monospace;
      letter-spacing: 0.4px;
    }

    /* Big Prominent Verification Section (With Dwelling Code below QR) */
    .verification-section {
      background: #FDFBF6;
      border: 1.5px solid #E8D4A8;
      border-radius: 6px;
      padding: 10px 14px;
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .qr-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .qr-large-img {
      width: 100px;
      height: 100px;
      display: block;
    }
    .qr-code-label {
      font-size: 7.5px;
      font-weight: 800;
      color: #854d0e;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-top: 4px;
    }
    .qr-dwelling-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      font-weight: 900;
      color: #081B33;
      letter-spacing: 0.8px;
      margin-top: 1px;
      white-space: nowrap;
    }

    .verification-info {
      flex: 1;
    }
    .ver-title {
      font-size: 10px;
      font-weight: 900;
      color: #081B33;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin: 0 0 3px 0;
    }
    .ver-desc {
      font-size: 8.5px;
      color: #475569;
      line-height: 1.4;
      margin: 0 0 5px 0;
    }
    .ver-url-box {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 3px 7px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 8.5px;
      font-weight: 700;
      color: #0369a1;
      word-break: break-all;
    }
    .ver-meta-row {
      margin-top: 5px;
      display: flex;
      gap: 12px;
      font-size: 8px;
      color: #64748b;
      font-weight: 600;
    }
    .ver-meta-row strong {
      color: #081B33;
    }

    /* Attestation & Dual Signatures Block */
    .attestation-section {
      background: #FDFBF6;
      border: 1.5px solid #E8D4A8;
      border-radius: 6px;
      padding: 8px 12px;
      margin-top: 8px;
    }
    .attestation-statement {
      font-size: 8px;
      color: #475569;
      line-height: 1.35;
      text-align: justify;
      margin-bottom: 6px;
      border-bottom: 1px dashed #d1c5b0;
      padding-bottom: 4px;
    }

    .signatures-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 14px;
    }
    .sig-col {
      flex: 1;
      text-align: center;
    }
    .font-signature {
      font-family: 'Great Vibes', 'Caveat', cursive;
      font-size: 22px;
      font-weight: 500;
      color: #081B33;
      margin-bottom: 1px;
      line-height: 1;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sig-line {
      width: 82%;
      height: 1.2px;
      background: #081B33;
      margin: 2px auto 3px auto;
    }
    .sig-name {
      font-size: 8.5px;
      font-weight: 800;
      color: #081B33;
      letter-spacing: 0.3px;
    }
    .sig-role {
      font-size: 7.5px;
      font-weight: 700;
      color: #0369a1;
      margin-top: 1px;
    }
    .sig-dept {
      font-size: 6.5px;
      color: #64748b;
      margin-top: 1px;
    }

    /* Official Embossed Seal Motif */
    .official-seal-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 65px;
      flex-shrink: 0;
    }
    .seal-badge {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px dashed #C5A059;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 0 0 2px rgba(8, 27, 51, 0.05);
    }
    .seal-text-top {
      font-size: 5px;
      font-weight: 900;
      color: #081B33;
      letter-spacing: 0.5px;
    }
    .seal-star {
      font-size: 9px;
      color: #C5A059;
      line-height: 1;
    }
    .seal-text-bot {
      font-size: 5px;
      font-weight: 800;
      color: #b45309;
    }

    /* Micro Footer */
    .cert-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 4px;
      margin-top: 5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7px;
      color: #64748b;
    }
    .footer-audit {
      font-family: 'Courier New', Courier, monospace;
      font-weight: 700;
      color: #081B33;
    }

    /* Print Setup: Strictly fits 1 Page */
    @media print {
      body {
        background: #ffffff !important;
      }
      .screen-wrap {
        padding: 0 !important;
        margin: 0 !important;
      }
      .actions-bar {
        display: none !important;
      }
      .certificate-sheet {
        box-shadow: none !important;
        border-radius: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        max-height: 278mm !important;
        margin: 0 !important;
        padding: 6mm 8mm !important;
        overflow: hidden !important;
        page-break-inside: avoid !important;
        page-break-after: avoid !important;
        page-break-before: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="screen-wrap">
    <!-- Action Toolbar (Hidden when printing) -->
    <div class="actions-bar">
      <button class="btn" onclick="window.print()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        Print / Save Official Certificate (A4)
      </button>
      <button class="btn btn-secondary" onclick="window.close()">
        Close Window
      </button>
    </div>

    <!-- Official Certificate Frame -->
    <div class="certificate-sheet">
      <!-- Classical Framing Lines -->
      <div class="security-border"></div>
      <div class="security-inner-border"></div>
      <div class="corner-ornament corner-tl"></div>
      <div class="corner-ornament corner-tr"></div>
      <div class="corner-ornament corner-bl"></div>
      <div class="corner-ornament corner-br"></div>
      <div class="watermark">CCSA VERIFIED</div>

      <div class="content-area">
        <!-- 1. Institutional Authority Header with Dual Logos -->
        <div class="header">
          <div class="header-dual-logos">
            <div class="header-logo-wrap left-logo">
              ${certLogoBase64 ? `<img src="${certLogoBase64}" class="logo-img" alt="Cosmopolitan University" />` : ''}
            </div>
            <div class="header-titles">
              <h1 class="org-title">Centre for Climate-Smart Agriculture</h1>
              <div class="org-sub">Cosmopolitan University Abuja</div>
              <div class="org-tagline">CCSA / AGROMONEY • Energy & Rural Development Registry</div>
            </div>
            <div class="header-logo-wrap right-logo">
              ${ccsaLogoBase64 ? `<img src="${ccsaLogoBase64}" class="logo-img" alt="CCSA Logo" />` : ''}
            </div>
          </div>
          <div class="gold-divider"></div>
          <div class="doc-main-title">Official Dwelling Identification & Energy Registry Document</div>
          <div class="doc-caption">National Household Georeferencing & Productive Energy Mapping System</div>
        </div>

        <!-- 2. Section 1: Head of Household Credential -->
        <table class="ledger-table">
          <thead>
            <tr>
              <th colspan="2">1. Head of Household Credential</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="cell-label">Full Legal Name</td>
              <td class="cell-val"><strong>${formattedFullName}</strong></td>
            </tr>
            <tr>
              <td class="cell-label">National Identity (NIN)</td>
              <td class="cell-val font-mono">${household.headNin || 'Not Provided'}</td>
            </tr>
            <tr>
              <td class="cell-label">Primary Phone Number</td>
              <td class="cell-val font-mono">${household.headPhone || 'Not Provided'}</td>
            </tr>
            <tr>
              <td class="cell-label">Demographic Details</td>
              <td class="cell-val">Gender: <strong>${formattedGender}</strong> · Marital Status: <strong>${formattedMarital}</strong> · Occupation: <strong>${formattedOccupation}</strong></td>
            </tr>
          </tbody>
        </table>

        <!-- 3. Section 2: Physical Location & Spatial Georeferencing -->
        <table class="ledger-table">
          <thead>
            <tr>
              <th colspan="2" class="gold-header">2. Physical Location & Spatial Georeferencing</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="cell-label">Full Dwelling Address</td>
              <td class="cell-val">
                <strong>${formattedAddress}</strong> · ${formattedWard}, ${formattedLga}, ${formattedState}
                ${household.gpsAddress ? `<div style="font-size:8.5px; color:#64748b; margin-top:1px;">GPS Reverse Address: ${household.gpsAddress}</div>` : ''}
              </td>
            </tr>
            <tr>
              <td class="cell-label">Administrative Boundary</td>
              <td class="cell-val">State: <strong>${formattedState}</strong> · LGA: <strong>${formattedLga}</strong> · Ward: <strong>${formattedWard}</strong></td>
            </tr>
            <tr>
              <td class="cell-label">Polling Unit (INEC)</td>
              <td class="cell-val"><strong>${formattedPollingUnit}</strong></td>
            </tr>
            <tr>
              <td class="cell-label">GPS Georeference</td>
              <td class="cell-val font-mono">
                ${household.latitude && household.longitude ? `Latitude: ${household.latitude.toFixed(6)}° N, Longitude: ${household.longitude.toFixed(6)}° E (Audited Field Capture)` : 'Georeferenced'}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 4. Section 3: Household Occupancy & Energy Profile -->
        <table class="ledger-table">
          <thead>
            <tr>
              <th colspan="2" class="green-header">3. Household Demographics & Energy Profile</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="cell-label">Registered Occupants</td>
              <td class="cell-val">
                <strong>${household.totalHouseholdMembers || 1} Residents</strong> (${household.wivesCount || 0} Wives, ${household.childrenCount || 0} Children, ${household.otherDependentsCount || 0} Dependents)
              </td>
            </tr>
            <tr>
              <td class="cell-label">Primary Energy Source</td>
              <td class="cell-val"><strong>${formattedEnergy}</strong> (Baseline Power Access)</td>
            </tr>
            <tr>
              <td class="cell-label">Productive Use of Energy (PUE)</td>
              <td class="cell-val">
                ${household.hasPUE ? `<strong style="color:#059669;">Active Productive Equipment on Site</strong> (${formattedPue})` : 'Residential Dwelling Only'}
                ${household.pueEquipment?.length ? `<span style="font-size:8.5px; color:#475569;"> · Equipment: ${household.pueEquipment.join(', ')}</span>` : ''}
              </td>
            </tr>
            <tr>
              <td class="cell-label">Telecommunications</td>
              <td class="cell-val">
                Providers: <strong>${household.telcoProviders?.length ? household.telcoProviders.join(', ') : 'MTN / Airtel'}</strong> · Coverage: <strong>${household.networkType || 'GSM / 4G'}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 5. Big Prominent Verification Section with Dwelling Code Directly Below It -->
        <div class="verification-section">
          <div class="qr-column">
            <img src="${qrCodeDataUrl}" class="qr-large-img" alt="Official Tamper-Evident QR Verification" />
            <div class="qr-code-label">Dwelling Identifier Code</div>
            <div class="qr-dwelling-code">${household.houseNumber}</div>
          </div>
          <div class="verification-info">
            <div class="ver-title">Cryptographic Tamper-Evident Verification</div>
            <div class="ver-desc">
              Scan this QR code with any smartphone camera or optical reader to instantly authenticate this dwelling credential, verify surveyor attribution, and inspect official registry records on the national CCSA database.
            </div>
            <div class="ver-url-box">${verificationUrl}</div>
            <div class="ver-meta-row">
              <span>Cataloged: <strong>${registeredDate}</strong></span>
              <span>Document Issue Date: <strong>${issueDate}</strong></span>
              <span>Security Stamp: <strong>CCSA-DWEL-VALID</strong></span>
            </div>
          </div>
        </div>

        <!-- 6. Official Attestation & Dual Signatures -->
        <div class="attestation-section">
          <div class="attestation-statement">
            <strong>OFFICIAL CERTIFICATION & ATTESTATION:</strong> It is hereby confirmed that the dwelling described above has undergone formal survey, biometric enumeration, and geospatial mapping in accordance with the National Household and Energy Baseline Survey standards conducted by the Centre for Climate-Smart Agriculture (CCSA) at Cosmopolitan University Abuja. This certificate constitutes an authentic identification instrument on the CCSA national data registry.
          </div>

          <div class="signatures-row">
            <!-- Left: Cluster Lead -->
            <div class="sig-col">
              <div class="sig-script font-signature">${clusterLeadSig}</div>
              <div class="sig-line"></div>
              <div class="sig-name">${formattedClusterLead}</div>
              <div class="sig-role">Cluster Lead</div>
              <div class="sig-dept">CCSA Field Operations Authority</div>
            </div>

            <!-- Centre: Institutional Gold Seal -->
            <div class="official-seal-col">
              <div class="seal-badge">
                <span class="seal-text-top">OFFICIAL</span>
                <span class="seal-star">★</span>
                <span class="seal-text-bot">CCSA SEAL</span>
              </div>
            </div>

            <!-- Right: Center CEO -->
            <div class="sig-col">
              <div class="sig-script font-signature">Dr. R. A. Kanya</div>
              <div class="sig-line"></div>
              <div class="sig-name">Dr. Rislan Abdulaziz Kanya</div>
              <div class="sig-role">Centre CEO</div>
              <div class="sig-dept">Centre for Climate-Smart Agriculture (CCSA)</div>
            </div>
          </div>
        </div>

        <!-- 7. Micro-Audit Reference Footer -->
        <div class="cert-footer">
          <div>
            DOC REF: <span class="footer-audit">CCSA-DWEL-${household.id.slice(-10).toUpperCase()}</span> · Issued: ${issueDate}
          </div>
          <div style="font-style: italic; opacity: 0.85;">
            Official State Record · Unauthorized reproduction or modification without cryptographic verification key is prohibited.
          </div>
          <div>
            PAGE 1 OF 1 (OFFICIAL)
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
