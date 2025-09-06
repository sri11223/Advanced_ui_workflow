import React from "react";
import { Meteors } from "./ui/meteors";

export function MeteorsCard({ title, description, icon: Icon, buttonText = "Explore" }) {
  return (
    <div className="relative w-full max-w-xs">
      <div className="absolute inset-0 h-full w-full scale-[0.80] transform rounded-full bg-gradient-to-r from-purple-500 to-pink-500 blur-3xl opacity-60" />
      <div className="relative flex h-full flex-col items-start justify-end overflow-hidden rounded-2xl border border-white/20 bg-black/40 backdrop-blur-xl px-4 py-8 shadow-xl">
        <div className="mb-4 flex h-5 w-5 items-center justify-center rounded-full border border-gray-500">
          {Icon && <Icon className="h-2 w-2 text-gray-300" />}
        </div>

        <h1 className="relative z-50 mb-4 text-xl font-bold text-white">
          {title}
        </h1>

        <p className="relative z-50 mb-4 text-base font-normal text-white/70">
          {description}
        </p>

        <button className="rounded-lg border border-white/30 px-4 py-1 text-white/90 hover:bg-white/10 hover:border-white/50 transition-all duration-200">
          {buttonText}
        </button>

        {/* Meaty part - Meteor effect */}
        <Meteors number={20} />
      </div>
    </div>
  );
}
