import { Component, computed, inject, resource } from '@angular/core';
import { AdminApi } from '../../../core/backend/api';
import { AdminState } from '../admin-state';
import { QrImage } from '../../../shared/qr-image';

/**
 * Print-ready sheet: 2/3 artwork, 1/3 QR (no plaintext code — scan only).
 */
@Component({
  selector: 'app-print-page',
  imports: [QrImage],
  template: `
    <div class="p-6">
      <div class="no-print mb-6 flex items-center gap-3">
        <button class="btn-primary" (click)="print()">🖨️ Print / Save as PDF</button>
        <p class="text-muted text-sm">
          Tip: set margins to "None" in the print dialog for clean cut lines.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 print-cards">
        @for (c of codes(); track c.id) {
          <div
            class="print-card border-2 border-dashed border-gray-400 rounded-xl overflow-hidden
              flex flex-row items-stretch break-inside-avoid min-h-[150px]"
          >
            <!-- artwork: 2/3 width -->
            <div class="w-2/3 min-w-0 relative bg-gray-100">
              @if (c.image) {
                <img [src]="c.image" class="absolute inset-0 w-full h-full object-cover" [alt]="c.title" />
              } @else {
                <div class="absolute inset-0 flex items-center justify-center text-5xl">🎨</div>
              }
            </div>
            <!-- QR: 1/3 width, edge-to-edge -->
            <div class="w-1/3 min-w-0 flex items-center justify-center p-0.5 bg-white">
              <app-qr-image [code]="c.code" [size]="qrSize" class="print-qr" />
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    /* QR scales to the full 1/3 column (≈3× the old fixed thumb size) */
    :host ::ng-deep .print-qr img {
      width: 100% !important;
      height: auto !important;
      max-width: 100%;
      border-radius: 0;
    }
    @media print {
      .print-card {
        min-height: 42mm;
      }
    }
  `,
})
export class PrintPage {
  private readonly api = inject(AdminApi);
  private readonly state = inject(AdminState);

  /** Render resolution; display size comes from CSS column width. */
  readonly qrSize = 512;

  private readonly codesRes = resource({
    params: () => ({ id: this.state.selected()?.id }),
    loader: async ({ params }) => (params.id ? this.api.listCodes(params.id) : []),
  });

  readonly codes = computed(() => this.codesRes.value() ?? []);

  constructor() {
    void this.state.load();
  }

  print(): void {
    window.print();
  }
}
