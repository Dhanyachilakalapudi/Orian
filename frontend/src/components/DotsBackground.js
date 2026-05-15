import { useEffect, useRef } from 'react';

const SPACING = 35;
const RADIUS = 2;
const REPEL_DIST = 120;
const REPEL_STRENGTH = 60;
const RETURN_SPEED = 0.08;
const DOT_COLOR = 'rgba(0,0,0,0.18)';

export default function DotsBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let dots = [];
    let mouse = { x: -9999, y: -9999 };
    let animId;

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      dots = [];
      for (let x = SPACING; x < canvas.width; x += SPACING) {
        for (let y = SPACING; y < canvas.height; y += SPACING) {
          dots.push({ ox: x, oy: y, x, y, vx: 0, vy: 0 });
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach(d => {
        const dx = d.x - mouse.x;
        const dy = d.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < REPEL_DIST) {
          const force = (REPEL_DIST - dist) / REPEL_DIST;
          d.vx += (dx / dist) * force * REPEL_STRENGTH * 0.1;
          d.vy += (dy / dist) * force * REPEL_STRENGTH * 0.1;
        }

        d.vx += (d.ox - d.x) * RETURN_SPEED;
        d.vy += (d.oy - d.y) * RETURN_SPEED;
        d.vx *= 0.75;
        d.vy *= 0.75;
        d.x += d.vx;
        d.y += d.vy;

        ctx.beginPath();
        ctx.arc(d.x, d.y, RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = DOT_COLOR;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };

    const onMouseMove = e => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onMouseLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    const onResize = () => init();

    init();
    draw();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
