import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { cardVariant, zenVariant } from './hunt-card-art';

@Component({
  selector: 'app-hunt-card',
  imports: [RouterLink, NgTemplateOutlet],
  template: `
    @if (link()) {
      <a [routerLink]="link()!" class="hunt-card" [class.hunt-card-locked]="!found()">
        <ng-container *ngTemplateOutlet="layers" />
      </a>
    } @else {
      <div class="hunt-card" [class.hunt-card-locked]="!found()">
        <ng-container *ngTemplateOutlet="layers" />
      </div>
    }

    <ng-template #layers>
      <!-- Zen parchment layer -->
      <div class="hunt-card-zen">
        <span class="zen-kanji" [class]="zen().kanjiStyle">{{ zen().kanji }}</span>
        <div class="zen-art">
          @switch (variant()) {
            @case (0) {
              @if (found()) {
                <svg viewBox="0 0 120 120">
                  <rect fill="#faf6ef" width="120" height="120" />
                  <path
                    d="M60 95 L38 95 L42 68 L32 68 L60 35 L88 68 L78 68 L82 95Z"
                    fill="#1a1a1a"
                    opacity="0.75"
                  />
                  <rect x="52" y="58" width="16" height="37" fill="#1a1a1a" opacity="0.5" />
                  <circle cx="35" cy="28" r="9" fill="#c41e3a" />
                  <circle cx="55" cy="18" r="7" fill="#c41e3a" opacity="0.85" />
                  <circle cx="88" cy="32" r="8" fill="#c41e3a" opacity="0.9" />
                  <circle cx="72" cy="15" r="6" fill="#c41e3a" opacity="0.7" />
                </svg>
              } @else {
                <svg viewBox="0 0 120 120">
                  <rect fill="#f0ebe3" width="120" height="120" />
                  <path
                    d="M60 90 L42 90 L45 65 L38 65 L60 40 L82 65 L75 65 L78 90Z"
                    fill="#bbb"
                    opacity="0.5"
                  />
                  <circle cx="40" cy="30" r="7" fill="#ddd" />
                </svg>
              }
            }
            @case (1) {
              @if (found()) {
                <svg viewBox="0 0 120 120">
                  <rect fill="#faf6ef" width="120" height="120" />
                  <path
                    d="M60 15 Q85 45 70 75 Q55 95 60 110"
                    stroke="#5d4037"
                    stroke-width="3"
                    stroke-linecap="round"
                    fill="none"
                  />
                  <rect
                    x="48"
                    y="40"
                    width="6"
                    height="22"
                    rx="1"
                    fill="#fff"
                    stroke="#1a1a1a"
                    stroke-width="0.7"
                    transform="rotate(-6 51 51)"
                  />
                  <rect
                    x="62"
                    y="52"
                    width="6"
                    height="26"
                    rx="1"
                    fill="#fff"
                    stroke="#1a1a1a"
                    stroke-width="0.7"
                    transform="rotate(4 65 65)"
                  />
                  <rect x="52" y="68" width="6" height="20" rx="1" fill="#fff" stroke="#1a1a1a" stroke-width="0.7" />
                  <circle cx="90" cy="30" r="8" fill="#c41e3a" />
                  <circle cx="100" cy="48" r="6" fill="#c41e3a" opacity="0.8" />
                </svg>
              } @else {
                <svg viewBox="0 0 120 120">
                  <rect fill="#f0ebe3" width="120" height="120" />
                  <circle cx="75" cy="40" r="28" fill="#ddd" opacity="0.5" />
                  <path
                    d="M30 95 L30 55 L42 48 L45 62 L55 52 L58 90Z"
                    fill="#999"
                    opacity="0.4"
                  />
                  <ellipse cx="38" cy="50" rx="8" ry="9" fill="#bbb" opacity="0.5" />
                </svg>
              }
            }
            @case (2) {
              @if (found()) {
                <svg viewBox="0 0 120 120">
                  <rect fill="#faf6ef" width="120" height="120" />
                  <circle cx="75" cy="45" r="30" fill="#c41e3a" opacity="0.35" />
                  <path d="M35 95 L35 60 L48 52 L52 68 L62 58 L65 95Z" fill="#1a1a1a" opacity="0.6" />
                  <ellipse cx="44" cy="54" rx="9" ry="10" fill="#1a1a1a" opacity="0.45" />
                </svg>
              } @else {
                <svg viewBox="0 0 120 120">
                  <rect fill="#f0ebe3" width="120" height="120" />
                  <path d="M70 95 L100 55 L130 95" fill="none" stroke="#aaa" stroke-width="1.5" />
                  <ellipse cx="100" cy="100" rx="60" ry="8" fill="#ccc" opacity="0.2" />
                </svg>
              }
            }
            @default {
              @if (found()) {
                <svg viewBox="0 0 120 120">
                  <rect fill="#faf6ef" width="120" height="120" />
                  <path
                    d="M60 95 L38 95 L42 68 L32 68 L60 35 L88 68 L78 68 L82 95Z"
                    fill="#1a1a1a"
                    opacity="0.75"
                  />
                  <rect x="52" y="58" width="16" height="37" fill="#1a1a1a" opacity="0.5" />
                  <circle cx="35" cy="28" r="9" fill="#c41e3a" />
                </svg>
              } @else {
                <svg viewBox="0 0 120 120">
                  <rect fill="#f0ebe3" width="120" height="120" />
                  <circle cx="75" cy="40" r="28" fill="#ddd" opacity="0.5" />
                  <path d="M30 95 L30 55 L42 48 L45 62 L55 52 L58 90Z" fill="#999" opacity="0.4" />
                </svg>
              }
            }
          }
        </div>
        <div class="hunt-card-body">
          <p class="hunt-card-title">{{ title() }}</p>
          <p class="hunt-card-meta">{{ meta() }}</p>
        </div>
      </div>

      <!-- Kiyo layer -->
      <div class="hunt-card-kiyo">
        @if (found()) {
          <span class="kiyo-badge">発見</span>
        }
        <div class="kiyo-art">
          @if (found()) {
            <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="kiyoSky{{ uid }}" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#b8d4f0" />
                  <stop offset="100%" stop-color="#f0e8f4" />
                </linearGradient>
                <linearGradient id="kiyoFuji{{ uid }}" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#5a6a7a" />
                  <stop offset="100%" stop-color="#2c3e50" />
                </linearGradient>
              </defs>
              <rect width="200" height="120" [attr.fill]="'url(#kiyoSky' + uid + ')'" />
              <ellipse cx="170" cy="28" rx="22" ry="22" fill="#fff" opacity="0.9" />
              <path d="M60 95 L100 35 L140 95 Z" [attr.fill]="'url(#kiyoFuji' + uid + ')'" />
              <path d="M95 50 L100 35 L105 50" fill="#fff" opacity="0.85" />
              <rect x="0" y="95" width="200" height="25" fill="#6b9b6b" opacity="0.35" />
            </svg>
          } @else {
            <svg viewBox="0 0 200 120">
              <rect width="200" height="120" fill="#e8e8ed" />
              <path d="M80 95 L100 55 L120 95Z" fill="#d2d2d7" opacity="0.6" />
            </svg>
          }
        </div>
        <div class="hunt-card-body">
          <p class="hunt-card-title">{{ title() }}</p>
          <p class="hunt-card-meta">{{ meta() }}</p>
        </div>
      </div>

      <!-- Wagara layer -->
      <div class="hunt-card-wamon">
        <div class="wamon-art">
          @if (found()) {
            <svg viewBox="0 0 200 120">
              <defs>
                <pattern [attr.id]="'wm-sg' + uid" width="14" height="7" patternUnits="userSpaceOnUse">
                  <path
                    d="M0 7 Q3.5 0 7 7 Q10.5 0 14 7"
                    fill="none"
                    stroke="#b8956a"
                    stroke-width="0.8"
                  />
                </pattern>
              </defs>
              <rect fill="#f5efe6" width="200" height="120" />
              <rect [attr.fill]="'url(#wm-sg' + uid + ')'" width="200" height="120" opacity="0.55" />
              <circle cx="100" cy="55" r="32" fill="#b5352d" opacity="0.12" />
            </svg>
          } @else {
            <svg viewBox="0 0 200 120">
              <rect fill="#ebe4da" width="200" height="120" />
              <circle cx="100" cy="60" r="28" fill="#b5352d" opacity="0.08" />
            </svg>
          }
        </div>
        <div class="hunt-card-body">
          <p class="hunt-card-title">{{ title() }}</p>
          <p class="hunt-card-meta">{{ meta() }}</p>
        </div>
      </div>

      <!-- Sumi layer -->
      <div class="hunt-card-sumi">
        @if (found()) {
          <span class="sumi-stamp">印</span>
        }
        <div class="sumi-art">
          @if (found()) {
            <svg viewBox="0 0 200 120">
              <circle cx="42" cy="32" r="18" fill="#e60012" />
              <path d="M55 100 L100 35 L145 100" fill="none" stroke="#1a1a1a" stroke-width="2" />
              <path d="M88 95 L100 58 L112 95" fill="#fff" />
            </svg>
          } @else {
            <svg viewBox="0 0 200 120">
              <path d="M70 95 L100 55 L130 95" fill="none" stroke="#aaa" stroke-width="1.5" />
              <ellipse cx="100" cy="100" rx="60" ry="8" fill="#ccc" opacity="0.2" />
            </svg>
          }
        </div>
        <div class="hunt-card-body">
          <p class="hunt-card-title">{{ title() }}</p>
          <p class="hunt-card-meta">{{ meta() }}</p>
        </div>
      </div>

      <!-- Kawaii layer -->
      <div class="hunt-card-kawaii">
        @if (found()) {
          <span class="kawaii-badge">★</span>
        }
        <div class="kawaii-art">
          @if (found()) {
            <svg viewBox="0 0 200 120">
              <rect fill="#fff8f9" width="200" height="120" />
              <circle cx="155" cy="35" r="22" fill="#ffe566" opacity="0.85" />
              <path
                d="M30 85 Q60 60 100 75 Q140 90 170 70"
                stroke="#f4a0b0"
                stroke-width="3"
                fill="none"
                stroke-linecap="round"
              />
            </svg>
          } @else {
            <svg viewBox="0 0 200 120">
              <rect fill="#f5f0f1" width="200" height="120" />
              <ellipse cx="100" cy="72" rx="40" ry="30" fill="#e8e0e2" stroke="#c9b8bc" stroke-width="1.2" />
            </svg>
          }
        </div>
        <div class="hunt-card-body">
          <p class="hunt-card-title">{{ title() }}</p>
          <p class="hunt-card-meta">{{ meta() }}</p>
        </div>
      </div>

      <!-- Izakaya layer -->
      <div class="hunt-card-izakaya">
        @if (found()) {
          <span class="izakaya-tag">New</span>
        }
        <div class="izakaya-art">
          <div class="izakaya-plate">
            @if (found()) {
              <svg viewBox="0 0 60 60">
                <ellipse cx="30" cy="32" rx="22" ry="14" fill="#f5f0e6" />
                <ellipse cx="30" cy="28" rx="16" ry="9" fill="#ff8a65" />
                <ellipse cx="30" cy="26" rx="12" ry="6" fill="#ffab91" />
              </svg>
            } @else {
              <svg viewBox="0 0 60 60">
                <ellipse cx="30" cy="38" rx="22" ry="9" fill="#ccc" />
              </svg>
            }
          </div>
        </div>
        <div class="hunt-card-body">
          <p class="hunt-card-title">{{ title() }}</p>
          <p class="hunt-card-meta">{{ meta() }}</p>
        </div>
      </div>

      <!-- Generic fallback (photo / simple art) -->
      <div class="hunt-card-inner">
        <div class="hunt-card-art" [class.hunt-card-art-locked]="!found()">
          @if (image()) {
            <img [src]="image()!" [alt]="title()" />
          } @else if (!found()) {
            <span aria-hidden="true">❓</span>
          } @else {
            <span class="text-4xl" aria-hidden="true">🎨</span>
          }
        </div>
        <div class="hunt-card-body">
          <p class="hunt-card-title">{{ title() }}</p>
          <p class="hunt-card-meta">{{ meta() }}</p>
        </div>
      </div>
    </ng-template>
  `,
})
export class HuntCard {
  readonly found = input.required<boolean>();
  readonly title = input.required<string>();
  readonly meta = input.required<string>();
  readonly image = input<string | null>(null);
  readonly index = input.required<number>();
  readonly link = input<string | null>(null);

  /** Unique id for inline SVG gradient refs */
  readonly uid = Math.random().toString(36).slice(2, 8);

  readonly variant = computed(() => cardVariant(this.index()));
  readonly zen = computed(() => zenVariant(this.index(), this.found()));
}
