import { WeaveCanvas } from "@/components/ui/WeaveCanvas";
import { Nav } from "@/components/sections/Nav";
import { Hero } from "@/components/sections/Hero";
import { Problem } from "@/components/sections/Problem";
import { Turn } from "@/components/sections/Turn";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Reveal } from "@/components/sections/Reveal";
import { Testimonials } from "@/components/sections/Testimonials";
import { Faq } from "@/components/sections/Faq";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <WeaveCanvas />
      <Nav />
      <main className="relative" id="main-content">
        <div className="bg-bone">
          <Hero />
        </div>
        <Problem />
        <Turn />
        <HowItWorks />
        <Reveal />
        <Testimonials />
        <Faq />
        <Contact />
      </main>
    </>
  );
}
