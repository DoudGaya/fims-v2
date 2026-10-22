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

    // Generate high-definition QR Code
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220,
      color: {
        dark: '#081B33',
        light: '#FFFFFF',
      },
    });

    // Lookup cluster lead for this location
    let clusterLeadName = 'M. B. Garkida';
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

    // Capitalized Location Hierarchy
    const formattedState = toTitleCase(household.state);
    const formattedLga = toTitleCase(household.lga);
    const formattedWard = toTitleCase(household.ward);
    const formattedAddress = toTitleCase(household.address) || 'Designated Community Settlement';
    const formattedPollingUnit = toTitleCase(formatPollingUnit(household.pollingUnit));
    const formattedGender = toTitleCase(household.headGender || 'Male');
    const formattedMarital = toTitleCase(household.headMaritalStatus || 'Married');
    const formattedOccupation = toTitleCase(household.headEmploymentStatus || 'Self-Employed / Farming');
    const formattedEnergy = toTitleCase(household.primaryEnergySource || 'National Grid / Standalone Solar');
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

    /* Screen Wrap */
    .screen-wrap {
      padding: 24px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .actions-bar {
      width: 100%;
      max-width: 196mm;
      margin-bottom: 16px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .btn {
      font-family: 'Inter', sans-serif;
      background: #081B33;
      color: #ffffff;
      border: 1px solid #081B33;
      padding: 9px 18px;
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

    /* Rigid A4 Certificate Container */
    .certificate-sheet {
      width: 196mm;
      min-height: 278mm;
      max-height: 278mm;
      background: #ffffff;
      position: relative;
      margin: 0 auto;
      padding: 11mm 12mm;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.12);
      border-radius: 4px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-inside: avoid;
      page-break-after: avoid;
    }

    /* Classical Security Framing */
    .security-border {
      position: absolute;
      top: 3.5mm;
      left: 3.5mm;
      right: 3.5mm;
      bottom: 3.5mm;
      border: 2px solid #081B33;
      border-radius: 6px;
      pointer-events: none;
    }
    .security-inner-border {
      position: absolute;
      top: 5.2mm;
      left: 5.2mm;
      right: 5.2mm;
      bottom: 5.2mm;
      border: 1px solid #C5A059;
      border-radius: 4px;
      pointer-events: none;
    }

    /* Corner Security Accents */
    .corner-ornament {
      position: absolute;
      width: 15px;
      height: 15px;
      border-color: #081B33;
      pointer-events: none;
    }
    .corner-tl { top: 6mm; left: 6mm; border-top: 2.5px solid #081B33; border-left: 2.5px solid #081B33; }
    .corner-tr { top: 6mm; right: 6mm; border-top: 2.5px solid #081B33; border-right: 2.5px solid #081B33; }
    .corner-bl { bottom: 6mm; left: 6mm; border-bottom: 2.5px solid #081B33; border-left: 2.5px solid #081B33; }
    .corner-br { bottom: 6mm; right: 6mm; border-bottom: 2.5px solid #081B33; border-right: 2.5px solid #081B33; }

    /* Watermark */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 88px;
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
      height: 100%;
      justify-content: space-between;
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
      gap: 14px;
    }
    .header-logo-wrap {
      width: 70px;
      height: 60px;
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
      max-width: 68px;
      max-height: 58px;
      object-fit: contain;
    }
    .header-titles {
      flex: 1;
      text-align: center;
    }
    .org-title {
      font-size: 15px;
      font-weight: 900;
      color: #081B33;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      margin: 0;
      line-height: 1.2;
    }
    .org-sub {
      font-size: 12px;
      font-weight: 700;
      color: #0369a1;
      margin-top: 1.5px;
      letter-spacing: 0.3px;
    }
    .org-tagline {
      font-size: 9px;
      font-weight: 800;
      color: #b45309;
      letter-spacing: 0.9px;
      text-transform: uppercase;
      margin-top: 2px;
    }

    .gold-divider {
      height: 2px;
      background: linear-gradient(90deg, transparent, #C5A059, #081B33, #C5A059, transparent);
      margin: 7px auto 5px auto;
      width: 82%;
    }

    .doc-main-title {
      font-size: 14.5px;
      font-weight: 900;
      color: #081B33;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin: 2px 0 0 0;
    }
    .doc-caption {
      font-size: 9.5px;
      color: #64748b;
      font-weight: 500;
      letter-spacing: 0.2px;
      margin-top: 1px;
    }

    /* Identification Banner (House Code + Dates + QR) */
    .id-banner {
      background: #FDFBF6;
      border: 1.5px solid #E8D4A8;
      border-radius: 6px;
      padding: 10px 14px;
      margin: 9px 0 11px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
    }
    .id-left {
      flex: 1;
      min-width: 0;
    }
    .id-label {
      font-size: 9px;
      font-weight: 800;
      color: #854d0e;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .id-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 20px;
      font-weight: 900;
      color: #081B33;
      letter-spacing: 0.8px;
      margin: 3px 0 4px 0;
      white-space: nowrap;
    }
    .id-meta-row {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 9px;
      color: #475569;
      font-weight: 500;
    }
    .meta-item strong {
      font-weight: 700;
      color: #081B33;
    }
    .meta-dot {
      color: #cbd5e1;
      font-weight: 900;
    }

    .id-qr {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      padding: 4px 8px;
      border-radius: 5px;
      border: 1px solid #cbd5e1;
      flex-shrink: 0;
    }
    .qr-img {
      width: 60px;
      height: 60px;
      display: block;
    }
    .qr-text {
      max-width: 95px;
      line-height: 1.25;
    }
    .qr-title {
      font-size: 8px;
      font-weight: 900;
      color: #081B33;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .qr-sub {
      font-size: 7px;
      color: #64748b;
      margin-top: 1px;
    }

    /* Core Data Cards Grid (2-Column) */
    .grid-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 11px;
      margin-bottom: 10px;
    }

    .data-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
    }
    .card-header {
      background: #081B33;
      color: #ffffff;
      padding: 6px 12px;
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-header.gold-accent {
      background: #1e293b;
      border-left: 3.5px solid #C5A059;
    }
    .card-header.navy-accent {
      background: #081B33;
      border-left: 3.5px solid #0284c7;
    }
    .header-tag {
      font-size: 7.5px;
      opacity: 0.85;
      font-weight: 600;
    }

    .card-body {
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 7.5px;
    }

    .field-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 1px dashed #f1f5f9;
      padding-bottom: 4px;
    }
    .field-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .field-key {
      font-size: 9px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      flex-shrink: 0;
      margin-right: 8px;
    }
    .field-val {
      font-size: 10px;
      font-weight: 600;
      color: #0f172a;
      text-align: right;
    }
    .field-val strong {
      font-weight: 700;
      color: #081B33;
    }
    .font-mono {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10px;
      letter-spacing: 0.4px;
    }

    /* Full-Width Overview Bar */
    .full-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 11px;
    }
    .summary-grid {
      padding: 10px 14px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      background: #f8fafc;
    }
    .summary-item {
      border-right: 1px solid #e2e8f0;
      padding-right: 8px;
    }
    .summary-item:last-child {
      border-right: none;
    }
    .summary-title {
      font-size: 8px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .summary-val {
      font-size: 10.5px;
      font-weight: 700;
      color: #081B33;
      margin-top: 3px;
      line-height: 1.25;
    }
    .summary-sub {
      font-size: 8px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Attestation & Dual Signatures Block */
    .attestation-section {
      background: #FDFBF6;
      border: 1.5px solid #E8D4A8;
      border-radius: 6px;
      padding: 10px 14px;
      margin-top: auto;
    }
    .attestation-statement {
      font-size: 8.5px;
      color: #475569;
      line-height: 1.4;
      text-align: justify;
      margin-bottom: 8px;
      border-bottom: 1px dashed #d1c5b0;
      padding-bottom: 6px;
    }

    .signatures-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      padding-top: 4px;
    }
    .sig-col {
      flex: 1;
      text-align: center;
    }
    .font-signature {
      font-family: 'Great Vibes', 'Caveat', cursive;
      font-size: 24px;
      font-weight: 500;
      color: #081B33;
      margin-bottom: 2px;
      line-height: 1.1;
      letter-spacing: 0.5px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sig-line {
      width: 85%;
      height: 1.2px;
      background: #081B33;
      margin: 2px auto 4px auto;
    }
    .sig-name {
      font-size: 9px;
      font-weight: 800;
      color: #081B33;
      letter-spacing: 0.3px;
    }
    .sig-role {
      font-size: 8px;
      font-weight: 700;
      color: #0369a1;
      margin-top: 1px;
    }
    .sig-dept {
      font-size: 7px;
      color: #64748b;
      margin-top: 1px;
    }

    /* Official Embossed Seal Motif */
    .official-seal-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 78px;
      flex-shrink: 0;
    }
    .seal-badge {
      width: 46px;
      height: 46px;
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
      font-size: 5.5px;
      font-weight: 900;
      color: #081B33;
      letter-spacing: 0.5px;
    }
    .seal-star {
      font-size: 10px;
      color: #C5A059;
      line-height: 1;
    }
    .seal-text-bot {
      font-size: 5.5px;
      font-weight: 800;
      color: #b45309;
    }

    /* Micro Footer & Audit Trail */
    .cert-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 5px;
      margin-top: 6px;
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

    /* Print Setup */
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
        height: 278mm !important;
        max-height: 278mm !important;
        margin: 0 !important;
        padding: 9mm 10mm !important;
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
        <!-- 1. Header with Dual Logos -->
        <div class="header">
          <div class="header-dual-logos">
            <div class="header-logo-wrap left-logo">
              ${certLogoBase64 ? `<img src="${certLogoBase64}" class="logo-img" alt="Cosmopolitan University Logo" />` : ''}
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
          <div class="doc-main-title">Official Dwelling Identification Certificate</div>
          <div class="doc-caption">National Household Georeferencing, Demographics & Energy Survey Registry</div>
        </div>

        <!-- 2. Primary Identification & Verification QR Strip -->
        <div class="id-banner">
          <div class="id-left">
            <div class="id-label">Official Dwelling Identification Code</div>
            <div class="id-code">${household.houseNumber}</div>
            <div class="id-meta-row">
              <span class="meta-item">Issued: <strong>${issueDate}</strong></span>
              <span class="meta-dot">•</span>
              <span class="meta-item">Registered: <strong>${registeredDate}</strong></span>
              <span class="meta-dot">•</span>
              <span class="meta-item">Registry Ref: <strong>${household.id.slice(-8).toUpperCase()}</strong></span>
            </div>
          </div>
          <div class="id-qr">
            <img src="${qrCodeDataUrl}" class="qr-img" alt="Tamper-Evident QR Verification" />
            <div class="qr-text">
              <div class="qr-title">Scan to Verify</div>
              <div class="qr-sub">Instant live registry audit via smartphone camera</div>
            </div>
          </div>
        </div>

        <!-- 3. Two-Column Information Cards: Head of Household & Spatial Location -->
        <div class="grid-row">
          <!-- Card A: Head of Household Credentials -->
          <div class="data-card">
            <div class="card-header navy-accent">
              <span>Head of Household Credentials</span>
              <span class="header-tag">Primary Contact</span>
            </div>
            <div class="card-body">
              <div class="field-row">
                <span class="field-key">Full Legal Name</span>
                <span class="field-val"><strong>${formattedFullName}</strong></span>
              </div>
              <div class="field-row">
                <span class="field-key">National ID (NIN)</span>
                <span class="field-val font-mono">${household.headNin || 'Not Provided'}</span>
              </div>
              <div class="field-row">
                <span class="field-key">Primary Phone</span>
                <span class="field-val font-mono">${household.headPhone || 'Not Provided'}</span>
              </div>
              <div class="field-row">
                <span class="field-key">Gender & Status</span>
                <span class="field-val">${formattedGender} • ${formattedMarital}</span>
              </div>
              <div class="field-row">
                <span class="field-key">Occupation</span>
                <span class="field-val">${formattedOccupation}</span>
              </div>
            </div>
          </div>

          <!-- Card B: Spatial Location & Georeferencing -->
          <div class="data-card">
            <div class="card-header gold-accent">
              <span>Dwelling Spatial Georeference</span>
              <span class="header-tag">GPS Audited</span>
            </div>
            <div class="card-body">
              <div class="field-row">
                <span class="field-key">Physical Address</span>
                <span class="field-val"><strong>${formattedAddress}</strong></span>
              </div>
              <div class="field-row">
                <span class="field-key">State & LGA</span>
                <span class="field-val"><strong>${formattedState}</strong> • <strong>${formattedLga}</strong></span>
              </div>
              <div class="field-row">
                <span class="field-key">Ward Boundary</span>
                <span class="field-val"><strong>${formattedWard}</strong></span>
              </div>
              <div class="field-row">
                <span class="field-key">INEC Polling Unit</span>
                <span class="field-val">${formattedPollingUnit}</span>
              </div>
              <div class="field-row">
                <span class="field-key">GPS Georeference</span>
                <span class="field-val font-mono">
                  ${household.latitude && household.longitude ? `${household.latitude.toFixed(6)}° N, ${household.longitude.toFixed(6)}° E` : 'Geolocated'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Energy, Connectivity & Demographic Summary Bar -->
        <div class="full-card">
          <div class="card-header" style="background:#0f172a; border-left: 3.5px solid #10b981;">
            <span>Dwelling Profile, Productive Energy & Infrastructure</span>
            <span class="header-tag">Baseline Survey Metrics</span>
          </div>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-title">Household Occupancy</div>
              <div class="summary-val">${household.totalHouseholdMembers || 1} Residents</div>
              <div class="summary-sub">${household.wivesCount || 0} Wives • ${household.childrenCount || 0} Children</div>
            </div>
            <div class="summary-item">
              <div class="summary-title">Primary Energy Source</div>
              <div class="summary-val">${formattedEnergy}</div>
              <div class="summary-sub">Power Access Baseline</div>
            </div>
            <div class="summary-item">
              <div class="summary-title">Productive Power (PUE)</div>
              <div class="summary-val" style="color: ${household.hasPUE ? '#059669' : '#081B33'};">
                ${formattedPue}
              </div>
              <div class="summary-sub">${household.pueEquipment?.length ? toTitleCase(household.pueEquipment.join(', ')) : 'Standard Domestic Load'}</div>
            </div>
            <div class="summary-item">
              <div class="summary-title">Telecommunications</div>
              <div class="summary-val">${household.telcoProviders?.length ? household.telcoProviders.join(', ') : 'MTN / Airtel'}</div>
              <div class="summary-sub">Network: ${household.networkType || '4G / GSM Active'}</div>
            </div>
          </div>
        </div>

        <!-- 5. Official Attestation & Dual Signatures -->
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

        <!-- 6. Micro-Audit Reference Footer -->
        <div class="cert-footer">
          <div>
            DOC REF: <span class="footer-audit">CCSA-DWEL-${household.id.slice(-10).toUpperCase()}</span> • Issued: ${issueDate}
          </div>
          <div style="font-style: italic; opacity: 0.85;">
            Tamper-evident official document. Scan QR to inspect live credentials on <span style="font-family: monospace;">fims.cosmopolitan.edu.ng</span>
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
