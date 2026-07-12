import { Component, computed, inject, resource } from '@angular/core';
import { AdminApi } from '../../../core/backend/api';
import { AdminState } from '../admin-state';
import { QrImage } from '../../../shared/qr-image';

/**
 * Print-ready sheet: portrait 3:4 card, artwork top 2/3, QR strip bottom 1/3.
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

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print-cards">
        @for (c of codes(); track c.id) {
          <div class="print-card break-inside-avoid">
            <div class="print-card-art">
              @if (c.image) {
                <img [src]="c.image" [alt]="c.title" />
              } @else {
                <span class="print-card-placeholder" aria-hidden="true">🎨</span>
              }
            </div>
            <div class="print-card-qr">
              <app-qr-image [code]="c.code" [size]="qrSize" class="print-qr" />
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .print-card {
      aspect-ratio: 3 / 4;
      display: flex;
      flex-direction: column;
      border: 2px dashed #9ca3af;
      border-radius: 0.75rem;
      overflow: hidden;
      background: #fff;
    }
    .print-card-art {
      flex: 2 1 0;
      min-height: 0;
      position: relative;
      background: #f3f4f6;
      overflow: hidden;
    }
    .print-card-art img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .print-card-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3rem;
    }
    .print-card-qr {
      flex: 1 1 0;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.15rem;
      background: #fff;
      border-top: 1px dashed #d1d5db;
    }
    :host ::ng-deep .print-qr img {
      width: 100% !important;
      height: 100% !important;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 0;
    }
    @media print {
      .print-card {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  `,
})
export class PrintPage {
  private readonly api = inject(AdminApi);
  private readonly state = inject(AdminState);

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
