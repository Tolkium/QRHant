import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    @if (insecureContext) {
      <div class="bg-bad text-white text-sm font-semibold text-center px-4 py-2">
        This app needs a secure connection (HTTPS or localhost). Crypto and camera are
        disabled here — accounts and scanning will not work.
      </div>
    }
    <router-outlet />
  `,
})
export class App {
  // Web Crypto and getUserMedia only exist in secure contexts; warn loudly
  // instead of failing with misleading errors deeper in the app.
  readonly insecureContext = !window.isSecureContext;
}
