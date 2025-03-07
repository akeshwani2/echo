"use client";
import React, { useRef, useMemo } from "react";
import { useScroll, useTransform, motion, useSpring, MotionValue } from "framer-motion";
import { throttle } from "lodash";

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = throttle(() => {
      setIsMobile(window.innerWidth <= 768);
    }, 100);
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
      checkMobile.cancel();
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "center start"]
  });

  // Super aggressive spring physics for immediate response
  const smoothProgress = useSpring(scrollYProgress, {
    damping: 40,
    stiffness: 400,
    mass: 0.1
  });

  const scaleDimensions = useMemo(() => {
    return isMobile ? [0.7, 0.9] : [1.05, 1];
  }, [isMobile]);

  // Complete animation in first 40% of scroll
  const rotate = useTransform(smoothProgress, [0, 0.4], [20, 0]);
  const scale = useTransform(smoothProgress, [0, 0.4], scaleDimensions);
  // Subtle downward movement for parallax effect
  const translateY = useTransform(smoothProgress, [0, 1], [0, 100]);
  // Keep header moving up slightly
  const headerTranslate = useTransform(smoothProgress, [0, 0.4], [0, -30]);

  return (
    <div
      className="h-[50rem] md:h-[70rem] flex items-center justify-center relative p-2 md:p-10"
      ref={containerRef}
    >
      <div
        className="py-8 md:py-20 w-full relative max-w-6xl mx-auto"
        style={{
          perspective: "1000px",
        }}
      >
        <Header translate={headerTranslate} titleComponent={titleComponent} />
        <Card rotate={rotate} translate={translateY} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({ translate, titleComponent }: any) => {
  return (
    <motion.div
      style={{
        translateY: translate,
      }}
      className="div max-w-5xl mx-auto text-center"
    >
      {titleComponent}
    </motion.div>
  );
};

export const Card = ({
  rotate,
  scale,
  translate,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
      }}
      className="max-w-5xl -mt-12 mx-auto h-[30rem] md:h-[40rem] w-full bg-[#222222] rounded-[30px]"
    >
      <div className="h-full w-full overflow-hidden rounded-2xl bg-black">
        {children}
      </div>
    </motion.div>
  );
};
