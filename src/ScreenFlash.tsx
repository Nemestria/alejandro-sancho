// Brief flash/glitch layered over the screen-plane right as the portfolio
// iframe appears — covers the moment it boots/loads and sells "power surge"
// instead of an instant flat swap from terminal to portfolio. This is
// Checkpoint 4's previously-open "exit transition on success" item.
//
// Lives inside the same <Html> box as PasswordTerminal/PortfolioFrame (see
// DesktopApp.tsx's screenContent), not a page-wide overlay — it's meant to
// read as something happening *on the monitor*, not the whole page.
export default function ScreenFlash({ onDone }: { onDone: () => void }) {
  return (
    <div
      onAnimationEnd={onDone}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 5,
        pointerEvents: "none",
        animation: "screen-flash 0.6s steps(1, end) forwards",
      }}
    >
      <style>{`
        @keyframes screen-flash {
          0%   { background: #ffffff; opacity: 1;    transform: translateX(0); }
          6%   { background: #bfe9ff; opacity: 0.95;  transform: translateX(0); }
          12%  { background: #000000; opacity: 0.85;  transform: translateX(-3px); }
          18%  { background: #bfe9ff; opacity: 0.5;   transform: translateX(3px); }
          26%  { background: #ffffff; opacity: 0.8;   transform: translateX(0); }
          34%  { background: #000000; opacity: 0.15;  transform: translateX(0); }
          42%  { background: #bfe9ff; opacity: 0.5;   transform: translateX(-2px); }
          50%  { background: #000000; opacity: 0.1;   transform: translateX(0); }
          60%  { background: #ffffff; opacity: 0.35;  transform: translateX(0); }
          72%  { background: #000000; opacity: 0.05;  transform: translateX(0); }
          100% { background: #000000; opacity: 0;     transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
