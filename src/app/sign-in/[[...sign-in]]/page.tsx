import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen">
            <SignIn 
                appearance={{
                  baseTheme: dark,
                  variables: {
                    colorPrimary: "#ffffff",
                  },
                  elements: {
                    card: "bg-[#190d2e]/90 backdrop-blur-xl border border-white/15 shadow-[0_0_30px_rgba(140,69,255,0.3)]",
                    headerTitle: "text-white",
                    headerSubtitle: "text-white/70",
                    socialButtonsBlockButton: "bg-[#190d2e] hover:bg-[#4a208a] border border-white/15",
                    formFieldInput: "bg-[#190d2e] border-white/15",
                    footerAction: "hidden",
                    footer: "hidden",
                  }
                }}
              />
    </div>
  );
} 