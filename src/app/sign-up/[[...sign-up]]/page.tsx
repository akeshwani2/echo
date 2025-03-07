import NavBar from "@/app/components/NavBar";
import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import Image from "next/image";

export default function Page() {
  return (
    <div className="h-screen bg-black overflow-hidden ">
      <NavBar />
      <main className="h-[calc(100vh-64px)]">
        <div className="grid lg:grid-cols-2 gap-16 items-center h-full px-10">
          {/* Left column with welcome message and branding */}
          <div className="space-y-1">
            <h1 className="text-4xl md:text-5xl tracking-tighter">
              welcome to echo
            </h1>
            <p className="text-sm md:text-md text-white/70 leading-relaxed">
            a sophisticated memory system designed to enhance AI learning and retention capabilities
            </p>
          </div>

          {/* Right column with sign up form */}
          <div className="w-full max-w-md mx-auto">
            <SignUp
              appearance={{
                baseTheme: dark,
                variables: {
                  colorPrimary: "#ffffff",
                },
                elements: {
                  card: "bg-[#190d2e]/90 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(140,69,255,0.15)] rounded-2xl",
                  headerTitle: "text-white text-2xl",
                  headerSubtitle: "text-white/70",
                  socialButtonsBlockButton: "bg-[#190d2e] hover:bg-[#4a208a] border border-white/10 transition-colors duration-200",
                  formFieldInput: "bg-[#190d2e] border-white/10 focus:border-[#4a208a] transition-colors duration-200",
                  formButtonPrimary: "bg-white hover:bg-white/90 text-[#190d2e] transition-colors duration-200",
                  dividerLine: "bg-white/10",
                  dividerText: "text-white/40",
                  footerAction: "!hidden",
                  footer: "!hidden",
                  footerActionLink: "!hidden",
                  footerText: "!hidden",
                  alternativeMethodsSeparator: "hidden",
                  alternativeMethodsBlockButton: "hidden"
                },
                layout: {
                  showOptionalFields: false,
                  socialButtonsPlacement: "top",
                  helpPageUrl: undefined,
                  termsPageUrl: undefined,
                  privacyPageUrl: undefined
                }
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
