"use client";

import { useEffect, useRef } from "react";

type Phase = "idle" | "running" | "done" | "error";

type StarshipCanvasProps = {
  progress: number;
  phase: Phase;
};

type Star = {
  x: number;
  y: number;
  z: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function StarshipCanvas({ progress, phase }: StarshipCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const progressRef = useRef(progress);
  const phaseRef = useRef<Phase>(phase);
  const starsRef = useRef<Star[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const starCount = Math.max(140, Math.floor((rect.width * rect.height) / 2500));
      starsRef.current = Array.from({ length: starCount }, () => ({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        z: Math.random() * 1,
      }));
    };

    const spawnFlame = (x: number, y: number, intensity: number) => {
      const count = Math.floor(3 + intensity * 8);
      for (let i = 0; i < count; i += 1) {
        particlesRef.current.push({
          x: x + (Math.random() - 0.5) * 6,
          y,
          vx: (Math.random() - 0.5) * (20 + intensity * 30),
          vy: 70 + intensity * 180 + Math.random() * 70,
          life: 0.35 + Math.random() * 0.35,
          maxLife: 0.35 + Math.random() * 0.35,
          size: 1.5 + Math.random() * 2.8,
        });
      }
    };

    const drawRocket = (x: number, y: number) => {
      ctx.save();
      ctx.translate(x, y);

      ctx.fillStyle = "#d7e8ff";
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.quadraticCurveTo(13, -16, 13, 16);
      ctx.lineTo(-13, 16);
      ctx.quadraticCurveTo(-13, -16, 0, -34);
      ctx.fill();

      ctx.fillStyle = "#2ea4ff";
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(8, -18);
      ctx.lineTo(-8, -18);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#0f2d4f";
      ctx.beginPath();
      ctx.arc(0, -8, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#37c5ff";
      ctx.beginPath();
      ctx.arc(0, -8, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#14588f";
      ctx.beginPath();
      ctx.moveTo(-13, 4);
      ctx.lineTo(-21, 16);
      ctx.lineTo(-13, 16);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(13, 4);
      ctx.lineTo(21, 16);
      ctx.lineTo(13, 16);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    const animate = (timestamp: number) => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      const prev = lastTsRef.current || timestamp;
      const dt = Math.min((timestamp - prev) / 1000, 0.04);
      lastTsRef.current = timestamp;

      const p = clamp(progressRef.current, 0, 100);
      const currentPhase = phaseRef.current;

      let speed = 0;
      if (currentPhase === "running") speed = 40 + p * 6.5;
      if (currentPhase === "done") speed = 1200;
      if (currentPhase === "error") speed = 35;

      const shakeAmp = currentPhase === "error" ? 4 : 0;
      const shakeX = shakeAmp ? (Math.random() - 0.5) * shakeAmp : 0;
      const shakeY = shakeAmp ? (Math.random() - 0.5) * shakeAmp : 0;

      ctx.save();
      ctx.clearRect(0, 0, width, height);
      ctx.translate(shakeX, shakeY);

      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, "#040913");
      bg.addColorStop(1, "#081325");
      ctx.fillStyle = bg;
      ctx.fillRect(-10, -10, width + 20, height + 20);

      const nebula = ctx.createRadialGradient(width * 0.7, height * 0.25, 10, width * 0.7, height * 0.25, width * 0.45);
      nebula.addColorStop(0, "rgba(31,213,169,0.18)");
      nebula.addColorStop(1, "rgba(31,213,169,0)");
      ctx.fillStyle = nebula;
      ctx.fillRect(0, 0, width, height);

      for (const star of starsRef.current) {
        if (speed > 0) {
          star.y += (22 + speed * (0.2 + star.z * 0.8)) * dt;
          if (star.y > height + 6) {
            star.y = -6;
            star.x = Math.random() * width;
            star.z = Math.random();
          }
        }

        const brightness = 0.35 + star.z * 0.65;
        const radius = 0.8 + star.z * 1.8;
        if (currentPhase === "done") {
          const streak = 4 + star.z * 16;
          ctx.strokeStyle = `rgba(215, 235, 255, ${brightness})`;
          ctx.lineWidth = radius;
          ctx.beginPath();
          ctx.moveTo(star.x, star.y - streak);
          ctx.lineTo(star.x, star.y + streak);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(215, 235, 255, ${brightness})`;
          ctx.beginPath();
          ctx.arc(star.x, star.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const rocketX = width * 0.5;
      const baseY = height * 0.78;
      const travel = height * 0.45;
      let rocketY = baseY;
      if (currentPhase === "running") {
        rocketY = baseY - (p / 100) * travel;
      } else if (currentPhase === "done") {
        rocketY = baseY - travel - 120;
      } else if (currentPhase === "error") {
        rocketY = baseY - (p / 100) * (travel * 0.25);
      }

      if (currentPhase === "running" || currentPhase === "done") {
        const intensity = currentPhase === "done" ? 1.35 : 0.3 + p / 100;
        spawnFlame(rocketX, rocketY + 20, intensity);
      }

      const nextParticles: Particle[] = [];
      for (const particle of particlesRef.current) {
        particle.life -= dt;
        if (particle.life <= 0) continue;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= 0.98;
        particle.vy *= 0.985;

        const alpha = clamp(particle.life / particle.maxLife, 0, 1);
        ctx.fillStyle = `rgba(255, ${180 + Math.floor(Math.random() * 50)}, 80, ${alpha * 0.85})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        nextParticles.push(particle);
      }
      particlesRef.current = nextParticles.slice(-500);

      if (currentPhase === "done") {
        const glow = ctx.createRadialGradient(rocketX, rocketY, 2, rocketX, rocketY, 70);
        glow.addColorStop(0, "rgba(31,213,169,0.6)");
        glow.addColorStop(1, "rgba(31,213,169,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(rocketX, rocketY, 70, 0, Math.PI * 2);
        ctx.fill();
      }

      if (currentPhase === "error") {
        ctx.strokeStyle = "rgba(239,102,114,0.55)";
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, width - 4, height - 4);
      }

      drawRocket(rocketX, rocketY);

      ctx.restore();
      rafRef.current = window.requestAnimationFrame(animate);
    };

    setCanvasSize();
    window.addEventListener("resize", setCanvasSize);
    rafRef.current = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", setCanvasSize);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      particlesRef.current = [];
      starsRef.current = [];
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[color:var(--np-border)]">
      <canvas ref={canvasRef} className="block h-72 w-full bg-[#071223]" />
      <div className="pointer-events-none absolute inset-x-4 bottom-4">
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-white/70">
          <span>{phase}</span>
          <span>{Math.round(clamp(progress, 0, 100))}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full transition-all duration-200 ${phase === "error" ? "bg-[color:var(--np-danger)]" : "bg-[color:var(--np-primary)]"}`}
            style={{ width: `${clamp(progress, 0, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
