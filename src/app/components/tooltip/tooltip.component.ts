import { Component, OnInit, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ThemeType, TooltipService } from 'src/app/services/shared/tooltip.service';
@Component({
  selector: 'app-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.scss'],
  encapsulation: ViewEncapsulation.None, // Makes styles global across the application
})
export class TooltipComponent implements OnInit {
  @ViewChild('tooltip', { static: false }) tooltipElement!: ElementRef<HTMLDivElement>;
  private destroy$ = new Subject<void>(); // Notification subscription destroyed
  
  tooltip$: Observable<{
    title: string;
    description?: string | Array<string | Record<string, unknown>> | Record<string, unknown>;
    style: { top: string; left: string; };
    theme?: ThemeType;
  } | null>;

  isExpanded = false;

  constructor(
    private tooltipService: TooltipService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    // Subscribe to tooltip$ changes to update tooltip position dynamically
    this.tooltip$ = this.tooltipService.tooltip$;

    // Subscribe to tooltip$ changes
    this.tooltip$
      .pipe(takeUntil(this.destroy$))
      .subscribe((tooltipData) => {
        if (tooltipData) {
          // Perform the operation after the next render
          requestAnimationFrame(() => {
            const tooltipRendered = this.tooltipService.getTooltipRendered();
            if (this.tooltipElement && tooltipRendered) {
              const tooltipRect = this.tooltipElement.nativeElement.getBoundingClientRect();
              const currentWidth = this.tooltipService.getTooltipWidth();
              const currentHeight = this.tooltipService.getTooltipHeight();

              if (tooltipRect.width !== currentWidth || tooltipRect.height !== currentHeight) {
                this.tooltipService.setTooltipDimensions(tooltipRect.width, tooltipRect.height);
                this.tooltipService.updateTooltipPosition();
              }
            }
          });
        }
      });
  }

  // Toggle description expand/collapse
  toggleDescription() {
    this.isExpanded = !this.isExpanded;
    this.tooltipService.setIsPinned(this.isExpanded);

    // Perform the operation after the next render
    requestAnimationFrame(() => {
      if (this.tooltipElement) {
        const tooltipRect = this.tooltipElement.nativeElement.getBoundingClientRect();
        this.tooltipService.setTooltipDimensions(tooltipRect.width, tooltipRect.height);
        this.tooltipService.updateTooltipPosition();
      }
    });
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
        return `<ul class="tooltip-list">${data.map(
          item => `<li class="tooltip-list-item">${buildHtml(item)}</li>`
        ).join('')}</ul>`;
      } else if (data && typeof data === "object" && data !== null) {
        // If data is an object, render its entries as key-value pairs
        return `<div>${Object.entries(data).map(
          ([key, value]) =>
            `<div class="tooltip-key-value">
              <strong>${key}:</strong> <span>${buildHtml(value)}</span>
            </div>`
        ).join('')}</div>`;
      } else {
        // If data is a basic type, convert it to a string and render it
        return `<span class="tooltip-text">${String(data)}</span>`;
      }
    };
  
    // Use DomSanitizer to mark the final HTML as safe
    return this.sanitizer.bypassSecurityTrustHtml(buildHtml(data));
  }
}