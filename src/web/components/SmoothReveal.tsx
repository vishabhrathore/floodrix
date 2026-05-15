"use client";

import React, { useEffect, useRef } from "react";

import { motion, useAnimation, useInView } from "motion/react";

interface SmoothRevealProps {
  children: React.ReactNode;
  width?: "fit-content" | "100%";
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  id?: string;
}

/**
 * SmoothReveal component for premium scroll-driven reveal animations.
 * Uses Framer Motion with a custom cubic-bezier for a high-end feel.
 */
const SmoothReveal: React.FC<SmoothRevealProps> = ({
  children,
  width = "100%",
  delay = 0.2,
  direction = "up",
  distance = 40,
  id,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const mainControls = useAnimation();

  useEffect(() => {
    if (isInView) {
      mainControls.start("visible");
    }
  }, [isInView]);

  const variants = {
    hidden: {
      opacity: 0,
      y: direction === "up" ? distance : direction === "down" ? -distance : 0,
      x:
        direction === "left" ? distance : direction === "right" ? -distance : 0,
      filter: "blur(10px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      filter: "blur(0px)",
    },
  };

  return (
    <div
      id={id}
      ref={ref}
      style={{ position: "relative", width, overflow: "visible" }}
    >
      <motion.div
        variants={variants}
        initial="hidden"
        animate={mainControls}
        transition={{
          duration: 1.2,
          delay,
          ease: [0.16, 1, 0.3, 1], // Custom quintic ease-out for premium smoothness
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default SmoothReveal;
