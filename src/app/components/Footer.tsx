import React from "react";
import Image from "next/image";
import { CircleUser, Github, Linkedin } from "lucide-react";

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Image
            src="/protocolLogo.svg"
            alt="Echo Logo"
            width={24}
            height={24}
          />
          <span className="text-sm text-white/60">
            © {new Date().getFullYear()} Echo
          </span>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://github.com/akeshwani2"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white transition-colors"
          >
            <Github size={20} />
          </a>
          <a
            href="https://www.linkedin.com/in/arhaan-keshwani

"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white transition-colors"
          >
            <Linkedin size={20} />
          </a>
          <a
            href="https://akeshwani.info

"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white transition-colors"
          >
            <CircleUser size={20} />
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
