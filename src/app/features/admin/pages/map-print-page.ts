import { Component, computed, inject, OnInit, resource } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminApi } from '../../../core/backend/api';
import { AdminState } from '../admin-state';
import { CodeRecord, EventMap } from '../../../core/models';

@Component({
  selector: 'app-map-print-page',
  template: `
    <div class="p-6">
      <div class="no-print mb-6 flex items-center gap-3 flex-wrap">
        <button class="btn-primary" (click)="print()">🖨️ Print / Save as PDF</button>
        <p class="text-muted text-sm">Use landscape orientation for wide site plans.</p>
      </div>

      @for (sheet of sheets(); track sheet.map.id) {
        <section class="print-map-sheet mb-8 break-after-page">
          <h2 class="text-xl font-extrabold mb-3 text-center">{{ sheet.map.name }}</h2>
          <div class="relative inline-block w-full max-w-4xl mx-auto border border-gray-300">
            <img [src]="sheet.map.image" class="w-full block" [alt]="sheet.map.name" />
            @for (c of sheet.pins; track c.id) {
              <div
                class="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center"
                [style.left.%]="c.mapX! * 100"
                [style.top.%]="c.mapY! * 100"
              >
                <span class="text-2xl">📍</span>
                <span class="text-[9px] font-bold bg-white/95 border border-gray-300 rounded px-1 text-center max-w-[4rem] leading-tight">
                  {{ c.title }}
                </span>
                @if (c.mapNote) {
                  <span class="text-[8px] text-gray-600 max-w-[4rem] text-center leading-tight">
                    {{ c.mapNote }}
                  </span>
                }
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    @media print {
      .print-map-sheet {
        break-after: page;
        page-break-after: always;
      }
      .print-map-sheet:last-child {
        break-after: auto;
        page-break-after: auto;
      }
    }
  `,
})
export class MapPrintPage implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly state = inject(AdminState);
  private readonly route = inject(ActivatedRoute);

  private readonly codesRes = resource({
    params: () => ({ id: this.state.selected()?.id }),
    loader: async ({ params }) => (params.id ? this.api.listCodes(params.id) : []),
  });

  private filterMapId: string | null = null;

  readonly codes = computed(() => this.codesRes.value() ?? []);

  readonly sheets = computed(() => {
    const event = this.state.selected();
    if (!event) return [];
    const codes = this.codes();
    const maps = this.filterMapId
      ? event.maps.filter((m) => m.id === this.filterMapId)
      : event.maps;
    return maps.map((map) => ({
      map,
      pins: pinsOnMap(codes, map),
    }));
  });

  ngOnInit(): void {
    void this.state.load();
    this.filterMapId = this.route.snapshot.queryParamMap.get('mapId');
  }

  print(): void {
    window.print();
  }
}

function pinsOnMap(codes: CodeRecord[], map: EventMap): CodeRecord[] {
  return codes.filter((c) => c.mapId === map.id && c.mapX !== null && c.mapY !== null);
}
