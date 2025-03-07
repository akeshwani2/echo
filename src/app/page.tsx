import NavBar from "./components/NavBar";
import Hero from "./components/Hero";
import Features  from "./components/Features";
import Footer from "./components/Footer";
export default function Home() {
  return (
    <div className="bg-black space-y-10">
      <NavBar />
      <div className="h-[100vh] text-center flex items-center justify-center">
      <Footer />
      </div>

      <Hero />
      <div className="text-6xl text-white text-center tracking-tight mb-14">
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
