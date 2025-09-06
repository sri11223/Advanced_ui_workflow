import React from "react";
import { TextGenerateEffect } from "./ui/text-generate-effect";

const words = `Transform your design workflow with UIFlow's revolutionary AI-powered platform. From wireframes to production-ready code in minutes, not hours. Experience the future of UI development where creativity meets cutting-edge technology, enabling teams to build faster, smarter, and more efficiently than ever before.`;

export function TextGenerateEffectDemo() {
  return <TextGenerateEffect words={words} className="text-center max-w-4xl mx-auto" />;
}
