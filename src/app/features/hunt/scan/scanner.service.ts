import { Injectable } from '@angular/core';

type ZxingReader = typeof import('zxing-wasm/reader');

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
}

/**
 * Camera + QR decoding. Prefers the native BarcodeDetector (Chrome/Android,
 * zero download); falls back to zxing-wasm served from our own origin so
 * scanning also works offline in Safari/Firefox.
 */
@Injectable({ providedIn: 'root' })
export class ScannerService {
  private stream: MediaStream | null = null;
  private loopHandle: number | null = null;
  private detector: BarcodeDetector | null = null;
  private zxing: ZxingReader | null = null;
  private canvas = document.createElement('canvas');

  /** True when running inside the Capacitor Android shell. */
  isNative(): boolean {
    const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
    return cap?.isNativePlatform?.() ?? false;
  }

  /**
   * Native path (Android APK): MLKit scans in a native view — much faster on
   * low-end devices than a JS frame loop. One-shot; the caller loops.
   */
  async scanOnceNative(): Promise<string | null> {
    const { BarcodeScanner, BarcodeFormat } = await import('@capacitor-mlkit/barcode-scanning');
    const permission = await BarcodeScanner.requestPermissions();
    if (permission.camera !== 'granted' && permission.camera !== 'limited') {
      throw new Error('camera-denied');
    }
    const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
    return barcodes[0]?.rawValue ?? null;
  }

  async start(video: HTMLVideoElement, onDecode: (raw: string) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    video.srcObject = this.stream;
    await video.play();

    if ('BarcodeDetector' in window) {
      try {
        const formats = await BarcodeDetector.getSupportedFormats();
        if (formats.includes('qr_code')) {
          this.detector = new BarcodeDetector({ formats: ['qr_code'] });
        }
      } catch {
        this.detector = null;
      }
    }
    if (!this.detector) {
      this.zxing = await import('zxing-wasm/reader');
      this.zxing.prepareZXingModule({
        overrides: { locateFile: () => '/wasm/zxing_reader.wasm' },
      });
    }

    const tick = async () => {
      if (!this.stream) return;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        try {
          const value = await this.decodeFrame(video);
          if (value) onDecode(value);
        } catch {
          // transient decode errors are expected; keep scanning
        }
      }
      this.loopHandle = window.setTimeout(tick, 200);
    };
    void tick();
  }

  private async decodeFrame(video: HTMLVideoElement): Promise<string | null> {
    if (this.detector) {
      const results = await this.detector.detect(video);
      return results[0]?.rawValue ?? null;
    }
    if (this.zxing) {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return null;
      this.canvas.width = w;
      this.canvas.height = h;
      const ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(video, 0, 0, w, h);
      const results = await this.zxing.readBarcodes(ctx.getImageData(0, 0, w, h), {
        formats: ['QRCode'],
        maxNumberOfSymbols: 1,
      });
      return results[0]?.text ?? null;
    }
    return null;
  }

  stop(video?: HTMLVideoElement | null): void {
    if (this.loopHandle !== null) {
      clearTimeout(this.loopHandle);
      this.loopHandle = null;
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (video) video.srcObject = null;
  }
}

declare global {
  class BarcodeDetector {
    constructor(options?: { formats: string[] });
    static getSupportedFormats(): Promise<string[]>;
    detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
  }
}
