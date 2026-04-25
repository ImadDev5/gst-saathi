"use client";

import { useEffect, useRef, useState } from "react";

const countries = [
  { flag: "🇺🇸", label: "United States" },
  { flag: "🇬🇧", label: "United Kingdom" },
  { flag: "🇨🇦", label: "Canada" },
  { flag: "🇦🇺", label: "Australia" },
  { flag: "🇦🇪", label: "Middle East" },
];

const whyIndiaItems = [
  {
    value: "60-70%",
    colorClass: "text-cyan-400",
    title: "Cost Savings",
    description: "Reduce operational costs dramatically without compromising on quality.",
  },
  {
    value: "1%",
    colorClass: "text-violet-400",
    title: "Top Talent Pool",
    description: "Access to IIT, IIM graduates and industry veterans.",
  },
  {
    value: "24/7",
    colorClass: "text-green-400",
    title: "Operations",
    description: "Strategic timezone advantage for round-the-clock continuity.",
  },
  {
    value: "A+",
    colorClass: "text-gold",
    title: "English Proficiency",
    description: "Native-level English speakers with excellent communication.",
  },
];

const complianceItems = ["ISO 27001", "HIPAA", "GDPR", "SOC 2"];

const stats = [
  { target: 500, label: "Global Clients" },
  { target: 5000, label: "Professionals Deployed" },
  { target: 98, label: "Client Satisfaction %" },
  { target: 15, label: "Years Experience" },
];

const industries = [
  { icon: "fas fa-heartbeat", label: "Healthcare" },
  { icon: "fas fa-laptop-code", label: "Technology" },
  { icon: "fas fa-chart-line", label: "Finance" },
  { icon: "fas fa-shopping-cart", label: "E-Commerce" },
  { icon: "fas fa-building", label: "Real Estate" },
  { icon: "fas fa-graduation-cap", label: "Education" },
  { icon: "fas fa-balance-scale", label: "Legal" },
  { icon: "fas fa-hotel", label: "Hospitality" },
  { icon: "fas fa-heartbeat", label: "Healthcare" },
  { icon: "fas fa-laptop-code", label: "Technology" },
  { icon: "fas fa-chart-line", label: "Finance" },
  { icon: "fas fa-shopping-cart", label: "E-Commerce" },
];

const processSteps = [
  {
    number: "01",
    title: "Consultation",
    description: "Free consultation to understand your needs and requirements",
    titleClass: "text-cyan-400",
    dotClass: "bg-cyan-400 shadow-[0_0_20px_#00d4ff]",
    reverse: false,
  },
  {
    number: "02",
    title: "Team Selection",
    description: "We handpick the perfect team from our top 1% talent pool",
    titleClass: "text-violet-400",
    dotClass: "bg-violet-500 shadow-[0_0_20px_#7c3aed]",
    reverse: true,
  },
  {
    number: "03",
    title: "Onboarding",
    description: "Seamless integration with your processes and tools",
    titleClass: "text-cyan-400",
    dotClass: "bg-cyan-400 shadow-[0_0_20px_#00d4ff]",
    reverse: false,
  },
  {
    number: "04",
    title: "Scale & Grow",
    description: "Monitor, optimize, and scale your operations effortlessly",
    titleClass: "text-green-400",
    dotClass: "bg-green-500 shadow-[0_0_20px_#22c55e]",
    reverse: true,
  },
];

const testimonials = [
  {
    quote:
      "\"Apex AGI transformed our medical billing operations. We've saved 65% on costs while improving accuracy. The team in Hyderabad feels like an extension of our US office.\"",
    name: "Sarah Johnson",
    role: "CEO, HealthTech USA",
  },
  {
    quote:
      "\"Outstanding tech talent! Our development team in India delivered faster than our previous local contractors, at a fraction of the cost. Highly recommend!\"",
    name: "James Mitchell",
    role: "CTO, FinanceApp UK",
  },
  {
    quote:
      "\"The sales team provided by Apex AGI booked more meetings in 3 months than our internal team did in a year. ROI was immediate and substantial.\"",
    name: "Michael Chen",
    role: "Director, SaaS Company AU",
  },
];

const serviceOptions = [
  "Healthcare BPO",
  "Tech Staffing & Development",
  "Sales & Lead Generation",
  "Finance & Accounting",
  "Customer Support",
  "AI & Data Services",
];

export default function Home() {
  const pageRef = useRef<HTMLDivElement>(null);
  const heroCanvasRef = useRef<HTMLCanvasElement>(null);
  const globeCanvasRef = useRef<HTMLDivElement>(null);
  const globeSurfaceRef = useRef<HTMLCanvasElement>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);
  const businessEmailRef = useRef<HTMLInputElement>(null);
  const phoneNumberRef = useRef<HTMLInputElement>(null);
  const serviceInterestRef = useRef<HTMLSelectElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let heroFrame = 0;
    let globeFrame = 0;
    const cleanupFns: Array<() => void> = [];
    let isMounted = true;

    const initAnimations = async () => {
      const [{ gsap }, { ScrollTrigger }, THREE] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("three"),
      ]);

      if (!isMounted) {
        return;
      }

      gsap.registerPlugin(ScrollTrigger);

      const heroCanvas = heroCanvasRef.current;
      if (heroCanvas) {
        const context = heroCanvas.getContext("2d");

        if (context) {
          let width = 0;
          let height = 0;
          let particles: Particle[] = [];

          class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;

            constructor() {
              this.x = Math.random() * width;
              this.y = Math.random() * height;
              this.vx = (Math.random() - 0.5) * 0.5;
              this.vy = (Math.random() - 0.5) * 0.5;
            }

            update() {
              this.x += this.vx;
              this.y += this.vy;

              if (this.x < 0 || this.x > width) {
                this.vx *= -1;
              }

              if (this.y < 0 || this.y > height) {
                this.vy *= -1;
              }
            }
          }

          const resizeHeroCanvas = () => {
            width = heroCanvas.width = window.innerWidth;
            height = heroCanvas.height = window.innerHeight;
          };

          const initParticles = () => {
            particles = Array.from({ length: 80 }, () => new Particle());
          };

          const animateHeroCanvas = () => {
            context.clearRect(0, 0, width, height);

            particles.forEach((particle) => {
              particle.update();

              context.fillStyle = "rgba(0, 212, 255, 0.3)";
              context.beginPath();
              context.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
              context.fill();

              particles.forEach((otherParticle) => {
                const distance = Math.hypot(
                  particle.x - otherParticle.x,
                  particle.y - otherParticle.y,
                );

                if (distance < 120) {
                  context.strokeStyle = `rgba(0, 212, 255, ${0.1 * (1 - distance / 120)})`;
                  context.beginPath();
                  context.moveTo(particle.x, particle.y);
                  context.lineTo(otherParticle.x, otherParticle.y);
                  context.stroke();
                }
              });
            });

            heroFrame = window.requestAnimationFrame(animateHeroCanvas);
          };

          const handleHeroResize = () => {
            resizeHeroCanvas();
            initParticles();
          };

          window.addEventListener("resize", handleHeroResize);
          cleanupFns.push(() => window.removeEventListener("resize", handleHeroResize));

          resizeHeroCanvas();
          initParticles();
          animateHeroCanvas();
        }
      }

      const globeCanvas = globeCanvasRef.current;
      const globeSurface = globeSurfaceRef.current;
      if (globeCanvas && globeSurface) {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({
          canvas: globeSurface,
          alpha: true,
          antialias: true,
        });
        const geometry = new THREE.SphereGeometry(5, 40, 40);
        const material = new THREE.PointsMaterial({
          color: 0x00d4ff,
          size: 0.05,
          opacity: 0.4,
          transparent: true,
        });
        const sphere = new THREE.Points(geometry, material);

        scene.add(sphere);
        camera.position.z = 10;

        const resizeGlobe = () => {
          const width = globeCanvas.clientWidth || window.innerWidth;
          const height = globeCanvas.clientHeight || 800;

          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };

        const animateGlobe = () => {
          sphere.rotation.y += 0.002;
          renderer.render(scene, camera);
          globeFrame = window.requestAnimationFrame(animateGlobe);
        };

        window.addEventListener("resize", resizeGlobe);
        cleanupFns.push(() => window.removeEventListener("resize", resizeGlobe));
        cleanupFns.push(() => {
          renderer.forceContextLoss();
          renderer.dispose();
          geometry.dispose();
          material.dispose();
        });

        resizeGlobe();
        animateGlobe();
      }

      const animationContext = gsap.context(() => {
        const revealElements = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
        revealElements.forEach((element) => {
          gsap.fromTo(
            element,
            {
              opacity: 0,
              y: 40,
            },
            {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
            },
          );
        });

        gsap.to("#circuit-bar", {
          height: "100%",
          scrollTrigger: {
            trigger: "#process-container",
            start: "top center",
            end: "bottom center",
            scrub: true,
          },
        });

        const counters = Array.from(document.querySelectorAll<HTMLElement>(".counter"));
        counters.forEach((counter) => {
          const target = Number(counter.dataset.target || 0);
          ScrollTrigger.create({
            trigger: counter,
            start: "top 80%",
            once: true,
            onEnter: () => {
              const state = { value: 0 };
              gsap.to(state, {
                value: target,
                duration: 2,
                snap: { value: 1 },
                onUpdate: () => {
                  counter.innerText = `${Math.ceil(state.value)}${target > 100 ? "+" : "%"}`;
                },
              });
            },
          });
        });
      }, pageRef);

      cleanupFns.push(() => animationContext.revert());
    };

    initAnimations();

    return () => {
      isMounted = false;
      window.cancelAnimationFrame(heroFrame);
      window.cancelAnimationFrame(globeFrame);
      cleanupFns.reverse().forEach((cleanup) => cleanup());
    };
  }, []);

  const handleFormSubmit = () => {
    const fullName = fullNameRef.current?.value.trim() ?? "";
    const businessEmail = businessEmailRef.current?.value.trim() ?? "";
    const phoneNumber = phoneNumberRef.current?.value.trim() ?? "";
    const serviceInterest = serviceInterestRef.current?.value.trim() ?? "";
    const message = messageRef.current?.value.trim() ?? "";

    if (!fullName || !businessEmail || !phoneNumber || !serviceInterest) {
      window.alert("Please fill in all required fields (*)");
      return;
    }

    const text = `🚀 APEX AGI Solutions INQUIRY:\n\nName: ${fullName}\nEmail: ${businessEmail}\nPhone: ${phoneNumber}\nService: ${serviceInterest}\nMessage: ${message}`;
    const whatsappUrl = `https://wa.me/918897443961?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div ref={pageRef} className="bg-void text-white">
      <div className="noise-overlay" />

      <nav
        id="navbar"
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-void/80 backdrop-blur-xl transition-all duration-300"
      >
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="group flex cursor-pointer items-center space-x-3">
            <i className="fas fa-brain text-2xl text-cyan-400 transition-transform duration-700 group-hover:rotate-180" />
            <span className="font-display text-xl font-bold tracking-tight text-white">
              APEX <span className="text-cyan-400">AGI</span>
            </span>
          </div>

          <div className="hidden items-center space-x-8 text-sm font-mono md:flex">
            <a href="#services" className="text-gray-400 transition-colors hover:text-white">
              / SERVICES
            </a>
            <a href="#why-india" className="text-gray-400 transition-colors hover:text-white">
              / WHY INDIA
            </a>
            <a href="#industries" className="text-gray-400 transition-colors hover:text-white">
              / INDUSTRIES
            </a>
            <a href="#contact" className="btn-neon rounded-sm px-6 py-2 text-xs font-bold">
              Initialize
            </a>
          </div>

          <button
            type="button"
            aria-label="Toggle navigation"
            className="text-2xl text-cyan-400 md:hidden"
            onClick={() => setMobileMenuOpen((current) => !current)}
          >
            <i className="fas fa-bars" />
          </button>
        </div>

        <div
          id="mobileMenu"
          className={`absolute top-full left-0 z-40 flex w-full flex-col space-y-4 border-b border-white/10 bg-void p-6 transition-transform duration-300 ease-in-out md:hidden ${
            mobileMenuOpen ? "translate-y-0" : "-translate-y-[120%]"
          }`}
        >
          <a
            href="#services"
            className="font-display text-lg text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            Services
          </a>
          <a
            href="#why-india"
            className="font-display text-lg text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            Why India
          </a>
          <a
            href="#industries"
            className="font-display text-lg text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            Industries
          </a>
          <a
            href="#contact"
            className="font-display text-lg text-cyan-400"
            onClick={() => setMobileMenuOpen(false)}
          >
            Get Started
          </a>
        </div>
      </nav>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20">
        <canvas ref={heroCanvasRef} id="hero-canvas" />

        <div className="container relative z-10 mx-auto grid items-center gap-12 px-6 lg:grid-cols-2">
          <div className="reveal">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1 backdrop-blur-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="font-mono text-xs text-cyan-400">SYSTEM ONLINE: HYDERABAD HUB</span>
            </div>

            <h1 className="font-display mb-6 text-5xl font-bold leading-tight md:text-7xl">
              From <span className="text-cyan-gradient">India</span>
              <br />
              to the World
            </h1>

            <p className="mb-8 max-w-xl text-lg leading-relaxed font-light text-gray-400">
              Elite outsourcing services from Hyderabad to US, UK, Canada, Australia &amp; Middle
              East.
            </p>

            <div className="mb-10 grid grid-cols-3 gap-4 border-l-2 border-cyan-500/20 pl-6">
              <div>
                <div className="font-mono text-2xl font-bold text-white">60%</div>
                <div className="text-xs uppercase tracking-wider text-gray-500">Cost Savings</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-white">24/7</div>
                <div className="text-xs uppercase tracking-wider text-gray-500">Support</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-white">100%</div>
                <div className="text-xs uppercase tracking-wider text-gray-500">Data Security</div>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <a href="#contact" className="btn-solid rounded-lg px-8 py-4 text-center">
                Start Outsourcing Today
              </a>
              <a
                href="https://wa.me/918897443961"
                target="_blank"
                rel="noreferrer"
                className="btn-neon flex items-center justify-center gap-2 rounded-lg px-8 py-4 text-center"
              >
                <i className="fab fa-whatsapp" /> WhatsApp Us 24/7
              </a>
            </div>
          </div>

          <div className="relative hidden items-center justify-center lg:flex">
            <div
              className="h-96 w-96 rounded-full border border-cyan-500/20"
              style={{ animation: "spin 20s linear infinite" }}
            />
            <div
              className="absolute h-64 w-64 rounded-full border border-violet-500/30"
              style={{ animation: "spin 15s linear infinite reverse" }}
            />
            <div className="absolute animate-pulse text-6xl text-cyan-400">
              <i className="fas fa-globe" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 z-10 h-24 w-full bg-gradient-to-t from-void to-transparent" />
      </section>

      <section className="relative overflow-hidden bg-void py-24">
        <div ref={globeCanvasRef} id="globe-canvas" className="pointer-events-none opacity-40">
          <canvas ref={globeSurfaceRef} className="absolute inset-0 h-full w-full" />
        </div>

        <div className="container relative z-10 mx-auto px-6">
          <div className="mb-16 text-center">
            <h2 className="font-display mb-4 text-4xl font-bold md:text-5xl">
              We Bridge <span className="text-cyan-400">India</span> with the World
            </h2>
            <p className="font-mono text-sm text-gray-500">DATA SYNCHRONIZATION ACTIVE</p>
          </div>

          <div className="glass-card mx-auto mb-16 max-w-4xl rounded-2xl p-10">
            <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
              <div className="text-center">
                <div className="mb-4 text-4xl">🌍</div>
                <h3 className="font-bold text-white">Your Business</h3>
                <p className="mt-2 font-mono text-xs text-gray-400">US • UK • CA • AU • ME</p>
              </div>

              <div className="relative h-1 w-full flex-1 overflow-hidden rounded-full bg-gray-700">
                <div
                  className="absolute top-0 left-0 h-full w-1/3 bg-cyan-400"
                  style={{ animation: "loading 2s ease-in-out infinite" }}
                />
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-void px-2 text-xs font-bold text-cyan-400">
                  Seamless Integration
                </div>
              </div>

              <div className="text-center">
                <div className="mb-4 text-4xl">🇮🇳</div>
                <h3 className="font-bold text-white">Elite Team in India</h3>
                <p className="mt-2 font-mono text-xs text-gray-400">Hyderabad Tech Hub</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {countries.map((country) => (
              <div
                key={country.label}
                className="glass-card p-4 text-center transition-colors hover:bg-cyan-900/20"
              >
                <div className="mb-2 text-2xl">{country.flag}</div>
                <div className="text-sm font-bold">{country.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="relative bg-charcoal py-24">
        <div className="container mx-auto px-6">
          <div className="mb-12 flex flex-col justify-between md:flex-row md:items-end">
            <div>
              <h2 className="font-display text-4xl font-bold text-white md:text-5xl">
                Outsource with <span className="text-cyan-gradient">Confidence</span>
              </h2>
            </div>
            <div className="text-right">
              <span className="font-mono text-sm text-cyan-400">CAPABILITIES MATRIX</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:grid-rows-[auto_auto_auto]">
            <div className="glass-card group relative overflow-hidden rounded-2xl p-8 md:row-span-2">
              <div className="absolute top-0 right-0 rounded-full bg-cyan-500/10 p-20 blur-3xl transition-all group-hover:bg-cyan-500/20" />
              <i className="fas fa-heartbeat mb-6 text-4xl text-cyan-400 transition-transform group-hover:scale-110" />
              <h3 className="font-display mb-4 text-2xl font-bold">Healthcare BPO</h3>
              <p className="mb-6 text-sm text-gray-400">
                HIPAA-compliant medical billing, coding, RCM, and healthcare administration
                services.
              </p>
              <div className="mt-auto inline-block rounded-full border border-cyan-500/30 px-3 py-1 font-mono text-xs text-cyan-400">
                <i className="fas fa-shield-alt mr-2" />
                HIPAA Certified
              </div>
            </div>

            <div className="glass-card group rounded-2xl p-8 hover:border-violet-500/50 md:col-span-2">
              <div className="flex flex-col justify-between md:flex-row md:items-start">
                <div>
                  <i className="fas fa-code mb-4 text-4xl text-violet-400" />
                  <h3 className="font-display mb-2 text-2xl font-bold">Tech Staffing &amp; Development</h3>
                  <p className="text-sm text-gray-400">
                    Elite software engineers, developers, and technical specialists for your
                    projects.
                  </p>
                </div>
                <div className="mt-4 rounded-lg border border-violet-500/20 bg-violet-500/10 px-4 py-2 font-mono text-xs text-violet-300 md:mt-0">
                  Top 1% Talent
                </div>
              </div>
            </div>

            <div className="glass-card group rounded-2xl p-8">
              <i className="fas fa-chart-line mb-4 text-4xl text-green-400" />
              <h3 className="mb-2 text-xl font-bold">Sales &amp; Lead Generation</h3>
              <p className="text-xs text-gray-400">
                Expand your market reach with our expert sales development representatives.
              </p>
              <span className="mt-4 block font-mono text-xs text-green-400">
                {"/// Results-Driven"}
              </span>
            </div>

            <div className="glass-card group rounded-2xl p-8">
              <i className="fas fa-calculator mb-4 text-4xl text-gold" />
              <h3 className="mb-2 text-xl font-bold">Finance &amp; Accounting</h3>
              <p className="text-xs text-gray-400">
                Certified accountants and financial analysts to streamline your operations.
              </p>
              <span className="mt-4 block font-mono text-xs text-gold">
                {"/// CPA Qualified"}
              </span>
            </div>

            <div className="glass-card group flex items-center justify-between rounded-2xl p-8 md:col-span-2">
              <div>
                <h3 className="mb-2 text-xl font-bold text-cyan-400">AI &amp; Data Services</h3>
                <p className="text-sm text-gray-400">
                  Harness AI and data analytics to transform your business intelligence.
                </p>
              </div>
              <i className="fas fa-robot animate-pulse text-4xl text-cyan-400" />
            </div>

            <div className="glass-card group rounded-2xl p-8">
              <i className="fas fa-headset mb-4 text-4xl text-pink-400" />
              <h3 className="mb-2 text-xl font-bold">Customer Support</h3>
              <p className="text-xs text-gray-400">24/7 multilingual customer service teams.</p>
              <span className="mt-4 block font-mono text-xs text-pink-400">
                {"/// 24/7 Available"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section id="why-india" className="perspective-1000 bg-void py-24">
        <div className="container mx-auto px-6">
          <div className="mb-16 text-center">
            <h2 className="font-display mb-6 text-4xl font-bold md:text-5xl">
              Why Outsource to <span className="text-cyan-400">India</span>?
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            {whyIndiaItems.map((item) => (
              <div
                key={item.title}
                className="glass-card rounded-xl p-8 transition-transform hover:-translate-y-2 hover:rotate-1"
              >
                <div className={`mb-2 font-mono text-4xl font-bold ${item.colorClass}`}>{item.value}</div>
                <h3 className="mb-2 font-bold text-white">{item.title}</h3>
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="glass-card mt-16 flex flex-wrap items-center justify-center gap-8 rounded-full border-t border-b border-cyan-500/20 px-10 py-6 md:gap-16">
            <span className="font-mono text-xs uppercase tracking-widest text-gray-400">
              Compliance Core:
            </span>
            {complianceItems.map((item) => (
              <span key={item} className="flex items-center gap-2 font-bold text-white">
                <i className="fas fa-check-circle text-cyan-400" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-charcoal py-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="stat-item">
                <div
                  className="counter mb-2 font-mono text-4xl font-bold text-white md:text-5xl"
                  data-target={stat.target}
                >
                  0
                </div>
                <div className="text-sm uppercase tracking-widest text-cyan-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="industries" className="overflow-hidden border-b border-white/5 bg-void py-12">
        <div className="marquee-container">
          <div className="marquee-content flex items-center gap-16 font-display text-2xl font-bold uppercase tracking-wider text-gray-500">
            {industries.map((industry, index) => (
              <span key={`${industry.label}-${index}`}>
                <i className={`${industry.icon} mr-4 text-cyan-400`} />
                {industry.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-void py-24">
        <div className="container mx-auto mb-16 px-6 text-center">
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            How <span className="text-cyan-gradient">Outsourcing Works</span>
          </h2>
        </div>

        <div id="process-container" className="container relative mx-auto max-w-4xl px-6">
          <div className="circuit-line hidden h-full md:block" />
          <div className="circuit-progress hidden md:block" id="circuit-bar" />

          {processSteps.map((step) => (
            <div
              key={step.number}
              className={`relative z-10 mb-20 grid grid-cols-1 items-center gap-12 md:grid-cols-2 ${
                step.number === "04" ? "mb-0" : ""
              }`}
            >
              {step.reverse ? (
                <>
                  <div className="hidden items-center justify-center md:flex">
                    <div className={`h-4 w-4 rounded-full ${step.dotClass}`} />
                  </div>
                  <div className="text-left md:pl-12">
                    <div className="absolute -top-10 left-10 font-mono text-6xl font-bold text-white/5">
                      {step.number}
                    </div>
                    <h3 className={`mb-2 text-2xl font-bold ${step.titleClass}`}>{step.title}</h3>
                    <p className="text-gray-400">{step.description}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-right md:pr-12">
                    <div className="absolute -top-10 right-10 font-mono text-6xl font-bold text-white/5">
                      {step.number}
                    </div>
                    <h3 className={`mb-2 text-2xl font-bold ${step.titleClass}`}>{step.title}</h3>
                    <p className="text-gray-400">{step.description}</p>
                  </div>
                  <div className="hidden items-center justify-center md:flex">
                    <div className={`h-4 w-4 rounded-full ${step.dotClass}`} />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-charcoal py-24">
        <div className="container mx-auto px-6">
          <h2 className="font-display mb-16 text-center text-4xl font-bold">
            Trusted by <span className="text-gradient">Global Leaders</span>
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="glass-card rounded-xl p-8">
                <div className="mb-4 flex gap-1 text-sm text-gold">
                  {Array.from({ length: 5 }, (_, index) => (
                    <i key={`${testimonial.name}-${index}`} className="fas fa-star" />
                  ))}
                </div>
                <p className="mb-6 text-sm leading-relaxed text-gray-300 italic">{testimonial.quote}</p>
                <div>
                  <h4 className="font-bold text-white">{testimonial.name}</h4>
                  <p className="font-mono text-xs text-gray-500">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer id="contact" className="relative border-t border-white/10 bg-void pt-24 pb-10">
        <div className="container mx-auto px-6">
          <div className="mb-20 grid gap-16 lg:grid-cols-2">
            <div>
              <h2 className="font-display mb-8 text-5xl font-bold md:text-7xl">
                Ready to <span className="text-cyan-400">Scale?</span>
              </h2>
              <p className="mb-8 text-xl text-gray-400">
                Get a free consultation and discover how outsourcing to India can transform your
                operations. Save 60% on costs starting today.
              </p>

              <div className="space-y-4 font-mono text-sm">
                <a
                  href="mailto:info@apexagisolutions.com"
                  className="block text-cyan-400 transition-colors hover:text-white"
                >
                  {">"} info@apexagisolutions.com
                </a>
                <a
                  href="tel:+918897443961"
                  className="block text-cyan-400 transition-colors hover:text-white"
                >
                  {">"} +91 88974 43961
                </a>
              </div>
            </div>

            <div className="glass-card rounded-2xl border-l-4 border-l-cyan-400 p-8">
              <h3 className="mb-6 font-mono text-sm uppercase text-gray-500">
                Secure Transmission Protocol
              </h3>
              <form className="space-y-6">
                <div className="group relative">
                  <input
                    ref={fullNameRef}
                    type="text"
                    placeholder="Full Name *"
                    className="w-full border-b border-gray-700 bg-transparent py-3 text-white transition-colors focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div className="group relative">
                  <input
                    ref={businessEmailRef}
                    type="email"
                    placeholder="Business Email *"
                    className="w-full border-b border-gray-700 bg-transparent py-3 text-white transition-colors focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div className="group relative">
                  <input
                    ref={phoneNumberRef}
                    type="tel"
                    placeholder="Phone Number *"
                    className="w-full border-b border-gray-700 bg-transparent py-3 text-white transition-colors focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div className="group relative">
                  <select
                    ref={serviceInterestRef}
                    defaultValue=""
                    className="w-full appearance-none border-b border-gray-700 bg-transparent py-3 text-white transition-colors focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="" className="bg-void">
                      Select Service *
                    </option>
                    {serviceOptions.map((option) => (
                      <option key={option} value={option} className="bg-void">
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="group relative">
                  <textarea
                    ref={messageRef}
                    rows={2}
                    placeholder="Tell us about your requirements (Optional)"
                    className="w-full border-b border-gray-700 bg-transparent py-3 text-white transition-colors focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleFormSubmit}
                  className="btn-solid mt-4 w-full rounded-sm py-4 text-sm uppercase tracking-widest"
                >
                  Request Free Consultation
                </button>
              </form>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between border-t border-white/5 pt-8 font-mono text-xs text-gray-600 md:flex-row">
            <p>&copy; 2025 Apex AGI Solutions. Hyderabad, India.</p>
            <div className="mt-4 flex gap-6 md:mt-0">
              <a href="#" className="hover:text-cyan-400">
                Privacy
              </a>
              <a href="#" className="hover:text-cyan-400">
                Terms
              </a>
              <a href="#" className="hover:text-cyan-400">
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
