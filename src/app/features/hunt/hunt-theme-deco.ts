import { Component } from '@angular/core';

/** Background scenery layers from design/index.html — visibility toggled via themes.css. */
@Component({
  selector: 'app-hunt-theme-deco',
  template: `
    <div class="phone-ambient hunt-deco-layer" aria-hidden="true"></div>
    <div class="glass-blob glass-blob-1 hunt-deco-layer" aria-hidden="true"></div>
    <div class="glass-blob glass-blob-2 hunt-deco-layer" aria-hidden="true"></div>

    <div class="wamon-deco hunt-deco-layer" aria-hidden="true">
      <svg class="wamon-deco-tl" viewBox="0 0 200 80" fill="none">
        <path d="M0 42 Q25 28 50 42 Q75 28 100 42 Q125 28 150 42 Q175 28 200 42 L200 55 Q175 68 150 55 Q125 68 100 55 Q75 68 50 55 Q25 68 0 55Z" fill="#b8956a"/>
        <path d="M8 48 L8 52 M16 44 L16 56 M24 48 L24 52 M32 44 L32 56 M40 48 L40 52" stroke="#9a7d52" stroke-width="1.5"/>
        <path d="M48 48 L48 52 M56 44 L56 56 M64 48 L64 52" stroke="#9a7d52" stroke-width="1.5"/>
      </svg>
      <svg class="wamon-deco-tr" viewBox="0 0 180 100" fill="none">
        <circle cx="130" cy="35" r="30" fill="#d4bc8a" opacity="0.7"/>
        <circle cx="130" cy="35" r="22" fill="#e8d4a8" opacity="0.5"/>
        <path d="M100 70 Q115 55 130 70 Q145 55 160 70 Q175 55 190 70" stroke="#b5352d" stroke-width="2" fill="none"/>
        <path d="M110 75 Q120 65 130 75 Q140 65 150 75" stroke="#b5352d" stroke-width="1.5" fill="none"/>
        <circle cx="155" cy="22" r="4" fill="#fff" stroke="#b5352d" stroke-width="0.5"/>
      </svg>
      <svg class="wamon-deco-bl" viewBox="0 0 160 120" fill="none">
        <circle cx="60" cy="80" r="55" fill="#b5352d" opacity="0.85"/>
        <circle cx="45" cy="65" r="3" fill="#9a2a22"/><circle cx="55" cy="60" r="3" fill="#9a2a22"/><circle cx="65" cy="65" r="3" fill="#9a2a22"/>
        <circle cx="40" cy="78" r="3" fill="#9a2a22"/><circle cx="50" cy="75" r="3" fill="#9a2a22"/><circle cx="60" cy="72" r="3" fill="#9a2a22"/><circle cx="70" cy="75" r="3" fill="#9a2a22"/>
        <circle cx="45" cy="90" r="3" fill="#9a2a22"/><circle cx="55" cy="88" r="3" fill="#9a2a22"/><circle cx="65" cy="90" r="3" fill="#9a2a22"/>
      </svg>
      <svg class="wamon-deco-br" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="8" fill="none" stroke="#b8956a" stroke-width="1.5"/>
        <ellipse cx="50" cy="30" rx="6" ry="14" fill="none" stroke="#b8956a" stroke-width="1.2"/>
        <ellipse cx="50" cy="70" rx="6" ry="14" fill="none" stroke="#b8956a" stroke-width="1.2"/>
        <ellipse cx="30" cy="50" rx="14" ry="6" fill="none" stroke="#b8956a" stroke-width="1.2"/>
        <ellipse cx="70" cy="50" rx="14" ry="6" fill="none" stroke="#b8956a" stroke-width="1.2"/>
        <circle cx="78" cy="28" r="3" fill="#b5352d"/>
      </svg>
    </div>

    <div class="zen-deco hunt-deco-layer" aria-hidden="true">
      <svg class="zen-deco-pagoda" viewBox="0 0 200 200" fill="none">
        <path d="M100 160 L70 160 L75 120 L65 120 L100 60 L135 120 L125 120 L130 160 Z" fill="#1a1a1a" opacity="0.6"/>
        <rect x="88" y="100" width="24" height="60" fill="#1a1a1a" opacity="0.4"/>
        <path d="M60 120 L140 120" stroke="#1a1a1a" stroke-width="3"/>
        <circle cx="55" cy="45" r="12" fill="#c41e3a" opacity="0.8"/><circle cx="80" cy="30" r="9" fill="#c41e3a" opacity="0.7"/>
        <circle cx="145" cy="55" r="11" fill="#c41e3a" opacity="0.75"/><circle cx="120" cy="25" r="8" fill="#c41e3a" opacity="0.65"/>
      </svg>
      <svg class="zen-deco-tanzaku" viewBox="0 0 180 160" fill="none">
        <path d="M90 20 Q120 60 100 100 Q80 130 90 150" stroke="#5d4037" stroke-width="4" stroke-linecap="round"/>
        <rect x="75" y="50" width="8" height="28" rx="1" fill="#faf6ef" stroke="#1a1a1a" stroke-width="0.8" transform="rotate(-8 79 64)"/>
        <rect x="95" y="65" width="8" height="32" rx="1" fill="#faf6ef" stroke="#1a1a1a" stroke-width="0.8" transform="rotate(5 99 81)"/>
        <circle cx="130" cy="40" r="10" fill="#c41e3a" opacity="0.7"/>
      </svg>
      <svg class="zen-deco-samurai" viewBox="0 0 240 180" fill="none">
        <circle cx="160" cy="70" r="55" fill="#c41e3a" opacity="0.5"/>
        <path d="M60 140 L60 80 L75 70 L80 90 L95 75 L100 130 Z" fill="#1a1a1a" opacity="0.55"/>
        <ellipse cx="72" cy="72" rx="12" ry="14" fill="#1a1a1a" opacity="0.5"/>
      </svg>
    </div>

    <div class="sumi-deco hunt-deco-layer" aria-hidden="true">
      <svg viewBox="0 0 360 640" preserveAspectRatio="xMidYMid slice" fill="none">
        <circle cx="72" cy="68" r="34" fill="#e60012"/>
        <path d="M60 480 L148 220 L236 480" fill="none" stroke="#1a1a1a" stroke-width="2.5"/>
        <path d="M130 260 L148 220 L166 260" fill="#fff"/>
        <path d="M340 20 Q310 100 290 180 Q275 250 258 320" stroke="#1a1a1a" stroke-width="6" stroke-linecap="round"/>
        <circle cx="278" cy="88" r="6" fill="#e60012"/>
      </svg>
    </div>

    <div class="kawaii-deco hunt-deco-layer" aria-hidden="true">
      <svg class="kawaii-bubble-1" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="45" fill="#f4a0b0" opacity="0.4"/></svg>
      <svg class="kawaii-bubble-2" viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="36" fill="#fce8ec"/></svg>
    </div>

    <div class="izakaya-deco hunt-deco-layer" aria-hidden="true">
      <svg class="izakaya-noodles" viewBox="0 0 200 280" fill="none">
        <circle cx="55" cy="55" r="42" fill="#e9542e"/>
        <path d="M25 75 Q35 55 45 75 Q55 55 65 75" stroke="#fff" stroke-width="3" fill="none"/>
      </svg>
      <svg class="izakaya-waves" viewBox="0 0 300 120" fill="none">
        <path d="M0 60 Q25 30 50 60 Q75 30 100 60 Q125 30 150 60" stroke="#e9542e" stroke-width="2"/>
      </svg>
    </div>
  `,
})
export class HuntThemeDeco {}
