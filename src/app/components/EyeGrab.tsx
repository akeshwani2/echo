import { TextHoverEffect } from "./text-hover-effect";

export default function TextHoverEffectDemo() {
  return (
    <div className="h-[40rem] mt-60 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Grid lines background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:64px_64px]" />
      
      <div className="relative w-full max-w-[90vw] h-auto aspect-[5/3]">
        <TextHoverEffect text="ECHO" />
      </div>
    </div>
  );
}
