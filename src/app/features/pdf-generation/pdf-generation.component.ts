import { Component } from '@angular/core';
import { JsPDFService } from 'src/app/services/pdf/js-pdf.service';
import { PdfService } from 'src/app/services/pdf/pdf-data.service';

@Component({
  selector: 'app-pdf-generation',
  templateUrl: './pdf-generation.component.html',
  styleUrls: ['./pdf-generation.component.scss']
})
export class PdfGenerationComponent {
  pageCount = 10;
  isLoading = false;
  generationStatus = '';

  constructor(
    private jsPDFService: JsPDFService,
    private pdfService: PdfService
  ) {}

  async generatePdf(tool: 'jsPDF') {
    this.isLoading = true;
    this.generationStatus = `Preparing test data for PDF generation...`;
    
    try {
      // Mock API: Generate random pdf data
      const pdfData = await this.pdfService.generatePDFData(this.pageCount);
      this.generationStatus = 'Test data prepared successfully!';

      const startTime = performance.now();
      this.generationStatus = `Generating PDF with ${tool}...`;

      await this.jsPDFService.generatePDF(pdfData);
      const endTime = performance.now();
      this.generationStatus = `${tool} PDF generated in ${(endTime - startTime).toFixed(2)} milliseconds.`;
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.generationStatus = 'An error occurred while generating the PDF. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }
}
