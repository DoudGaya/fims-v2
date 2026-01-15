import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import {
    formatFullName,
    formatLocation,
    formatCropName,
    toTitleCase
} from './textUtils';
import { Farmer, Farm, Cluster } from '@prisma/client';
import fs from 'fs';
import path from 'path';

export class CertificateGenerator {
    private pageWidth: number = 210; // A4 width in mm
    private pageHeight: number = 297; // A4 height in mm
    private margin: number = 20;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private contentWidth: number = 210 - 40;

    constructor() {
        this.contentWidth = this.pageWidth - (this.margin * 2);
    }

    async generateFarmerCertificate(farmerData: Farmer & { farms: Farm[] }, clusterData: Cluster | null): Promise<ArrayBuffer> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdf = new jsPDF('portrait', 'mm', 'a4') as any;

        try {
            // --- PAGE 1: Certificate Info ---
            this.setupDocument(pdf);

            // Add Background/Border
            this.addBorder(pdf);

            // Add Header with Logo
            await this.addHeader(pdf);

            // Add Content
            this.addCertificateTitle(pdf);
            this.addFarmerInformation(pdf, farmerData);

            // Add QR Code (Top Right or Bottom - let's do Bottom Center for balance or Top Right)
            // Per new design, let's keep it centrally balanced or specific

            this.addSignatures(pdf, clusterData);
            await this.addFooter(pdf, farmerData.id);

            // --- SUBSEQUENT PAGES: Farm Polygons ---
            if (farmerData.farms && farmerData.farms.length > 0) {
                for (const farm of farmerData.farms) {
                    pdf.addPage();
                    this.setupDocument(pdf);
                    this.addBorder(pdf);
                    this.addFarmPageTitle(pdf, farm);
                    this.addFarmDetails(pdf, farm);
                    this.drawFarmPolygon(pdf, farm);

                    // Simple footer for subsequent pages
                    pdf.setFont('helvetica', 'italic');
                    pdf.setFontSize(8);
                    pdf.setTextColor(150);
                    pdf.text(`Page ${pdf.getNumberOfPages()}`, this.pageWidth - 20, this.pageHeight - 10, { align: 'right' });
                }
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
            title: 'CCSA Farmer Certificate',
            subject: 'Climate-Smart Agriculture Certificate',
            author: 'Centre for Climate-Smart Agriculture',
            creator: 'CCSA Certificate System'
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private addBorder(pdf: any) {
        const margin = 5;
        const width = this.pageWidth - (margin * 2);
        const height = this.pageHeight - (margin * 2);

        // Outer line
        pdf.setDrawColor(0, 51, 102); // Navy Blue
        pdf.setLineWidth(1);
        pdf.rect(margin, margin, width, height);

        // Inner decorative line
        pdf.setDrawColor(0, 102, 51); // Dark Green
        pdf.setLineWidth(0.5);
        pdf.rect(margin + 2, margin + 2, width - 4, height - 4);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async addHeader(pdf: any): Promise<number> {
        let y = 30;

        // Load Logo
        try {
            const logoPath = path.join(process.cwd(), 'public', 'ccsa-logo.png');
            if (fs.existsSync(logoPath)) {
                const logoData = fs.readFileSync(logoPath).toString('base64');
                const imgWidth = 25;
                const imgHeight = 25;
                const x = (this.pageWidth - imgWidth) / 2;
                pdf.addImage(logoData, 'PNG', x, 15, imgWidth, imgHeight);
                y = 45; // Move Y down
            }
        } catch (e) {
            console.error("Failed to load logo", e);
        }

        // Organization Name
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(22);
        pdf.setTextColor(0, 102, 51); // Dark Green
        const orgName = 'Centre for Climate-Smart Agriculture';
        const orgWidth = pdf.getStringUnitWidth(orgName) * pdf.getFontSize() / pdf.internal.scaleFactor;
        pdf.text(orgName, (this.pageWidth - orgWidth) / 2, y);

        // University Name
        y += 7;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.setTextColor(0, 51, 102); // Navy Blue
        const uniName = 'Cosmopolitan University Abuja';
        const uniWidth = pdf.getStringUnitWidth(uniName) * pdf.getFontSize() / pdf.internal.scaleFactor;
        pdf.text(uniName, (this.pageWidth - uniWidth) / 2, y);

        // Contact Info Line
        y += 6;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(80, 80, 80);
        const contact = 'Tel: +234-806-224-9834 | Email: ccsa@cosmopolitan.edu.ng | Website: ccsa.cosmopolitan.edu.ng';
        const contactWidth = pdf.getStringUnitWidth(contact) * pdf.getFontSize() / pdf.internal.scaleFactor;
        pdf.text(contact, (this.pageWidth - contactWidth) / 2, y);

        // Horizontal Line
        y += 4;
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.2);
        pdf.line(20, y, this.pageWidth - 20, y);

        return y + 10;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private addCertificateTitle(pdf: any): number {
        const y = 80; // Adjusted down to avoid header overlap

        pdf.setFont('times', 'bold'); // Using Times for more formal look
        pdf.setFontSize(26);
        pdf.setTextColor(0, 51, 102); // Navy Blue

        const title = 'FARMER REGISTRATION CERTIFICATE';
        const titleWidth = pdf.getStringUnitWidth(title) * pdf.getFontSize() / pdf.internal.scaleFactor;
        pdf.text(title, (this.pageWidth - titleWidth) / 2, y);

        // Subtext
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(0, 102, 51); // Green
        const sub = 'Centre for Climate-Smart Agriculture (CCSA)';
        const subWidth = pdf.getStringUnitWidth(sub) * pdf.getFontSize() / pdf.internal.scaleFactor;
        pdf.text(sub, (this.pageWidth - subWidth) / 2, y + 6);

        return y + 20;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private addFarmerInformation(pdf: any, farmerData: Farmer & { farms: Farm[] }): number {
        let y = 105;

        // "This is to certify that"
        pdf.setFont('times', 'italic');
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        const certifyText = 'This is to certify that';
        const certifyWidth = pdf.getStringUnitWidth(certifyText) * pdf.getFontSize() / pdf.internal.scaleFactor;
        pdf.text(certifyText, (this.pageWidth - certifyWidth) / 2, y);

        // Decorative lines around text
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.2);
        pdf.line((this.pageWidth - certifyWidth) / 2 - 30, y - 1.5, (this.pageWidth - certifyWidth) / 2 - 5, y - 1.5);
        pdf.line((this.pageWidth + certifyWidth) / 2 + 5, y - 1.5, (this.pageWidth + certifyWidth) / 2 + 30, y - 1.5);

        // NAME
        y += 15;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(28);
        pdf.setTextColor(0, 51, 102); // Navy Blue
        const fullName = formatFullName(farmerData.firstName, farmerData.middleName, farmerData.lastName).toUpperCase();
        const nameWidth = pdf.getStringUnitWidth(fullName) * pdf.getFontSize() / pdf.internal.scaleFactor;
        pdf.text(fullName, (this.pageWidth - nameWidth) / 2, y);

        // NIN
        y += 8;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        pdf.setTextColor(80, 80, 80);
        const nin = `NIN: ${farmerData.nin || 'xxxxxxxx'}`;
        const ninWidth = pdf.getStringUnitWidth(nin) * pdf.getFontSize() / pdf.internal.scaleFactor;
        pdf.text(nin, (this.pageWidth - ninWidth) / 2, y);

        // Body Text
        y += 15;
        pdf.setFont('times', 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(60, 60, 60);
        const year = new Date().getFullYear();
        const bodyText = `is a duly registered farmer with Centre for Climate-Smart Agriculture (CCSA), Cosmopolitan University Abuja, and is hereby authorized to participate in CCSA agricultural programs, initiatives, and benefits for the ${year} farming season.`;

        // Split text logic
        const maxWidth = 160;
        const splitText = pdf.splitTextToSize(bodyText, maxWidth);
        // Center the text block
        // Actually, for center alignment, x should be center of page:
        pdf.text(splitText, this.pageWidth / 2, y, { align: 'center', maxWidth: maxWidth });

        // DETAILS BOXES
        y += 25;
        const boxY = y;
        const boxHeight = 45;
        const boxWidth = 53; // 160 total width roughly / 3
        const gap = 5;
        const startX = (this.pageWidth - (boxWidth * 3 + gap * 2)) / 2;

        // define helper for box
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const drawBox = (x: number, title: string, items: { l: string, v: string }[]) => {
            // Header
            pdf.setFillColor(245, 245, 245);
            pdf.setDrawColor(220, 220, 220);
            pdf.rect(x, boxY, boxWidth, boxHeight, 'FD');

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            pdf.setTextColor(0, 51, 102);
            pdf.text(title, x + 3, boxY + 6);
            pdf.line(x, boxY + 9, x + boxWidth, boxY + 9);

            // Items
            let itemY = boxY + 14;
            items.forEach(item => {
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(8);
                pdf.setTextColor(100, 100, 100);
                pdf.text(item.l, x + 3, itemY);

                // Truncate value if too long
                let val = item.v;
                if (pdf.getStringUnitWidth(val) * 8 / pdf.internal.scaleFactor > boxWidth - 25) {
                    val = val.substring(0, 20) + '...';
                }

                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(0, 0, 0);
                // Right align value
                pdf.text(val, x + boxWidth - 3, itemY, { align: 'right' });

                itemY += 6;
            });
        };

        // Box 1: Personal
        drawBox(startX, 'Personal Information', [
            { l: 'Phone:', v: farmerData.phone || 'N/A' },
            { l: 'Gender:', v: toTitleCase(farmerData.gender) || 'N/A' },
            { l: 'Status:', v: toTitleCase(farmerData.status) || 'N/A' },
            { l: 'Reg. Date:', v: farmerData.registrationDate ? new Date(farmerData.registrationDate).toLocaleDateString() : 'N/A' }
        ]);

        // Box 2: Location
        drawBox(startX + boxWidth + gap, 'Location Details', [
            { l: 'State:', v: toTitleCase(farmerData.state) || 'N/A' },
            { l: 'LGA:', v: toTitleCase(farmerData.lga) || 'N/A' },
            { l: 'Ward:', v: toTitleCase(farmerData.ward) || 'N/A' },
            { l: 'Polling Unit:', v: (farmerData.pollingUnit || 'N/A').substring(0, 10) + (farmerData.pollingUnit && farmerData.pollingUnit.length > 10 ? '..' : '') }
        ]);

        // Box 3: Farm
        const farm = farmerData.farms && farmerData.farms.length > 0 ? farmerData.farms[0] : null;
        drawBox(startX + (boxWidth + gap) * 2, 'Farm Information', [
            { l: 'Farm Size:', v: farm ? `${farm.farmSize || 0} ha` : 'N/A' },
            { l: 'Primary Crop:', v: farm ? formatCropName(farm.primaryCrop) : 'N/A' },
            { l: 'Soil Type:', v: farm ? toTitleCase(farm.soilType) : 'N/A' },
            { l: 'No. of Farms:', v: farmerData.farms ? farmerData.farms.length.toString() : '0' }
        ]);

        return boxY + boxHeight + 10;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private addSignatures(pdf: any, clusterData: Cluster | null): number {
        const y = 245;

        // Line separator
        pdf.setDrawColor(0, 51, 102);
        pdf.setLineWidth(0.5);
        pdf.line(20, y - 5, this.pageWidth - 20, y - 5);

        const sectionWidth = (this.pageWidth - 40) / 3;
        const startX = 20;

        // Helper for signature block
        const drawSig = (x: number, title: string, name: string) => {
            const centerX = x + (sectionWidth / 2);

            // Signature Line
            pdf.setDrawColor(0, 0, 0);
            pdf.setLineWidth(0.3);
            pdf.line(centerX - 25, y + 25, centerX + 25, y + 25);

            // Name
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            pdf.setTextColor(0, 0, 0);
            pdf.text(name, centerX, y + 30, { align: 'center' });

            // Title
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text(title, centerX, y + 34, { align: 'center' });
        };

        // 1. Cluster Lead (Left)
        const clusterLeadName = clusterData ? `${clusterData.clusterLeadFirstName} ${clusterData.clusterLeadLastName}`.toUpperCase() : 'UNKNOWN';
        drawSig(startX, 'Cluster Lead', clusterLeadName);

        // 2. District Head (Center)
        drawSig(startX + sectionWidth, 'District Head', '__________________');

        // 3. CEO (Right)
        const ceoName = 'DR. RISLAN ABDULAZIZ KANYA';
        drawSig(startX + sectionWidth * 2, 'Chief Executive Officer', ceoName);

        return y + 40;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async addFooter(pdf: any, farmerId: string) {
        const y = 285;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(150, 150, 150);
        const id = `Certificate ID: CCSA-${new Date().getFullYear()}-${farmerId.slice(-6).toUpperCase()}`;
        pdf.text(`${id} | Generated on ${new Date().toLocaleDateString()}`, this.pageWidth / 2, y, { align: 'center' });

        // Call QR Code display here (async)
        await this.addQRCode(pdf, farmerId);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async addQRCode(pdf: any, farmerId: string) {
        // Top Right Positioning
        const qrSize = 25;
        const y = 15;
        const x = this.pageWidth - 20 - qrSize;
        try {
            const certificateId = `CCSA-${new Date().getFullYear()}-${farmerId.slice(-6).toUpperCase()}`;
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const verifyUrl = `${baseUrl}/verify-certificate/${certificateId}`;

            // Use external API to avoid 'canvas' dependency issues in serverless/windows environments
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&margin=10&data=${encodeURIComponent(verifyUrl)}`;

            const response = await fetch(qrApiUrl);
            if (!response.ok) throw new Error('Failed to fetch QR code image');

            const buffer = await response.arrayBuffer();
            const qrData = new Uint8Array(buffer);

            pdf.addImage(qrData, 'PNG', x, y, qrSize, qrSize);

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(6);
            pdf.setTextColor(0, 0, 0);
            pdf.text('Scan to Verify', x + qrSize / 2, y + qrSize + 3, { align: 'center' });
            pdf.text(`Cert ID: ${certificateId}`, x + qrSize / 2, y + qrSize + 6, { align: 'center' });

        } catch (e) {
            console.error('Error adding QR code:', e);
            // Fallback text if QR fails
            pdf.setFontSize(8);
            pdf.setTextColor(255, 0, 0);
            pdf.text('QR Code Unavailable', x, y + 10);
        }
    }

    // --- SUBSEQUENT PAGES METHODS ---

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private addFarmPageTitle(pdf: any, farm: Farm) {
        const y = 40; // Higher up
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(22);
        pdf.setTextColor(0, 51, 102);

        const title = 'FARM DETAILS & MAPPING';
        const titleWidth = pdf.getStringUnitWidth(title) * pdf.getFontSize() / pdf.internal.scaleFactor;
        const titleX = (this.pageWidth - titleWidth) / 2;
        pdf.text(title, titleX, y);

        pdf.setFontSize(14);
        const subTitle = `Farm ID: ${farm.id.slice(-8).toUpperCase()}`;
        const subWidth = pdf.getStringUnitWidth(subTitle) * pdf.getFontSize() / pdf.internal.scaleFactor;
        const subX = (this.pageWidth - subWidth) / 2;
        pdf.text(subTitle, subX, y + 10);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private addFarmDetails(pdf: any, farmData: Farm) {
        let y = 70;

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.setTextColor(0, 51, 102);
        pdf.text('FARM SPECIFICATIONS', this.margin, y);
        y += 15;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);

        const farmInfo = [
            { label: 'Farm Size:', value: `${farmData.farmSize || 'Not specified'} hectares` },
            { label: 'Primary Crop:', value: formatCropName(farmData.primaryCrop) || 'Not specified' },
            { label: 'Secondary Crop:', value: (farmData.secondaryCrop || []).join(', ') || 'None' },
            {
                label: 'Location:',
                value: [formatLocation(farmData.farmState), formatLocation(farmData.farmLocalGovernment)]
                    .filter(Boolean)
                    .join(', ') || 'Not specified'
            },
            { label: 'Soil Type:', value: toTitleCase(farmData.soilType) || 'Not specified' },
            { label: 'Experience:', value: `${farmData.farmingExperience || 0} years` }
        ];

        const lineHeight = 8;
        farmInfo.forEach((info, index) => {
            const currentY = y + (index * lineHeight);
            pdf.setFont('helvetica', 'bold');
            pdf.text(info.label, this.margin, currentY);
            pdf.setFont('helvetica', 'normal');
            pdf.text(info.value, this.margin + 35, currentY);
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private drawFarmPolygon(pdf: any, farm: Farm) {
        const startY = 130;
        const boxHeight = 130; // Much Bigger Polygon Area
        const boxWidth = this.pageWidth - (this.margin * 2);

        pdf.setDrawColor(200, 200, 200);
        pdf.rect(this.margin, startY, boxWidth, boxHeight); // Frame

        // Try to parse polygon
        let parsedPoints: Array<{ lat: number, lng: number }> | null = null;

        try {
            if (farm.farmCoordinates) {
                // Assume simple array of objects or generic JSON
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const coords = typeof farm.farmCoordinates === 'string' ? JSON.parse(farm.farmCoordinates) : farm.farmCoordinates as any;
                if (Array.isArray(coords) && coords.length > 2) {
                    // Check structure
                    if (coords[0].lat !== undefined) parsedPoints = coords;
                    else if (coords[0].latitude !== undefined) parsedPoints = coords.map((c: any) => ({ lat: c.latitude, lng: c.longitude }));
                }
            }
            // Fallback to farmPolygon if farmCoordinates is empty
            else if (farm.farmPolygon) {
                // Same logic
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const poly = typeof farm.farmPolygon === 'string' ? JSON.parse(farm.farmPolygon) : farm.farmPolygon as any;
                if (Array.isArray(poly) && poly.length > 2) {
                    parsedPoints = poly.map((c: any) => ({ lat: c.lat ?? c.latitude, lng: c.lng ?? c.longitude }));
                }
            }
        } catch (e) {
            console.error("Failed to parse polygon", e);
        }

        if (parsedPoints && parsedPoints.length > 0) {
            // Calculate bounds
            const lats = parsedPoints.map(p => p.lat);
            const lngs = parsedPoints.map(p => p.lng);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);

            const latRange = maxLat - minLat;
            const lngRange = maxLng - minLng;

            // Avoiding division by zero
            if (latRange === 0 && lngRange === 0) return;

            const margin = 10;
            const drawingWidth = boxWidth - (margin * 2);
            const drawingHeight = boxHeight - (margin * 2);

            // Scale
            // Depending on aspect ratio, fit into box
            // x = (lng - minLng) / lngRange * drawingWidth + this.margin + margin
            // y = boxHeight - ((lat - minLat) / latRange * drawingHeight) + startY + margin  (Flip Y because PDF coords top-down)
            // Wait, PDF coords: (0,0) is top-left.
            // Lat increases upwards (North). PDF Y increases downwards.
            // So detailed Y calculation:
            // Normalized Lat (0 to 1) = (lat - minLat) / latRange
            // Inverted (1 to 0) = 1 - Normalized Lat
            // PDF Y = Inverted * drawingHeight + startY + margin

            // Maintain aspect ratio
            const scaleX = drawingWidth / lngRange;
            const scaleY = drawingHeight / latRange;
            const scale = Math.min(scaleX, scaleY);

            // Center it
            const occupiedWidth = lngRange * scale;
            const occupiedHeight = latRange * scale;
            const offsetX = (drawingWidth - occupiedWidth) / 2;
            const offsetY = (drawingHeight - occupiedHeight) / 2;

            pdf.setDrawColor(0, 102, 51); // Green border
            pdf.setLineWidth(1);
            pdf.setFillColor(240, 255, 240); // Light green fill

            // Draw Lines
            for (let i = 0; i < parsedPoints.length; i++) {
                const pt1 = parsedPoints[i];
                const pt2 = parsedPoints[(i + 1) % parsedPoints.length];

                const x1 = ((pt1.lng - minLng) * scale) + this.margin + margin + offsetX;
                const y1 = ((maxLat - pt1.lat) * scale) + startY + margin + offsetY;

                const x2 = ((pt2.lng - minLng) * scale) + this.margin + margin + offsetX;
                const y2 = ((maxLat - pt2.lat) * scale) + startY + margin + offsetY;

                pdf.line(x1, y1, x2, y2);
            }

            // Draw Vertices
            pdf.setFillColor(0, 102, 51);
            parsedPoints.forEach(pt => {
                const x = ((pt.lng - minLng) * scale) + this.margin + margin + offsetX;
                const y = ((maxLat - pt.lat) * scale) + startY + margin + offsetY;
                pdf.circle(x, y, 1, 'F');
            });

            // Add "Satellite Mapping" label
            pdf.setFontSize(8);
            pdf.setTextColor(100);
            pdf.text(`Mapped Area: ${farm.farmSize || 'N/A'} ha`, this.margin + 5, startY + boxHeight - 10);
            pdf.text("Polygon visualization based on GPS coordinates", this.margin + 5, startY + boxHeight - 5);

        } else {
            // No polygon
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(10);
            pdf.setTextColor(150);
            pdf.text("No GPS polygon data available for map visualization.", this.margin + 10, startY + (boxHeight / 2));
        }
    }
}

