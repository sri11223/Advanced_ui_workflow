import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../utils/cn";

export const BackgroundLines = ({
  children,
  className,
  svgOptions = { duration: 10 },
  ...props
}) => {
  return (
    <div
      className={cn(
        "min-h-screen w-full bg-black relative",
        className
      )}
      {...props}
    >
      <div className="fixed inset-0 w-full h-full z-0">
        <GridPattern {...svgOptions} />
      </div>
      <div className="relative z-10 w-full min-h-screen">{children}</div>
    </div>
  );
};

const GridPattern = ({ duration = 25 }) => {
  const columns = 20;
  const rows = 8;
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="grid-pattern"
          width={`${100 / columns}%`}
          height={`${100 / rows}%`}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${100 / columns} 0 L 0 0 0 ${100 / rows}`}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-pattern)" />
      {Array.from({ length: columns }).map((_, i) => (
        <motion.line
          key={`col-${i}`}
          x1={`${(100 / columns) * i}%`}
          y1="0%"
          x2={`${(100 / columns) * i}%`}
          y2="100%"
          stroke={`hsl(${200 + (i % 3) * 20}, 80%, 70%)`}
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 1, 0] }}
          transition={{
            duration: duration,
            repeat: Infinity,
            delay: (i * 2) % duration,
            ease: "linear",
          }}
        />
      ))}
      {Array.from({ length: rows }).map((_, i) => (
        <motion.line
          key={`row-${i}`}
          x1="0%"
          y1={`${(100 / rows) * i}%`}
          x2="100%"
          y2={`${(100 / rows) * i}%`}
          stroke={`hsl(${220 + (i % 3) * 15}, 80%, 70%)`}
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 1, 0] }}
          transition={{
            duration: duration,
            repeat: Infinity,
            delay: (i * 3) % duration,
            ease: "linear",
          }}
        />
      ))}
    </svg>
  );
};
