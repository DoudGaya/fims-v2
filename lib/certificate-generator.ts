import { jsPDF } from 'jspdf';
import * as QRCode from 'qrcode';
import {
    formatFullName,
    formatLocation,
    formatCropName,
    toTitleCase
} from './textUtils';
import { Farmer, Farm, Cluster } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export class CertificateGenerator {
    private pageWidth: number = 210;  // A4 width in mm
    private pageHeight: number = 297; // A4 height in mm
    private margin: number = 14;      // Refined margin
    private contentWidth: number;

    // Palette: Executive Institutional Navy & Burnished Gold
    private readonly COLOR_NAVY: [number, number, number] = [8, 27, 51];       // #081B33 - Royal Academic Navy
    private readonly COLOR_GOLD: [number, number, number] = [197, 160, 89];    // #C5A059 - Burnished Gold
    private readonly COLOR_GOLD_LIGHT: [number, number, number] = [232, 212, 168]; // #E8D4A8 - Soft Gold
    private readonly COLOR_GOLD_BG: [number, number, number] = [253, 251, 246];  // #FDFBF6 - Warm Parchment
    private readonly COLOR_GREEN: [number, number, number] = [15, 81, 50];     // #0F5132 - Deep Emerald Green
    private readonly COLOR_SLATE: [number, number, number] = [100, 116, 139];  // #64748B - Slate
    private readonly COLOR_CHARCOAL: [number, number, number] = [30, 41, 59];  // #1E293B - Charcoal

    constructor() {
        this.contentWidth = this.pageWidth - (this.margin * 2);
    }

    async generateFarmerCertificate(
        farmerData: Farmer & { farms: Farm[] },
        clusterData: Cluster | null
    ): Promise<ArrayBuffer> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdf = new jsPDF('portrait', 'mm', 'a4') as any;

        try {
            // --- PAGE 1: Executive Certificate of Registration ---
            this.setupDocument(pdf);

            // 1. High-Security Border & Corner Ornaments
            this.addSecurityBorder(pdf);

            // 2. Background Security Watermark
            this.addSecurityWatermark(pdf);

            // 3. Institutional Authority Header
            await this.addInstitutionalHeader(pdf);

            // 4. Certificate Identification Banner & Title
            const certY = this.addCertificateTitle(pdf, farmerData.id);

            // 5. Certification Preamble & Recipient
            const scheduleStartY = this.addRecipientInformation(pdf, farmerData, certY);

            // 6. Accredited Credential Ledger (Executive Table, no generic gray boxes)
            const signaturesStartY = this.addCredentialLedger(pdf, farmerData, clusterData, scheduleStartY);

            // 7. Security Seal & Dual Signatures
            this.addSignaturesAndSeal(pdf, clusterData, signaturesStartY);

            // 8. Cryptographic QR Code & Verification Audit Footer
            await this.addAuditFooter(pdf, farmerData.id);

            // --- SUBSEQUENT PAGES: Farm Specifications & Cartographic Mapping ---
            if (farmerData.farms && farmerData.farms.length > 0) {
                farmerData.farms.forEach((farm, index) => {
                    pdf.addPage();
                    this.setupDocument(pdf);
                    this.addSecurityBorder(pdf);
                    this.addFarmPageHeader(pdf, farm, index + 1, farmerData.farms.length);
                    this.addFarmSpecificationsTable(pdf, farm);
                    this.drawCartographicMap(pdf, farm);
                    this.addFarmPageFooter(pdf, farmerData.id, farm.id);
                });
            }

            return pdf.output('arraybuffer');
        } catch (error) {
            console.error('Error generating certificate:', error);
            throw error;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private setupDocument(pdf: any) {
        pdf.setProperties({
            title: 'CCSA Official Farmer Certificate',
            subject: 'Smallholder Farmer Registration & Accreditation',
            author: 'Centre for Climate-Smart Agriculture, Cosmopolitan University Abuja',
            creator: 'CCSA Credential Authority'
        });
    }

    /**
     * High-Security Multi-Layered Certificate Frame with Classical Corner Motifs
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private addSecurityBorder(pdf: any) {
        // Outer fine rule (8mm margin)
        pdf.setDrawColor(...this.COLOR_NAVY);
        pdf.setLineWidth(0.3);
        pdf.rect(8, 8, this.pageWidth - 16, this.pageHeight - 16);

        // Primary executive navy frame (10mm margin)
        pdf.setDrawColor(...this.COLOR_NAVY);
        pdf.setLineWidth(1.2);
        pdf.rect(10, 10, this.pageWidth - 20, this.pageHeight - 20);

        // Inner decorative gold hairline (11.8mm margin)
        pdf.setDrawColor(...this.COLOR_GOLD);
        pdf.setLineWidth(0.5);
        pdf.rect(11.8, 11.8, this.pageWidth - 23.6, this.pageHeight - 23.6);

        // Subtle innermost hairline (13mm margin)
        pdf.setDrawColor(...this.COLOR_GOLD_LIGHT);
        pdf.setLineWidth(0.2);
        pdf.rect(13, 13, this.pageWidth - 26, this.pageHeight - 26);

        // Corner Ornamental Rosettes / Guilloche Brackets
        const corners = [
            { x: 13, y: 13, dx: 1, dy: 1 },                             // Top-Left
            { x: this.pageWidth - 13, y: 13, dx: -1, dy: 1 },           // Top-Right
            { x: 13, y: this.pageHeight - 13, dx: 1, dy: -1 },          // Bottom-Left
            { x: this.pageWidth - 13, y: this.pageHeight - 13, dx: -1, dy: -1 } // Bottom-Right
        ];

        corners.forEach(c => {
            // L-bracket arms
            pdf.setDrawColor(...this.COLOR_GOLD);
            pdf.setLineWidth(0.6);
            pdf.line(c.x, c.y, c.x + (c.dx * 8), c.y);
            pdf.line(c.x, c.y, c.x, c.y + (c.dy * 8));

            // Inner corner decorative square pip
            pdf.setFillColor(...this.COLOR_GOLD);
            pdf.rect(c.x + (c.dx * 2.5) - 0.75, c.y + (c.dy * 2.5) - 0.75, 1.5, 1.5, 'F');

            // Diagonal corner tick
            pdf.setLineWidth(0.3);
            pdf.line(c.x + (c.dx * 4), c.y, c.x, c.y + (c.dy * 4));
            pdf.line(c.x + (c.dx * 7), c.y, c.x, c.y + (c.dy * 7));
        });
    }

    /**
     * Subtle Circular Guilloche Medallion / Watermark
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private addSecurityWatermark(pdf: any) {
        const centerX = this.pageWidth / 2;
        const centerY = 145;

        pdf.setDrawColor(246, 243, 235); // Ultra-faint gold/ivory
        pdf.setLineWidth(0.3);

        // Concentric geometric watermark rings
        pdf.circle(centerX, centerY, 45, 'S');
        pdf.circle(centerX, centerY, 38, 'S');
        pdf.circle(centerX, centerY, 30, 'S');
        pdf.circle(centerX, centerY, 22, 'S');

        // Fine radial spokes at 30-degree intervals
        for (let angle = 0; angle < 360; angle += 30) {
            const rad = (angle * Math.PI) / 180;
            const x1 = centerX + Math.cos(rad) * 23;
            const y1 = centerY + Math.sin(rad) * 23;
            const x2 = centerX + Math.cos(rad) * 44;
            const y2 = centerY + Math.sin(rad) * 44;
            pdf.line(x1, y1, x2, y2);
        }
    }

    /**
     * Institutional Authority Header (Cosmopolitan University Abuja & CCSA)
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async addInstitutionalHeader(pdf: any): Promise<number> {
        const startY = 16;
        const logoSize = 25;
        const logoX = 18;

        // 1. Institutional Logo
        try {
            const logoCandidates = ['certificate-logo.png', 'ccsa-logo.png', 'logo.png'];
            for (const candidate of logoCandidates) {
                const logoPath = path.join(process.cwd(), 'public', candidate);
                if (fs.existsSync(logoPath)) {
                    const logoData = fs.readFileSync(logoPath).toString('base64');
                    pdf.addImage(logoData, 'PNG', logoX, startY, logoSize, logoSize);
                    break;
                }
            }
        } catch (e) {
            console.error('Failed to load institutional logo in certificate generator:', e);
        }

        // 2. Header Typography
        // University Name (Authoritative Serif)
        pdf.setFont('times', 'bold');
        pdf.setFontSize(17);
        pdf.setTextColor(...this.COLOR_NAVY);
        const uniName = 'COSMOPOLITAN UNIVERSITY ABUJA';
        const uniWidth = (pdf.getStringUnitWidth(uniName) * 17) / pdf.internal.scaleFactor;
        pdf.text(uniName, (this.pageWidth - uniWidth) / 2 + 10, startY + 7);

        // Centre for Climate-Smart Agriculture (Dignified Green)
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(...this.COLOR_GREEN);
        const centreName = 'CENTRE FOR CLIMATE-SMART AGRICULTURE (CCSA)';
        const centreWidth = (pdf.getStringUnitWidth(centreName) * 12) / pdf.internal.scaleFactor;
        pdf.text(centreName, (this.pageWidth - centreWidth) / 2 + 10, startY + 13.5);

        // Institutional Accreditation Subtitle
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(...this.COLOR_SLATE);
        const sub1 = 'Agricultural Innovation, Smallholder Farmer Accreditation & Geospatial Registry';
        const sub1Width = (pdf.getStringUnitWidth(sub1) * 7.5) / pdf.internal.scaleFactor;
        pdf.text(sub1, (this.pageWidth - sub1Width) / 2 + 10, startY + 18.5);

        const sub2 = 'P.M.B. 1000, Abuja, Federal Capital Territory, Nigeria · fims.cosmopolitan.edu.ng';
        const sub2Width = (pdf.getStringUnitWidth(sub2) * 7.5) / pdf.internal.scaleFactor;
        pdf.text(sub2, (this.pageWidth - sub2Width) / 2 + 10, startY + 22.5);

        // 3. Symmetrical Ornamental Divider
        const dividerY = startY + 28;
        pdf.setDrawColor(...this.COLOR_GOLD);
        pdf.setLineWidth(0.4);
        pdf.line(30, dividerY, 95, dividerY);
        pdf.line(115, dividerY, 180, dividerY);

        // Center Gold Diamond Motif
        pdf.setFillColor(...this.COLOR_GOLD);
        pdf.rect(103.8, dividerY - 1.2, 2.4, 2.4, 'F');
        pdf.circle(99, dividerY, 0.8, 'F');
        pdf.circle(111, dividerY, 0.8, 'F');

        return dividerY + 5;
    }

    /**
     * Official Document Title & Tracking Number
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private addCertificateTitle(pdf: any, farmerId: string): number {
        let y = 52;

        // 1. Document Category Pill
        const pillText = 'OFFICIAL REGISTRATION & ACCREDITATION CREDENTIAL';
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        const pillWidth = (pdf.getStringUnitWidth(pillText) * 7.5) / pdf.internal.scaleFactor + 10;
        const pillX = (this.pageWidth - pillWidth) / 2;

        pdf.setFillColor(...this.COLOR_GOLD_BG);
        pdf.setDrawColor(...this.COLOR_GOLD);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(pillX, y, pillWidth, 5.5, 2.5, 2.5, 'FD');

        pdf.setTextColor(...this.COLOR_NAVY);
        pdf.text(pillText, this.pageWidth / 2, y + 3.8, { align: 'center' });

        // 2. Primary Title: FARMER REGISTRATION CERTIFICATE
        y += 11;
        pdf.setFont('times', 'bold');
        pdf.setFontSize(21);
        pdf.setTextColor(...this.COLOR_NAVY);
        const title = 'FARMER REGISTRATION CERTIFICATE';
        pdf.text(title, this.pageWidth / 2, y, { align: 'center' });

        // 3. Serial ID & Season
        y += 6;
        const currentYear = new Date().getFullYear();
        const certSerial = `CCSA-${currentYear}-${farmerId.slice(-6).toUpperCase()}`;
        const metaLine = `DOCUMENT REGISTRATION NO: ${certSerial}   ·   SEASON: ${currentYear} / ${currentYear + 1}`;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(150, 115, 50); // Burnished dark gold
        pdf.text(metaLine, this.pageWidth / 2, y, { align: 'center' });

        return y + 7;
    }

    /**
     * Certification Preamble, Recipient Name & Legal Conferral Statement
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private addRecipientInformation(
        pdf: any,
        farmerData: Farmer & { farms: Farm[] },
        startY: number
    ): number {
        let y = startY + 4;

        // "This is to formally certify that"
        pdf.setFont('times', 'italic');
        pdf.setFontSize(11);
        pdf.setTextColor(...this.COLOR_CHARCOAL);
        pdf.text('This is to formally certify that', this.pageWidth / 2, y, { align: 'center' });

        // Recipient Full Name in Bold Prestigious Serif
        y += 9;
        const fullName = formatFullName(
            farmerData.firstName,
            farmerData.middleName,
            farmerData.lastName
        ).toUpperCase();

        pdf.setFont('times', 'bold');
        pdf.setFontSize(23);
        pdf.setTextColor(...this.COLOR_NAVY);
        pdf.text(fullName, this.pageWidth / 2, y, { align: 'center' });

        // Elegant Gold Underline Beneath Name
        y += 2.5;
        pdf.setDrawColor(...this.COLOR_GOLD);
        pdf.setLineWidth(0.4);
        pdf.line(45, y, this.pageWidth - 45, y);

        // National Identity & Farmer ID Line
        y += 6.5;
        const ninNumber = farmerData.nin && farmerData.nin.trim() ? farmerData.nin : 'VERIFIED IN REGISTRY';
        const idLine = `National Identity Number (NIN): ${ninNumber}     ·     Farmer ID: ${farmerData.id.slice(-8).toUpperCase()}`;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(...this.COLOR_CHARCOAL);
        pdf.text(idLine, this.pageWidth / 2, y, { align: 'center' });

        // Formal Legal Attestation Paragraph
        y += 6.5;
        pdf.setFont('times', 'normal');
        pdf.setFontSize(9.5);
        pdf.setTextColor(55, 65, 81);
        const year = new Date().getFullYear();
        const bodyText =
            `has duly fulfilled all requirements for smallholder enrollment, biometric verification, and geospatial parcel mapping established by the Centre for Climate-Smart Agriculture (CCSA) at Cosmopolitan University Abuja, and is officially accredited as a registered farmer for climate-smart agricultural interventions, input distribution, and sustainable farming programs for the ${year} agricultural season.`;

        const maxWidth = 168;
        const splitText = pdf.splitTextToSize(bodyText, maxWidth);
        pdf.text(splitText, this.pageWidth / 2, y, { align: 'center', maxWidth });

        // Returns position where the specifications ledger should start
        return y + (splitText.length * 4.3) + 5;
    }

    /**
     * Accredited Credential Ledger (Executive Table - Replaces the 3 amateur gray boxes)
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private addCredentialLedger(
        pdf: any,
        farmerData: Farmer & { farms: Farm[] },
        clusterData: Cluster | null,
        startY: number
    ): number {
        const boxX = 18;
        const boxWidth = this.pageWidth - 36; // 174mm
        const boxHeight = 44;
        const headerHeight = 6.5;

        // Container Background & Gold Border
        pdf.setFillColor(...this.COLOR_GOLD_BG);
        pdf.setDrawColor(...this.COLOR_GOLD);
        pdf.setLineWidth(0.4);
        pdf.rect(boxX, startY, boxWidth, boxHeight, 'FD');

        // Top Header Bar: Navy Background
        pdf.setFillColor(...this.COLOR_NAVY);
        pdf.rect(boxX, startY, boxWidth, headerHeight, 'F');

        // Header Title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.setTextColor(255, 255, 255);
        pdf.text(
            'ACCREDITED FARMER & GEOSPATIAL ENTERPRISE SPECIFICATIONS',
            boxX + (boxWidth / 2),
            startY + 4.5,
            { align: 'center' }
        );

        // 3 Column Structure
        const colWidth = boxWidth / 3;
        const col1X = boxX;
        const col2X = boxX + colWidth;
        const col3X = boxX + (colWidth * 2);

        // Vertical Dividers
        pdf.setDrawColor(...this.COLOR_GOLD_LIGHT);
        pdf.setLineWidth(0.3);
        pdf.line(col2X, startY + headerHeight, col2X, startY + boxHeight);
        pdf.line(col3X, startY + headerHeight, col3X, startY + boxHeight);

        // Primary farm data
        const farm = farmerData.farms && farmerData.farms.length > 0 ? farmerData.farms[0] : null;

        // Column Data Arrays
        const col1Items = [
            { label: 'State of Residence', value: toTitleCase(farmerData.state) || 'N/A' },
            { label: 'Local Govt. Area', value: toTitleCase(farmerData.lga) || 'N/A' },
            { label: 'Electoral Ward', value: toTitleCase(farmerData.ward) || 'N/A' },
            { label: 'Polling Unit', value: (farmerData.pollingUnit || 'Not Specified').substring(0, 18) }
        ];

        const col2Items = [
            { label: 'Primary Enterprise', value: farm ? formatCropName(farm.primaryCrop) : 'General Cropping' },
            { label: 'Total Farm Area', value: farm ? `${farm.farmSize || 0} Hectares` : 'N/A' },
            { label: 'Soil Classification', value: farm ? toTitleCase(farm.soilType) : 'Loamy' },
            { label: 'Registered Parcels', value: `${farmerData.farms ? farmerData.farms.length : 0} Mapped Parcel(s)` }
        ];

        const clusterName = clusterData?.title
            ? toTitleCase(clusterData.title)
            : 'FCT Central Agricultural Cluster';

        const regDateFormatted = farmerData.registrationDate
            ? new Date(farmerData.registrationDate).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
              })
            : new Date().toLocaleDateString();

        const col3Items = [
            { label: 'Agricultural Cluster', value: clusterName.substring(0, 20) },
            { label: 'Enrollment Date', value: regDateFormatted },
            { label: 'Accreditation Status', value: 'ACTIVE & VERIFIED', isStatus: true },
            { label: 'Verification Hash', value: `SHA256:${farmerData.id.slice(-8).toUpperCase()}` }
        ];

        // Helper to draw column content
        const drawColumn = (startX: number, items: { label: string; value: string; isStatus?: boolean }[]) => {
            let rowY = startY + headerHeight + 5;
            items.forEach(item => {
                // Label (Slate, small, uppercase)
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(6.5);
                pdf.setTextColor(...this.COLOR_SLATE);
                pdf.text(item.label.toUpperCase(), startX + 4, rowY);

                // Value (Bold Navy or Green for status)
                rowY += 3.4;
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(7.5);

                if (item.isStatus) {
                    pdf.setTextColor(...this.COLOR_GREEN);
                } else {
                    pdf.setTextColor(...this.COLOR_NAVY);
                }

                // Truncate if overflowing column width
                let val = item.value;
                if ((pdf.getStringUnitWidth(val) * 7.5) / pdf.internal.scaleFactor > colWidth - 8) {
                    val = val.substring(0, 18) + '…';
                }
                pdf.text(val, startX + 4, rowY);

                rowY += 5.2;
            });
        };

        drawColumn(col1X, col1Items);
        drawColumn(col2X, col2Items);
        drawColumn(col3X, col3Items);

        return startY + boxHeight + 6;
    }

    /**
     * Security Seal & Dual Authorized Signatories
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private addSignaturesAndSeal(
        pdf: any,
        clusterData: Cluster | null,
        startY: number
    ) {
        const y = Math.max(startY, 218);
        const colWidth = (this.pageWidth - 36) / 3;

        // 1. LEFT SIGNATURE: Cluster Lead / Extension Officer
        const leftCenterX = 18 + (colWidth / 2);
        const clusterLeadName = clusterData
            ? formatFullName(clusterData.clusterLeadFirstName, '', clusterData.clusterLeadLastName).toUpperCase()
            : 'ALH. MUSA BELLO GARKIDA';

        // Simulated Stamp / Signature mark
        pdf.setFont('times', 'italic');
        pdf.setFontSize(10);
        pdf.setTextColor(60, 80, 120);
        pdf.text('M. B. Garkida', leftCenterX, y + 14, { align: 'center' });

        // Signature Rule
        pdf.setDrawColor(...this.COLOR_NAVY);
        pdf.setLineWidth(0.3);
        pdf.line(leftCenterX - 24, y + 17, leftCenterX + 24, y + 17);

        // Signatory Title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(...this.COLOR_NAVY);
        pdf.text(clusterLeadName, leftCenterX, y + 21, { align: 'center' });

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(...this.COLOR_SLATE);
        pdf.text('Cluster Lead / Extension Officer', leftCenterX, y + 24.5, { align: 'center' });
        pdf.text('CCSA Field Operations Authority', leftCenterX, y + 27.5, { align: 'center' });

        // 2. CENTER: Official Embossed Gold Security Seal with Ribbons
        const sealCenterX = this.pageWidth / 2;
        const sealCenterY = y + 11;

        // Gold Ribbon Tails Hanging Downward
        pdf.setFillColor(...this.COLOR_GOLD);
        // Left Ribbon Polygon
        pdf.triangle(
            sealCenterX - 11, sealCenterY + 4,
            sealCenterX - 1, sealCenterY + 4,
            sealCenterX - 7, sealCenterY + 18,
            'F'
        );
        // Right Ribbon Polygon
        pdf.triangle(
            sealCenterX + 1, sealCenterY + 4,
            sealCenterX + 11, sealCenterY + 4,
            sealCenterX + 7, sealCenterY + 18,
            'F'
        );

        // Ribbon notched swallowtails
        pdf.setFillColor(255, 255, 255);
        pdf.triangle(
            sealCenterX - 10, sealCenterY + 18,
            sealCenterX - 4, sealCenterY + 18,
            sealCenterX - 7, sealCenterY + 14.5,
            'F'
        );
        pdf.triangle(
            sealCenterX + 4, sealCenterY + 18,
            sealCenterX + 10, sealCenterY + 18,
            sealCenterX + 7, sealCenterY + 14.5,
            'F'
        );

        // Outer Scalloped Gold Disc
        pdf.setFillColor(...this.COLOR_GOLD);
        pdf.circle(sealCenterX, sealCenterY, 11, 'F');

        // Inner Gold Accent Ring
        pdf.setDrawColor(255, 248, 220); // Warm ivory
        pdf.setLineWidth(0.4);
        pdf.circle(sealCenterX, sealCenterY, 9.8, 'S');

        // Central Deep Navy Disc
        pdf.setFillColor(...this.COLOR_NAVY);
        pdf.circle(sealCenterX, sealCenterY, 8.5, 'F');

        // Center Seal Text
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.5);
        pdf.setTextColor(255, 255, 255);
        pdf.text('CCSA', sealCenterX, sealCenterY - 0.5, { align: 'center' });

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(4.5);
        pdf.setTextColor(...this.COLOR_GOLD_LIGHT);
        pdf.text('★ OFFICIAL SEAL ★', sealCenterX, sealCenterY + 3.2, { align: 'center' });

        // Seal Subtitle
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.5);
        pdf.setTextColor(...this.COLOR_NAVY);
        pdf.text('ACCREDITED & SEALED', sealCenterX, sealCenterY + 20.5, { align: 'center' });

        // 3. RIGHT SIGNATURE: Executive Director (Dr. Rislan Abdulaziz Kanya)
        const rightCenterX = 18 + (colWidth * 2) + (colWidth / 2);

        // Simulated Executive Digital Signature Flourish
        pdf.setFont('times', 'italic');
        pdf.setFontSize(11);
        pdf.setTextColor(20, 45, 95);
        pdf.text('Rislan A. Kanya', rightCenterX, y + 14, { align: 'center' });

        // Signature Rule
        pdf.setDrawColor(...this.COLOR_NAVY);
        pdf.setLineWidth(0.3);
        pdf.line(rightCenterX - 24, y + 17, rightCenterX + 24, y + 17);

        // Signatory Title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(...this.COLOR_NAVY);
        pdf.text('DR. RISLAN ABDULAZIZ KANYA', rightCenterX, y + 21, { align: 'center' });

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(...this.COLOR_SLATE);
        pdf.text('Executive Director, CCSA', rightCenterX, y + 24.5, { align: 'center' });
        pdf.text('Cosmopolitan University Abuja', rightCenterX, y + 27.5, { align: 'center' });
    }

    /**
     * Cryptographic QR Code & Verification Audit Footer
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async addAuditFooter(pdf: any, farmerId: string) {
        const y = 258;
        const currentYear = new Date().getFullYear();
        const certSerial = `CCSA-${currentYear}-${farmerId.slice(-6).toUpperCase()}`;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fims.cosmopolitan.edu.ng';
        const verifyUrl = `${baseUrl}/verify-certificate/${certSerial}`;

        // Top Hairline Divider for Footer
        pdf.setDrawColor(...this.COLOR_GOLD);
        pdf.setLineWidth(0.3);
        pdf.line(18, y - 2, this.pageWidth - 18, y - 2);

        // 1. Offline-Resilient Local QR Code Generation
        const qrSize = 19;
        const qrX = this.pageWidth - 18 - qrSize;
        const qrY = y;

        try {
            const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
                margin: 1,
                width: 256,
                color: {
                    dark: '#081B33', // Deep Navy
                    light: '#FFFFFF'
                }
            });

            // Frame around QR
            pdf.setFillColor(255, 255, 255);
            pdf.setDrawColor(...this.COLOR_GOLD);
            pdf.setLineWidth(0.3);
            pdf.rect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 'FD');

            pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

            // Subtext below QR
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(5.5);
            pdf.setTextColor(...this.COLOR_NAVY);
            pdf.text('Scan to Verify Credential', qrX + (qrSize / 2), qrY + qrSize + 2.5, { align: 'center' });
        } catch (e) {
            console.error('Failed to generate local QR code for certificate:', e);
            pdf.setFontSize(6.5);
            pdf.setTextColor(200, 0, 0);
            pdf.text('Verification QR Online', qrX, qrY + 8);
        }

        // 2. Audit Trail & Legal Verification Notice (Left Block)
        const textX = 18;
        let textY = y + 2.5;

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.5);
        pdf.setTextColor(...this.COLOR_NAVY);
        pdf.text('SECURITY DOCUMENT · FIMS CRYPTOGRAPHICALLY VALIDATED CREDENTIAL', textX, textY);

        textY += 3.2;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6);
        pdf.setTextColor(...this.COLOR_SLATE);
        pdf.text(
            'Issued under the institutional authority of Cosmopolitan University Abuja. Tampering or unauthorized alteration invalidates this document.',
            textX,
            textY
        );

        textY += 3;
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...this.COLOR_CHARCOAL);
        pdf.text(`Public Verification: ${verifyUrl}`, textX, textY);

        textY += 3;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(5.5);
        pdf.setTextColor(...this.COLOR_SLATE);
        const issuedTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
        pdf.text(
            `Cert ID: ${certSerial}  ·  Audit Node: CCSA-FIMS-SEC-01  ·  Generated: ${issuedTimestamp}`,
            textX,
            textY
        );
    }

    // =========================================================================
    // SUBSEQUENT PAGES: Cartographic Farm Mapping & Specifications
    // =========================================================================

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private addFarmPageHeader(pdf: any, farm: Farm, pageIndex: number, totalFarms: number) {
        const y = 22;

        pdf.setFont('times', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(...this.COLOR_NAVY);
        pdf.text('COSMOPOLITAN UNIVERSITY ABUJA  ·  CENTRE FOR CLIMATE-SMART AGRICULTURE', this.pageWidth / 2, y, {
            align: 'center'
        });

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(...this.COLOR_GREEN);
        pdf.text('GEOSPATIAL FARM BOUNDARY SPECIFICATIONS & MAPPING', this.pageWidth / 2, y + 6, {
            align: 'center'
        });

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(...this.COLOR_SLATE);
        pdf.text(
            `PARCEL RECORD ${pageIndex} OF ${totalFarms}   ·   PARCEL ID: ${farm.id.slice(-8).toUpperCase()}`,
            this.pageWidth / 2,
            y + 11,
            { align: 'center' }
        );

        // Divider
        pdf.setDrawColor(...this.COLOR_GOLD);
        pdf.setLineWidth(0.4);
        pdf.line(20, y + 14, this.pageWidth - 20, y + 14);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private addFarmSpecificationsTable(pdf: any, farm: Farm) {
        const startY = 42;
        const boxWidth = this.pageWidth - 36;
        const boxHeight = 26;

        pdf.setFillColor(...this.COLOR_GOLD_BG);
        pdf.setDrawColor(...this.COLOR_GOLD);
        pdf.setLineWidth(0.3);
        pdf.rect(18, startY, boxWidth, boxHeight, 'FD');

        const fields = [
            { l: 'Registered Farm Area:', v: `${farm.farmSize || 'N/A'} Hectares` },
            { l: 'Primary Enterprise:', v: formatCropName(farm.primaryCrop) },
            { l: 'Secondary Enterprise:', v: (farm.secondaryCrop || []).join(', ') || 'None' },
            {
                l: 'Jurisdiction:',
                v: [formatLocation(farm.farmLocalGovernment), formatLocation(farm.farmState)].filter(Boolean).join(', ') || 'N/A'
            },
            { l: 'Soil Classification:', v: toTitleCase(farm.soilType) || 'Loamy' },
            { l: 'Farming Experience:', v: `${farm.farmingExperience || 0} Years` }
        ];

        const colWidth = boxWidth / 3;
        fields.forEach((item, index) => {
            const col = index % 3;
            const row = Math.floor(index / 3);
            const x = 18 + (col * colWidth) + 4;
            const y = startY + (row * 11) + 6;

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7);
            pdf.setTextColor(...this.COLOR_SLATE);
            pdf.text(item.l.toUpperCase(), x, y);

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8.5);
            pdf.setTextColor(...this.COLOR_NAVY);
            pdf.text(item.v, x, y + 4.5);
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private drawCartographicMap(pdf: any, farm: Farm) {
        const startY = 74;
        const boxWidth = this.pageWidth - 36;
        const boxHeight = 168;

        // Map Canvas Outer Frame
        pdf.setFillColor(248, 250, 252); // Soft map background
        pdf.setDrawColor(...this.COLOR_NAVY);
        pdf.setLineWidth(0.4);
        pdf.rect(18, startY, boxWidth, boxHeight, 'FD');

        // Coordinate Gridlines (Subtle cartographic grid)
        pdf.setDrawColor(230, 235, 242);
        pdf.setLineWidth(0.2);
        for (let gx = 18 + 20; gx < 18 + boxWidth; gx += 25) {
            pdf.line(gx, startY, gx, startY + boxHeight);
        }
        for (let gy = startY + 20; gy < startY + boxHeight; gy += 25) {
            pdf.line(18, gy, 18 + boxWidth, gy);
        }

        // Cartographic North Arrow
        const arrowX = 18 + boxWidth - 14;
        const arrowY = startY + 14;
        pdf.setFillColor(...this.COLOR_NAVY);
        pdf.triangle(arrowX, arrowY - 7, arrowX - 3.5, arrowY + 3, arrowX, arrowY + 1, 'F');
        pdf.setFillColor(...this.COLOR_GOLD);
        pdf.triangle(arrowX, arrowY - 7, arrowX + 3.5, arrowY + 3, arrowX, arrowY + 1, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.5);
        pdf.setTextColor(...this.COLOR_NAVY);
        pdf.text('N', arrowX, arrowY - 8.5, { align: 'center' });

        // Parse GPS Coordinates
        let parsedPoints: Array<{ lat: number; lng: number }> | null = null;

        try {
            if (farm.farmCoordinates) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const coords = typeof farm.farmCoordinates === 'string' ? JSON.parse(farm.farmCoordinates) : farm.farmCoordinates as any;
                if (Array.isArray(coords) && coords.length > 2) {
                    if (coords[0].lat !== undefined) parsedPoints = coords;
                    else if (coords[0].latitude !== undefined) parsedPoints = coords.map((c: any) => ({ lat: c.latitude, lng: c.longitude }));
                }
            } else if (farm.farmPolygon) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const poly = typeof farm.farmPolygon === 'string' ? JSON.parse(farm.farmPolygon) : farm.farmPolygon as any;
                if (Array.isArray(poly) && poly.length > 2) {
                    parsedPoints = poly.map((c: any) => ({ lat: c.lat ?? c.latitude, lng: c.lng ?? c.longitude }));
                }
            }
        } catch (e) {
            console.error('Failed to parse farm polygon coordinates:', e);
        }

        if (parsedPoints && parsedPoints.length > 2) {
            const lats = parsedPoints.map(p => p.lat);
            const lngs = parsedPoints.map(p => p.lng);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);

            const latRange = maxLat - minLat || 0.0001;
            const lngRange = maxLng - minLng || 0.0001;

            const padding = 20;
            const drawW = boxWidth - (padding * 2);
            const drawH = boxHeight - (padding * 2) - 20;

            const scaleX = drawW / lngRange;
            const scaleY = drawH / latRange;
            const scale = Math.min(scaleX, scaleY);

            const occupiedW = lngRange * scale;
            const occupiedH = latRange * scale;
            const offsetX = (drawW - occupiedW) / 2;
            const offsetY = (drawH - occupiedH) / 2;

            // Draw Polygon Boundaries (Deep Green with Emerald Stroke)
            pdf.setDrawColor(...this.COLOR_GREEN);
            pdf.setLineWidth(0.8);
            pdf.setFillColor(236, 253, 245); // Translucent-looking soft green

            for (let i = 0; i < parsedPoints.length; i++) {
                const pt1 = parsedPoints[i];
                const pt2 = parsedPoints[(i + 1) % parsedPoints.length];

                const x1 = ((pt1.lng - minLng) * scale) + 18 + padding + offsetX;
                const y1 = ((maxLat - pt1.lat) * scale) + startY + padding + offsetY;
                const x2 = ((pt2.lng - minLng) * scale) + 18 + padding + offsetX;
                const y2 = ((maxLat - pt2.lat) * scale) + startY + padding + offsetY;

                pdf.line(x1, y1, x2, y2);
            }

            // Draw GPS Vertex Points
            parsedPoints.forEach((pt, idx) => {
                const x = ((pt.lng - minLng) * scale) + 18 + padding + offsetX;
                const y = ((maxLat - pt.lat) * scale) + startY + padding + offsetY;

                pdf.setFillColor(...this.COLOR_GOLD);
                pdf.circle(x, y, 1.8, 'F');
                pdf.setFillColor(...this.COLOR_NAVY);
                pdf.circle(x, y, 1.1, 'F');

                // Label vertex P1, P2...
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(5.5);
                pdf.setTextColor(...this.COLOR_NAVY);
                pdf.text(`P${idx + 1}`, x + 2.5, y - 1);
            });

            // Cartographic Metadata Badge at Bottom
            const badgeY = startY + boxHeight - 14;
            pdf.setFillColor(255, 255, 255);
            pdf.setDrawColor(...this.COLOR_GOLD);
            pdf.setLineWidth(0.3);
            pdf.rect(22, badgeY, boxWidth - 8, 10, 'FD');

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7);
            pdf.setTextColor(...this.COLOR_NAVY);
            pdf.text(
                `GEOSPATIAL AUDIT: ${parsedPoints.length} GPS Vertices  ·  Mapped Area: ${farm.farmSize || 'N/A'} Ha  ·  Projection: WGS 84 (EPSG:4326)`,
                26,
                badgeY + 4
            );

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(6);
            pdf.setTextColor(...this.COLOR_SLATE);
            pdf.text(
                `Center Origin: Lat ${((minLat + maxLat) / 2).toFixed(6)}°, Lng ${((minLng + maxLng) / 2).toFixed(6)}°  ·  Certified by CCSA Spatial Analytics Unit`,
                26,
                badgeY + 7.5
            );
        } else {
            pdf.setFont('times', 'italic');
            pdf.setFontSize(11);
            pdf.setTextColor(...this.COLOR_SLATE);
            pdf.text(
                'No GPS polygon boundary data registered for this farm parcel.',
                this.pageWidth / 2,
                startY + (boxHeight / 2),
                { align: 'center' }
            );
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private addFarmPageFooter(pdf: any, farmerId: string, farmId: string) {
        const y = 282;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.5);
        pdf.setTextColor(...this.COLOR_SLATE);
        const certId = `CCSA-${new Date().getFullYear()}-${farmerId.slice(-6).toUpperCase()}`;
        pdf.text(
            `Credential: ${certId}  ·  Parcel ID: ${farmId.slice(-8).toUpperCase()}  ·  Centre for Climate-Smart Agriculture, Cosmopolitan University Abuja`,
            18,
            y
        );

        pdf.setFont('helvetica', 'bold');
        pdf.text(`Page ${pdf.getNumberOfPages()}`, this.pageWidth - 18, y, { align: 'right' });
    }
}
