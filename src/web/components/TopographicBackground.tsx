"use client";

import React, { useEffect, useRef } from "react";

const TopographicBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    window.addEventListener("resize", resize);
    resize();

    const draw = () => {
      time += 0.002;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const rows = 50;
      const cols = 50;
      const spacingX = (canvas.width * 1.5) / (cols - 1);
      const spacingY = (canvas.height * 1.5) / (rows - 1);

      const getZ = (x: number, y: number) => {
        const d = Math.sqrt(
          (x - canvas.width / 2) ** 2 + (y - canvas.height / 2) ** 2,
        );
        const noise =
          Math.sin(x * 0.003 + time) * Math.cos(y * 0.003 + time) * 40 +
          Math.sin(x * 0.006 - time * 1.5) * 15 +
          Math.cos(y * 0.005 + time * 0.8) * 10;
        return noise;
      };

      const project = (x: number, y: number, z: number) => {
        // Center-relative coordinates
        let cx = x - canvas.width * 0.75;
        let cy = y - canvas.height * 0.75;

        // Tilt/Rotation
        const tilt = 0.5;
        const ry = cy * Math.cos(tilt) - z * Math.sin(tilt);
        const rz = cy * Math.sin(tilt) + z * Math.cos(tilt);

        const perspective = 1200;
        const scale = perspective / (perspective + rz);
        const px = cx * scale + canvas.width / 2;
        const py = ry * scale + canvas.height / 2;
        return { x: px, y: py, opacity: scale * 0.8 };
      };

      ctx.lineWidth = 0.4;

      for (let i = 0; i < cols; i++) {
        ctx.beginPath();
        for (let j = 0; j < rows; j++) {
          const x = i * spacingX;
          const y = j * spacingY;
          const z = getZ(x, y);
          const p = project(x, y, z);

          if (j === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);

          // Dynamic opacity based on "depth"
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.03 * p.opacity})`;
        }
        ctx.stroke();
      }

      for (let j = 0; j < rows; j++) {
        ctx.beginPath();
        for (let i = 0; i < cols; i++) {
          const x = i * spacingX;
          const y = j * spacingY;
          const z = getZ(x, y);
          const p = project(x, y, z);

          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);

          ctx.strokeStyle = `rgba(255, 255, 255, ${0.03 * p.opacity})`;
        }
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none" }}
    />
  );
};

export default TopographicBackground;
