import React from "react";
import { ContainerScroll } from "./container-scroll-animation";
import Image from "next/image";

function Hero() {
  return (
    <section className="h-screen bg-black rounded-md !overflow-visible relative flex flex-col items-center justify-center antialiased px-4">
      <ContainerScroll
        titleComponent={
          <div className="flex items-center flex-col">
            <h1 className="text-5xl mt-40  md:text-5xl tracking-tighter pb-8 text-center max-w-4xl mx-auto">
              personal conversations, personal results, personal growth
            </h1>

          </div>
        }
      >
        <div className="flex items-center justify-center w-full h-full">
          {/* Add your content here */}
        </div>
      </ContainerScroll>
    </section>
  );
}

export default Hero;
