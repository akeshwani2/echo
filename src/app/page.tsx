import NavBar from "./components/NavBar";
import Hero from "./components/Hero";
import Features  from "./components/Features";

export default function Home() {
  return (
    <div>
      <NavBar />
      <Hero />
      <div className="text-6xl text-white text-center tracking-tight mb-10">
        <span className="relative">
                What echo offers
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
      </div>
      <Features />
    </div>
  );
}
