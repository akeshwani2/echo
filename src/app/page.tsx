import NavBar from "./components/NavBar";
import Hero from "./components/Hero";
import Features from "./components/Features";
import Footer from "./components/Footer";
import EyeGrab from "./components/EyeGrab";
export default function Home() {
  return (
    <div className="bg-black">
      <NavBar />
      <Hero />
      
      <div className="text-6xl text-white text-center tracking-tight mb-14 mt-40 relative">
        <div className="absolute -z-10 w-full h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-3xl opacity-30" />
        </div>
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

      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <Features />
      </div>
      <EyeGrab />
      <Footer />
    </div>
  );
}
