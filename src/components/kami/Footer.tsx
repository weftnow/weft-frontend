import { content } from "@/content";
import { WeftLockup } from "./WeftMark";

export function Footer() {
  const { footer } = content;

  return (
    <footer className="kami-section">
      <div className="kami-wrap kami-footer">
        <WeftLockup className="kami-footer__wordmark" size={26} />
        <span className="kami-footer__tagline">{footer.tagline}</span>

        <nav aria-label="Footer" className="kami-footer__links">
          {footer.links.map((link) => (
            <a href={link.href} key={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <span className="kami-footer__copyright">{footer.copyright}</span>
      </div>
    </footer>
  );
}
