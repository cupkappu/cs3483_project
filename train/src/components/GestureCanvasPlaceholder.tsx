import { useEffect, useRef } from "react";

/**
 * Temporary canvas until we wire the actual p5 capture sketch.
 * Renders an animated gradient to keep the layout visually anchored.
 */
export default function GestureCanvasPlaceholder() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;

    const render = (timestamp: number) => {
      const width = canvas.width;
      const height = canvas.height;

      const gradient = context.createLinearGradient(0, 0, width, height);
      const progress = (timestamp % 4000) / 4000;

      gradient.addColorStop(0, `hsl(${Math.floor(progress * 360)}, 90%, 60%)`);
      gradient.addColorStop(1, `hsl(${Math.floor((progress + 0.2) * 360)}, 70%, 30%)`);

      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return <canvas ref={canvasRef} className="canvas-frame" width={640} height={360} />;
}
