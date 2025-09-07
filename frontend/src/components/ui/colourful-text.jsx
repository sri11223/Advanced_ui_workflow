"use client";
import React from "react";
import { motion } from "framer-motion";

const ColourfulText = ({ text }) => {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"
  ];

  return (
    <span className="inline-block">
      {text.split("").map((char, index) => (
        <motion.span
          key={index}
          className="inline-block"
          style={{
            color: colors[index % colors.length],
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            color: colors[(index + Math.floor(Date.now() / 1000)) % colors.length]
          }}
          transition={{
            duration: 0.5,
            delay: index * 0.1,
            repeat: Infinity,
            repeatType: "reverse",
            repeatDelay: 2
          }}
          whileHover={{
            scale: 1.2,
            transition: { duration: 0.2 }
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
};

export default ColourfulText;
export { ColourfulText };
