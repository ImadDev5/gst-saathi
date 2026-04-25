import Link from "next/link";

export default function Header() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-white/5 bg-void/80 backdrop-blur-xl">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3 cursor-pointer group">
          <i className="fas fa-brain text-cyan-400 text-2xl group-hover:rotate-180 transition-transform duration-700"></i>
          <span className="font-display text-xl font-bold tracking-tight text-white">APEX <span className="text-cyan-400">AGI</span></span>
        </div>

        <div className="hidden md:flex items-center space-x-8 text-sm font-mono">
          <Link href="#services" className="text-gray-400 hover:text-white transition-colors">/ SERVICES</Link>
          <Link href="#why-india" className="text-gray-400 hover:text-white transition-colors">/ WHY INDIA</Link>
          <Link href="#industries" className="text-gray-400 hover:text-white transition-colors">/ INDUSTRIES</Link>
          <Link href="#contact" className="btn-neon px-6 py-2 rounded-sm text-xs font-bold">
            Initialize
          </Link>
        </div>

        <button className="md:hidden text-cyan-400 text-2xl">
          <i className="fas fa-bars"></i>
        </button>
      </div>

      <div className="absolute top-full left-0 w-full bg-void border-b border-white/10 p-6 flex flex-col space-y-4 md:hidden">
        <Link href="#services" className="text-lg font-display text-white">Services</Link>
        <Link href="#why-india" className="text-lg font-display text-white">Why India</Link>
        <Link href="#industries" className="text-lg font-display text-white">Industries</Link>
        <Link href="#contact" className="text-lg font-display text-cyan-400">Get Started</Link>
      </div>
    </nav>
  );
}
