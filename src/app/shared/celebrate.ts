import confetti from 'canvas-confetti';

export function celebrateFind(): void {
  void confetti({
    particleCount: 90,
    spread: 75,
    origin: { y: 0.7 },
    disableForReducedMotion: true,
  });
}

export function celebrateMilestone(): void {
  const end = Date.now() + 1200;
  const frame = () => {
    void confetti({
      particleCount: 6,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      disableForReducedMotion: true,
    });
    void confetti({
      particleCount: 6,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      disableForReducedMotion: true,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
