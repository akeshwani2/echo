import React from "react";
import { ContainerScroll } from "./container-scroll-animation";
import Image from "next/image";
import Link from "next/link";
import { HoverBorderGradient } from "../components/hover-border-gradient";

function Hero() {
  return (
    <section className="h-screen bg-black !overflow-visible relative flex flex-col items-center justify-center antialiased">
      <ContainerScroll
        titleComponent={
          <div className="flex items-center flex-col mt-30">
            <div className="flex items-center justify-center pb-4 hover:scale-105 transition-all duration-300 cursor-pointer">
              <Link href="/sign-up">
                <HoverBorderGradient>
                  Try echo
                </HoverBorderGradient>
              </Link>
            </div>
            <h1 className="text-4xl md:text-5xl tracking-tighter pb-7 text-center max-w-3xl mx-auto">
              Personal memory for AI, helping make conversations more effective.
            </h1>
          </div>
        }
      >
        <div className="flex items-center justify-center w-full h-full">
          <div className="relative w-[80vw] h-[60vh] border border-white rounded-2xl">
            <Image
              src="/productImage.png"
              alt="Hero section image"
              fill
              className="object-contain rounded-2xl"
              priority
            />
          </div>
        </div>
      </ContainerScroll>
    </section>
  );
}

export default Hero;
