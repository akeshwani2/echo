import React from "react";
import { ContainerScroll } from "./container-scroll-animation";
import Image from "next/image";
import Link from "next/link";

function Hero() {
  return (
    <section className="min-h-[80vh] bg-black !overflow-visible relative flex flex-col items-center justify-center antialiased">
      {/* Grid lines background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:64px_64px]" />
      
      <ContainerScroll
        titleComponent={
          <div className="flex items-center flex-col">
              <div className="flex items-center justify-center pb-4 hover:scale-105 transition-all duration-300 cursor-pointer">
                <button className="border rounded-full hover:bg-white/80 hover:text-black transition-all duration-300 px-4 py-2 cursor-pointer hover:scale-105">
                  <Link href="/sign-up" className="cursor-pointer">
                    Try echo
                  </Link>
                </button>
              </div>

            <h1 className="text-4xl md:text-6xl tracking-tighter pb-12 text-center max-w-5xl mx-auto relative">
              AI that remembers you, making every conversation more{" "}
              <span className="relative">
                personalized
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  width="100%"
                  height="12"
                  viewBox="0 0 200 12"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M1 8C20 3 50 3 199 9"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    className="animate-draw"
                  />
                </svg>
              </span>
              .
            </h1>
          </div>
        }
      >
        <div className="flex items-center justify-center w-full h-full py-8">
          <div className="relative w-[95vw] h-[60vh] max-h-[600px] border border-white rounded-2xl">
            <Image
              src="/productImage.png"
              alt="Hero section image"
              fill
              className="object-contain rounded-2xl p-2"
              priority
            />
          </div>
        </div>
      </ContainerScroll>
    </section>
  );
}

export default Hero;
