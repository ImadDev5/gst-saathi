import { useEffect, useRef } from "react";

export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const particles = [];

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;

      constructor() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > w) this.vx *= -1;
        if (this.y < 0 || this.y > h) this.vy *= -1;
      }
    }

    const init = () => {
      particles.length = 0;
      for (let i = 0; i < 80; i++) {
        particles.push(new Particle());
      }
    };

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    const animate = () => {
      ctx.clearRect(0, 0, w, h);

      particles.forEach((p) => {
        p.update();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 212, 255, 0.3)";
        ctx.fill();

        particles.forEach((p2) => {
          const d = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = "rgba(0, 212, 255, " + 0.1 * (1 - d / 120) + ")";
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    };

    resize();
    init();
    animate();

    window.addEventListener("resize", () => {
      resize();
      init();
    });

    return () => {
      window.removeEventListener("resize", () => {});
    };
  }, []);

  return <canvas ref={canvasRef} id="hero-canvas" className="absolute top-0 left-0 w-full h-full z-0" />;
}
