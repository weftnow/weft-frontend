import { KamiNav } from "@/components/kami/KamiNav";
import { KamiHero } from "@/components/kami/KamiHero";
import { Challenge } from "@/components/kami/Challenge";
import { HowItWorks } from "@/components/kami/HowItWorks";
import { RealPicture } from "@/components/kami/RealPicture";
import { Impact } from "@/components/kami/Impact";
import { Network } from "@/components/kami/Network";
import { Closer } from "@/components/kami/Closer";
import { Footer } from "@/components/kami/Footer";

/**
 * `.kami` scopes the homepage's type and colour world. The rest of the app
 * keeps the tokens in globals.css, so nothing here reaches the dashboard,
 * the questionnaire or the reveal.
 */
export default function Home() {
  return (
    <div className="kami">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <KamiNav />
      <main id="main-content">
        <KamiHero />
        <Challenge />
        <HowItWorks />
        <RealPicture />
        <Impact />
        <Network />
        <Closer />
      </main>
      <Footer />
    </div>
  );
}
