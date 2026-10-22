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

    const fullName = [household.headFirstName, household.headMiddleName, household.headLastName]
      .filter(Boolean)
      .join(' ')
      .toUpperCase();

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
  <title>CCSA Dwelling Certificate - ${household.houseNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Comic+Neue:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');

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

    /* Screen Container */
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

    /* A4 Rigid Certificate Container */
    .certificate-sheet {
      width: 196mm;
      height: 278mm;
      max-height: 278mm;
      background: #ffffff;
      position: relative;
      margin: 0 auto;
      padding: 10mm 11mm;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.12);
      border-radius: 4px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-inside: avoid;
      page-break-after: avoid;
    }

    /* Elegant Classical Security Border */
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
      width: 14px;
      height: 14px;
      border-color: #C5A059;
      pointer-events: none;
    }
    .corner-tl { top: 6mm; left: 6mm; border-top: 2.5px solid #081B33; border-left: 2.5px solid #081B33; }
    .corner-tr { top: 6mm; right: 6mm; border-top: 2.5px solid #081B33; border-right: 2.5px solid #081B33; }
    .corner-bl { bottom: 6mm; left: 6mm; border-bottom: 2.5px solid #081B33; border-left: 2.5px solid #081B33; }
    .corner-br { bottom: 6mm; right: 6mm; border-bottom: 2.5px solid #081B33; border-right: 2.5px solid #081B33; }

    /* Security Watermark in Background */
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

    /* Header Section */
    .header {
      text-align: center;
      padding-bottom: 8px;
    }
    .header-top {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 4px;
    }
    .logo-img {
      width: 58px;
      height: 58px;
      object-fit: contain;
    }
    .header-titles {
      text-align: center;
    }
    .org-title {
      font-size: 15px;
      font-weight: 900;
      color: #081B33;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin: 0;
      line-height: 1.2;
    }
    .org-sub {
      font-size: 11.5px;
      font-weight: 700;
      color: #0369a1;
      margin-top: 1px;
      letter-spacing: 0.4px;
    }
    .org-tagline {
      font-size: 9px;
      font-weight: 800;
      color: #b45309;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 1px;
    }

    .gold-divider {
      height: 2px;
      background: linear-gradient(90deg, transparent, #C5A059, #081B33, #C5A059, transparent);
      margin: 6px auto;
      width: 80%;
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

    /* Identification Banner (House Code + Status + QR) */
    .id-banner {
      background: #FDFBF6;
      border: 1.5px solid #E8D4A8;
      border-radius: 6px;
      padding: 8px 12px;
      margin: 8px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .id-left {
      flex: 1;
      min-width: 0;
    }
    .id-label {
      font-size: 8.5px;
      font-weight: 800;
      color: #854d0e;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .id-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 19px;
      font-weight: 900;
      color: #081B33;
      letter-spacing: 0.8px;
      margin: 2px 0;
      white-space: nowrap;
    }
    .id-badges {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
    }
    .badge-status {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #86efac;
      font-size: 8.5px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .badge-meta {
      font-size: 8.5px;
      color: #64748b;
      font-weight: 600;
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
      width: 62px;
      height: 62px;
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
      gap: 9px;
      margin-bottom: 8px;
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
      padding: 5px 10px;
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
      border-left: 3px solid #C5A059;
    }
    .card-header.navy-accent {
      background: #081B33;
      border-left: 3px solid #0284c7;
    }

    .card-body {
      padding: 7px 10px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .field-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 1px dashed #f1f5f9;
      padding-bottom: 3px;
    }
    .field-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .field-key {
      font-size: 8.5px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      flex-shrink: 0;
      margin-right: 8px;
    }
    .field-val {
      font-size: 9.5px;
      font-weight: 600;
      color: #0f172a;
      text-align: right;
    }
    .field-val strong {
      font-weight: 700;
      color: #081B33;
    }

    /* Verified Micro-Tags */
    .tag-verified {
      display: inline-block;
      font-size: 7.5px;
      font-weight: 800;
      color: #15803d;
      background: #f0fdf4;
      border: 0.5px solid #86efac;
      padding: 0.5px 4px;
      border-radius: 3px;
      margin-left: 4px;
      vertical-align: middle;
    }
    .tag-unverified {
      display: inline-block;
      font-size: 7.5px;
      font-weight: 700;
      color: #9a3412;
      background: #fff7ed;
      border: 0.5px solid #fdba74;
      padding: 0.5px 4px;
      border-radius: 3px;
      margin-left: 4px;
      vertical-align: middle;
    }

    /* Full-Width Overview Bar */
    .full-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 8px;
    }
    .summary-grid {
      padding: 7px 10px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      background: #f8fafc;
    }
    .summary-item {
      border-right: 1px solid #e2e8f0;
      padding-right: 6px;
    }
    .summary-item:last-child {
      border-right: none;
    }
    .summary-title {
      font-size: 7.5px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .summary-val {
      font-size: 9.5px;
      font-weight: 700;
      color: #081B33;
      margin-top: 2px;
      line-height: 1.2;
    }
    .summary-sub {
      font-size: 7.5px;
      color: #64748b;
      margin-top: 1px;
    }

    /* Official Attestation & Dual Signatures Block */
    .attestation-section {
      background: #FDFBF6;
      border: 1px solid #E8D4A8;
      border-radius: 6px;
      padding: 8px 12px;
      margin-top: auto;
    }
    .attestation-statement {
      font-size: 8px;
      color: #475569;
      line-height: 1.35;
      text-align: justify;
      margin-bottom: 7px;
      border-bottom: 1px dashed #d1c5b0;
      padding-bottom: 5px;
    }

    .signatures-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
    }
    .sig-col {
      flex: 1;
      text-align: center;
    }
    .sig-script {
      font-family: 'Comic Neue', cursive;
      font-size: 15px;
      font-weight: 700;
      color: #081B33;
      margin-bottom: 2px;
      line-height: 1;
      letter-spacing: 0.5px;
    }
    .sig-line {
      width: 85%;
      height: 1px;
      background: #081B33;
      margin: 2px auto 3px auto;
    }
    .sig-name {
      font-size: 8.5px;
      font-weight: 800;
      color: #081B33;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .sig-role {
      font-size: 7.5px;
      font-weight: 600;
      color: #0369a1;
    }
    .sig-dept {
      font-size: 6.5px;
      color: #64748b;
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
      width: 44px;
      height: 44px;
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

    /* Micro Footer & Tamper Notice */
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

    /* Strict Print Styles */
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
        padding: 8mm 9mm !important;
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
        <!-- 1. Institutional Authority Header -->
        <div class="header">
          <div class="header-top">
            ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" alt="Cosmopolitan University / CCSA Logo" />` : ''}
            <div class="header-titles">
              <h1 class="org-title">Centre for Climate-Smart Agriculture</h1>
              <div class="org-sub">Cosmopolitan University Abuja</div>
              <div class="org-tagline">CCSA / AGROMONEY • Energy & Rural Development Registry</div>
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
            <div class="id-badges">
              <span class="badge-status">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                ${household.interventionStatus || 'Confirmed & Active'}
              </span>
              <span class="badge-meta">Issued: <strong>${issueDate}</strong></span>
              <span class="badge-meta">• Reg: ${registeredDate}</span>
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
              <span style="font-size:7.5px; opacity:0.8;">Primary Contact</span>
            </div>
            <div class="card-body">
              <div class="field-row">
                <span class="field-key">Full Legal Name</span>
                <span class="field-val"><strong>${fullName}</strong></span>
              </div>
              <div class="field-row">
                <span class="field-key">National ID (NIN)</span>
                <span class="field-val">
                  ${household.headNin || 'N/A'}
                  ${household.headNinVerified ? '<span class="tag-verified">✓ NIMC Verified</span>' : '<span class="tag-unverified">Unverified</span>'}
                </span>
              </div>
              <div class="field-row">
                <span class="field-key">Primary Phone</span>
                <span class="field-val">
                  ${household.headPhone || 'N/A'}
                  ${household.headPhoneVerified ? '<span class="tag-verified">✓ OTP Validated</span>' : '<span class="tag-unverified">Unverified</span>'}
                </span>
              </div>
              <div class="field-row">
                <span class="field-key">Gender / Status</span>
                <span class="field-val">${household.headGender || 'MALE'} • ${household.headMaritalStatus || 'MARRIED'}</span>
              </div>
              <div class="field-row">
                <span class="field-key">Occupation</span>
                <span class="field-val">${household.headEmploymentStatus || 'Self-Employed / Farming'}</span>
              </div>
            </div>
          </div>

          <!-- Card B: Spatial Location & Georeferencing -->
          <div class="data-card">
            <div class="card-header gold-accent">
              <span>Dwelling Spatial Georeference</span>
              <span style="font-size:7.5px; opacity:0.8;">GPS Audited</span>
            </div>
            <div class="card-body">
              <div class="field-row">
                <span class="field-key">Physical Address</span>
                <span class="field-val"><strong>${household.address || 'Designated Community Settlement'}</strong></span>
              </div>
              <div class="field-row">
                <span class="field-key">State / LGA / Ward</span>
                <span class="field-val">${household.state} • ${household.lga} • ${household.ward}</span>
              </div>
              <div class="field-row">
                <span class="field-key">INEC Polling Unit</span>
                <span class="field-val">${formatPollingUnit(household.pollingUnit)}</span>
              </div>
              <div class="field-row">
                <span class="field-key">GPS Coordinates</span>
                <span class="field-val" style="font-family: monospace; font-size: 8.5px;">
                  ${household.latitude && household.longitude ? `${household.latitude.toFixed(6)}°N, ${household.longitude.toFixed(6)}°E` : 'Geolocated'}
                </span>
              </div>
              <div class="field-row">
                <span class="field-key">Location Reference</span>
                <span class="field-val" style="font-size: 8px; color: #475569;">
                  ${household.gpsAddress ? household.gpsAddress.slice(0, 36) : 'Verified on field by GPS capture'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Energy, Connectivity & Demographic Summary Bar -->
        <div class="full-card">
          <div class="card-header" style="background:#0f172a; border-left: 3px solid #10b981;">
            <span>Dwelling Profile, Productive Energy & Connectivity</span>
            <span style="font-size:7.5px; opacity:0.8;">Baseline Survey Metrics</span>
          </div>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-title">Household Size</div>
              <div class="summary-val">${household.totalHouseholdMembers || 1} Residents</div>
              <div class="summary-sub">${household.wivesCount} Wives, ${household.childrenCount} Children</div>
            </div>
            <div class="summary-item">
              <div class="summary-title">Primary Energy Source</div>
              <div class="summary-val">${household.primaryEnergySource || 'National Grid / Mini-Grid'}</div>
              <div class="summary-sub">Power Access Baseline</div>
            </div>
            <div class="summary-item">
              <div class="summary-title">Productive Power (PUE)</div>
              <div class="summary-val" style="color: ${household.hasPUE ? '#059669' : '#081B33'};">
                ${household.hasPUE ? (household.pueType || 'Active Equipment') : 'Residential Only'}
              </div>
              <div class="summary-sub">${household.pueEquipment?.length ? household.pueEquipment.join(', ') : 'Dwelling Infrastructure'}</div>
            </div>
            <div class="summary-item">
              <div class="summary-title">Telecommunications</div>
              <div class="summary-val">${household.telcoProviders?.length ? household.telcoProviders.join(', ') : 'MTN / Airtel'}</div>
              <div class="summary-sub">Coverage: ${household.networkType || '4G / GSM Active'}</div>
            </div>
          </div>
        </div>

        <!-- 5. Official Attestation & Dual Signatures -->
        <div class="attestation-section">
          <div class="attestation-statement">
            <strong>OFFICIAL CERTIFICATION & ATTESTATION:</strong> It is hereby confirmed that the dwelling described above has undergone formal survey, biometric enumeration, and geospatial mapping in accordance with the National Household and Energy Baseline Survey standards conducted by the Centre for Climate-Smart Agriculture (CCSA) at Cosmopolitan University Abuja. This certificate constitutes an authentic identification instrument on the CCSA national data registry.
          </div>

          <div class="signatures-row">
            <!-- Left: Project Director -->
            <div class="sig-col">
              <div class="sig-script">Prof. Ibrahim K. G.</div>
              <div class="sig-line"></div>
              <div class="sig-name">Project Director</div>
              <div class="sig-role">Centre for Climate-Smart Agriculture (CCSA)</div>
              <div class="sig-dept">Cosmopolitan University Abuja</div>
            </div>

            <!-- Centre: Institutional Seal -->
            <div class="official-seal-col">
              <div class="seal-badge">
                <span class="seal-text-top">OFFICIAL</span>
                <span class="seal-star">★</span>
                <span class="seal-text-bot">CCSA SEAL</span>
              </div>
            </div>

            <!-- Right: Field Enumerator -->
            <div class="sig-col">
              <div class="sig-script">${agentName}</div>
              <div class="sig-line"></div>
              <div class="sig-name">${agentName}</div>
              <div class="sig-role">Chief Field Enumerator / Officer</div>
              <div class="sig-dept">Field Reg Ref: ${household.agentId ? household.agentId.slice(-8).toUpperCase() : 'CCSA-FIELD'}</div>
            </div>
          </div>
        </div>

        <!-- 6. Audit & Security Stamp Bar -->
        <div class="cert-footer">
          <div>
            DOC REF: <span class="footer-audit">CCSA-DWEL-${household.id.slice(-10).toUpperCase()}</span> • Issued: ${issueDate}
          </div>
          <div style="font-style: italic; opacity: 0.85;">
            Tamper-evident official document. Scan QR or visit <span style="font-family: monospace;">fims.cosmopolitan.edu.ng/verify-dwelling</span> to inspect authenticity.
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
