import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { 
  formatFullName, 
  formatLocation, 
  formatCropName, 
  toTitleCase
} from '../textUtils';

interface FarmerData {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  nin?: string | null;
  phone?: string | null;
  state?: string | null;
  lga?: string | null;
  gender?: string | null;
  email?: string | null;
  ward?: string | null;
  pollingUnit?: string | null;
  farms?: any[];
  registrationDate?: Date | string | null;
  status?: string | null;
}

interface FarmData {
  farmSize?: number | null;
  primaryCrop?: string | null;
  secondaryCrop?: string | string[] | null;
  farmState?: string | null;
  farmLocalGovernment?: string | null;
  soilType?: string | null;
  farmingExperience?: number | null;
  farmPolygon?: any;
  farmCoordinates?: any;
  farmLatitude?: number | null;
  farmLongitude?: number | null;
}

interface ClusterData {
  clusterLeadFirstName?: string | null;
  clusterLeadLastName?: string | null;
}

export class CertificateGenerator {
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private contentWidth: number;

  constructor() {
    this.pageWidth = 210; // A4 width in mm
    this.pageHeight = 297; // A4 height in mm
    this.margin = 20;
    this.contentWidth = this.pageWidth - (this.margin * 2);
  }

  async generateFarmerCertificate(farmerData: FarmerData, farmData: FarmData, clusterData: ClusterData | null): Promise<ArrayBuffer> {
    const pdf = new jsPDF('portrait', 'mm', 'a4');
    
    try {
      // Set up document
      this.setupDocument(pdf);
      
      // Add header with logo and organization name
      await this.addHeader(pdf);
      
      // Add certificate title
      this.addCertificateTitle(pdf);
      
      // Add farmer information
      this.addFarmerInformation(pdf, farmerData);
      
      // Add farm information with polygon data
      this.addFarmInformation(pdf, farmData);
      
      // Add QR code and certificate ID
      await this.addQRCode(pdf, farmerData.id);
      
      // Add signatures section
      this.addSignatures(pdf, clusterData);
      
      // Add footer
      this.addFooter(pdf);
      
      // Return PDF as array buffer
      return pdf.output('arraybuffer');
      
    } catch (error) {
      console.error('Error generating certificate:', error);
      throw error;
    }
  }

  private setupDocument(pdf: jsPDF) {
    // Set document properties
    pdf.setProperties({
      title: 'CCSA Farmer Certificate',
      subject: 'Climate-Smart Agriculture Certificate',
      author: 'Centre for Climate-Smart Agriculture',
      creator: 'CCSA Certificate System'
    });
  }

  private async addHeader(pdf: jsPDF): Promise<number> {
    const currentY = 25;
    
    // Add organization name
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.setTextColor(0, 51, 102); // Dark blue
    
    const centerText = (text: string, y: number, fontSize: number | null = null): number => {
      if (fontSize) pdf.setFontSize(fontSize);
      const textWidth = pdf.getStringUnitWidth(text) * pdf.getFontSize() / pdf.internal.scaleFactor;
      const x = (this.pageWidth - textWidth) / 2;
      pdf.text(text, x, y);
      return y + (fontSize || pdf.getFontSize()) * 0.5;
    };
    
    let y = centerText('CENTRE FOR CLIMATE-SMART AGRICULTURE', currentY, 24);
    
    // Add university name as subheading
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(16);
    pdf.setTextColor(102, 102, 102); // Gray
    y = centerText('Cosmopolitan University Abuja', y + 5, 16);
    
    // Add decorative line
    pdf.setDrawColor(0, 51, 102);
    pdf.setLineWidth(0.5);
    pdf.line(this.margin, y + 10, this.pageWidth - this.margin, y + 10);
    
    return y + 15;
  }

  private addCertificateTitle(pdf: jsPDF): number {
    const y = 75;
    
    // Certificate title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(28);
    pdf.setTextColor(0, 102, 51); // Dark green
    
    const title = 'CERTIFICATE OF REGISTRATION';
    const titleWidth = pdf.getStringUnitWidth(title) * pdf.getFontSize() / pdf.internal.scaleFactor;
    const titleX = (this.pageWidth - titleWidth) / 2;
    pdf.text(title, titleX, y);
    
    // Subtitle
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(14);
    pdf.setTextColor(102, 102, 102);
    
    const subtitle = 'Climate-Smart Agriculture Program';
    const subtitleWidth = pdf.getStringUnitWidth(subtitle) * pdf.getFontSize() / pdf.internal.scaleFactor;
    const subtitleX = (this.pageWidth - subtitleWidth) / 2;
    pdf.text(subtitle, subtitleX, y + 10);
    
    return y + 25;
  }

  private addFarmerInformation(pdf: jsPDF, farmerData: FarmerData): number {
    let y = 110;
    
    // Section title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(0, 51, 102);
    pdf.text('FARMER INFORMATION', this.margin, y);
    y += 15;
    
    // Create farmer info in two columns
    const leftColumn = this.margin;
    const rightColumn = this.pageWidth / 2 + 10;
    const lineHeight = 8;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    
    // Left column with proper capitalization
    const leftInfo = [
      { 
        label: 'Full Name:', 
        value: formatFullName(farmerData.firstName, farmerData.lastName, farmerData.middleName || undefined) || 'Not provided'
      },
      { label: 'NIN:', value: farmerData.nin || 'Not provided' },
      { label: 'Phone Number:', value: farmerData.phone || 'Not provided' },
      { label: 'State:', value: formatLocation(farmerData.state || '', '', '') || 'Not provided' }, // Simplified for now
      { label: 'LGA:', value: formatLocation(farmerData.lga || '', '', '') || 'Not provided' }
    ];
    
    // Right column with proper capitalization and farm count
    const rightInfo = [
      { label: 'Gender:', value: toTitleCase(farmerData.gender) || 'Not specified' },
      { label: 'Email:', value: farmerData.email || 'Not provided' },
      { label: 'Ward:', value: formatLocation(farmerData.ward || '', '', '') || 'Not provided' },
      { label: 'Polling Unit:', value: formatLocation(farmerData.pollingUnit || '', '', '') || 'Not provided' },
      { 
        label: 'Total Farms:', 
        value: farmerData.farms ? `${farmerData.farms.length} farm${farmerData.farms.length !== 1 ? 's' : ''}` : '1 farm'
      },
      { 
        label: 'Registration Date:', 
        value: farmerData.registrationDate 
          ? new Date(farmerData.registrationDate).toLocaleDateString() 
          : 'Not available' 
      },
      { label: 'Status:', value: toTitleCase(farmerData.status) || 'Active' }
    ];
    
    leftInfo.forEach((info, index) => {
      const currentY = y + (index * lineHeight);
      pdf.setFont('helvetica', 'bold');
      pdf.text(info.label, leftColumn, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(info.value, leftColumn + 25, currentY);
    });
    
    rightInfo.forEach((info, index) => {
      const currentY = y + (index * lineHeight);
      pdf.setFont('helvetica', 'bold');
      pdf.text(info.label, rightColumn, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(info.value, rightColumn + 25, currentY);
    });
    
    return y + (Math.max(leftInfo.length, rightInfo.length) * lineHeight) + 10;
  }

  private addFarmInformation(pdf: jsPDF, farmData: FarmData): number {
    let y = 170;
    
    // Section title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(0, 51, 102);
    pdf.text('FARM INFORMATION', this.margin, y);
    y += 15;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    
    const secondaryCrop = Array.isArray(farmData.secondaryCrop) 
      ? farmData.secondaryCrop.join(', ') 
      : farmData.secondaryCrop;

    const farmInfo = [
      { label: 'Farm Size:', value: `${farmData.farmSize || 'Not specified'} hectares` },
      { label: 'Primary Crop:', value: formatCropName(farmData.primaryCrop || '') || 'Not specified' },
      { label: 'Secondary Crop:', value: formatCropName(secondaryCrop || '') || 'Not specified' },
      { 
        label: 'Farm Location:', 
        value: [formatLocation(farmData.farmState || '', farmData.farmLocalGovernment || '', '')]
          .filter(Boolean)
          .join(', ') || 'Not specified'
      },
      { label: 'Soil Type:', value: toTitleCase(farmData.soilType) || 'Not specified' },
      { label: 'Farming Experience:', value: `${farmData.farmingExperience || 0} years` }
    ];
    
    const lineHeight = 8;
    farmInfo.forEach((info, index) => {
      const currentY = y + (index * lineHeight);
      pdf.setFont('helvetica', 'bold');
      pdf.text(info.label, this.margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(info.value, this.margin + 35, currentY);
    });
    
    // Add polygon coordinates if available
    if (farmData.farmPolygon || farmData.farmCoordinates) {
      y += farmInfo.length * lineHeight + 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Farm Coordinates:', this.margin, y);
      y += 6;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      
      let coordinates = 'Coordinates recorded and verified';
      if (farmData.farmLatitude && farmData.farmLongitude) {
        coordinates = `Center: ${farmData.farmLatitude.toFixed(6)}, ${farmData.farmLongitude.toFixed(6)}`;
      }
      
      pdf.text(coordinates, this.margin, y);
    }
    
    return y + 15;
  }

  private async addQRCode(pdf: jsPDF, farmerId: string): Promise<number> {
    const y = 225;
    try {
      // Generate certificate ID
      const certificateId = `CCSA-${new Date().getFullYear()}-${farmerId.slice(-6).toUpperCase()}`;

      // Generate QR code for public verification page
      // Use environment variable or default to localhost for now
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const verifyUrl = `${baseUrl}/verify-certificate/${certificateId}`;
      
      const qrCodeDataURL = await QRCode.toDataURL(verifyUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Add QR code to PDF (centered below farm info)
      const qrSize = 32;
      const qrX = (this.pageWidth - qrSize) / 2;
      pdf.addImage(qrCodeDataURL, 'PNG', qrX, y, qrSize, qrSize);

      // Add certificate ID below QR code
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(0, 51, 102);
      const certIdY = y + qrSize + 8;
      const certIdText = `Certificate ID: ${certificateId}`;
      const certIdWidth = pdf.getStringUnitWidth(certIdText) * pdf.getFontSize() / pdf.internal.scaleFactor;
      const certIdX = (this.pageWidth - certIdWidth) / 2;
      pdf.text(certIdText, certIdX, certIdY);

      // Add verification link below certificate ID
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(0, 102, 51);
      const verifyText = 'Scan QR code or visit:';
      const verifyTextWidth = pdf.getStringUnitWidth(verifyText) * pdf.getFontSize() / pdf.internal.scaleFactor;
      const verifyTextX = (this.pageWidth - verifyTextWidth) / 2;
      pdf.text(verifyText, verifyTextX, certIdY + 7);
      const urlWidth = pdf.getStringUnitWidth(verifyUrl) * pdf.getFontSize() / pdf.internal.scaleFactor;
      const urlX = (this.pageWidth - urlWidth) / 2;
      pdf.text(verifyUrl, urlX, certIdY + 13);
    } catch (error) {
      console.error('Error generating QR code:', error);
      // Fallback text
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('Certificate verification code will be generated', this.margin, y);
    }
    return y + 50;
  }

  private addSignatures(pdf: jsPDF, clusterData: ClusterData | null): number {
    const y = 260;
    
    // Signatures section
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(0, 51, 102);
    const sigTitle = 'AUTHORIZED SIGNATURES';
    const sigTitleWidth = pdf.getStringUnitWidth(sigTitle) * pdf.getFontSize() / pdf.internal.scaleFactor;
    const sigTitleX = (this.pageWidth - sigTitleWidth) / 2;
    pdf.text(sigTitle, sigTitleX, y);
    
    // Signature lines
    const signatureY = y + 20;
    const leftSigX = this.margin + 20;
    const rightSigX = this.pageWidth - this.margin - 60;
    
    // Left signature (CEO)
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.line(leftSigX, signatureY, leftSigX + 40, signatureY);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text('CEO Signature', leftSigX + 5, signatureY + 5);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Dr. [CEO Name]', leftSigX + 5, signatureY + 10);
    pdf.text('Chief Executive Officer', leftSigX + 5, signatureY + 14);
    
    // Right signature (Cluster Lead)
    pdf.line(rightSigX, signatureY, rightSigX + 40, signatureY);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Cluster Lead Signature', rightSigX + 5, signatureY + 5);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const clusterLeadName = clusterData ? `${clusterData.clusterLeadFirstName || ''} ${clusterData.clusterLeadLastName || ''}`.trim() : '[Cluster Lead Name]';
    pdf.text(clusterLeadName, rightSigX + 5, signatureY + 10);
    pdf.text('Cluster Lead', rightSigX + 5, signatureY + 14);
    
    return signatureY + 20;
  }

  private addFooter(pdf: jsPDF) {
    const y = 285;
    
    // Issue date
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(102, 102, 102);
    
    const issueDate = `Issued on: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`;
    
    const issueDateWidth = pdf.getStringUnitWidth(issueDate) * pdf.getFontSize() / pdf.internal.scaleFactor;
    const issueDateX = (this.pageWidth - issueDateWidth) / 2;
    pdf.text(issueDate, issueDateX, y);
    
    // Certificate validity note
    pdf.setFontSize(8);
    const validityNote = 'This certificate is valid and can be verified using the QR code above';
    const validityWidth = pdf.getStringUnitWidth(validityNote) * pdf.getFontSize() / pdf.internal.scaleFactor;
    const validityX = (this.pageWidth - validityWidth) / 2;
    pdf.text(validityNote, validityX, y + 6);
  }
}
