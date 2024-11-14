import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { ThemeType, TooltipService } from 'src/app/services/shared/tooltip.service';
import { Observable } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.scss'],
})
export class TooltipComponent implements OnInit {
  @ViewChild('tooltip', { static: false }) tooltipElement!: ElementRef<HTMLDivElement>;

  tooltip$: Observable<{
    title: string;
    description?: string | Array<string | Record<string, unknown>> | Record<string, unknown>;
    style: { top: string; left: string; };
    theme?: ThemeType;
  } | null>;

  isExpanded = false;

  constructor(
    private tooltipService: TooltipService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.tooltip$ = this.tooltipService.tooltip$;

    // Subscribe to tooltip$ changes
    this.tooltip$.subscribe((tooltipData) => {
      if (tooltipData) {
        // Delay to ensure the tooltip is rendered
        setTimeout(() => {
          if (this.tooltipElement) {
            const tooltipRect = this.tooltipElement.nativeElement.getBoundingClientRect();
            this.tooltipService.setTooltipDimensions(tooltipRect.width, tooltipRect.height);
            // console.log('Tooltip dimensions:', tooltipRect.width, tooltipRect.height);
          }
        });
      }
    });
  }

  // Toggle description expand/collapse
  toggleDescription() {
    this.isExpanded = !this.isExpanded;
    this.tooltipService.setIsPinned(this.isExpanded);
  }

  // Hide the tooltip
  hideTooltip() {
    this.tooltipService.hideTooltip();
  }
  
  // Hide and reset the tooltip
  closeTooltip() {
    this.isExpanded = false;
    this.tooltipService.setIsPinned(false);
    this.tooltipService.hideTooltip();
  }

  // Render tooltip content dynamically based on its structure
  renderTooltipContent(data: unknown): SafeHtml {
    const buildHtml = (data: unknown): string => {
      if (Array.isArray(data)) {
        // If data is an array, render it as a list
        return `<ul>${data.map(item => `<li>${buildHtml(item)}</li>`).join('')}</ul>`;
      } else if (data && typeof data === "object" && data !== null) {
        // If data is an object, render its entries as key-value pairs
        return `<div>${Object.entries(data).map(
          ([key, value]) => `<div><strong>${key}:</strong> ${buildHtml(value)}</div>`
        ).join('')}</div>`;
      } else {
        // If data is a basic type, convert it to a string and render it
        return String(data);
      }
    };
  
    // Use DomSanitizer to mark the final HTML as safe
    return this.sanitizer.bypassSecurityTrustHtml(buildHtml(data));
  }
}