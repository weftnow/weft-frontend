/**
 * Every word on the homepage, in one place.
 *
 * Headlines are arrays of lines rather than one string with a trusted wrap:
 * the page's rhythm depends on "You already brought / the right people / into
 * the room." breaking where the sense breaks, and a viewport-dependent wrap
 * puts the break somewhere else on every screen.
 *
 * `marginalia` entries are the handwritten asides. They are decoration and are
 * hidden from assistive technology at the component, so nothing here may be
 * the only place a fact is stated.
 */

/** Imagery the design calls for that we do not have a file for yet. */
export type PendingAsset = {
  readonly pending: true;
  /** Rendered in the stand-in frame, and the brief for whoever shoots it. */
  readonly label: string;
};

export type ResolvedAsset = {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
  readonly type?: "image" | "video";
};

export type Asset = PendingAsset | ResolvedAsset;

export function isPending(asset: Asset): asset is PendingAsset {
  return "pending" in asset;
}

export const content = {
  nav: {
    // "Brands" and "About" in the comp point at pages that do not exist. Rather
    // than ship two dead links, the last two slots address sections this page
    // actually has.
    links: [
      { label: "For organizers", href: "#impact" },
      { label: "How it works", href: "#how" },
      { label: "The network", href: "#network" },
      { label: "Contact", href: "#contact" },
    ],
    cta: { label: "Bring Weft to your next event", href: "#contact" },
    signIn: { label: "Sign in", href: "/organizer/login" },
  },

  hero: {
    eyebrow: "For curated business events",
    headline: "Meet Kami.",
    sub: "Stop manually orchestrating who meets who at your events. Kami learns why each guest came and makes sure they're introduced to the right people, so you can stop playing matchmaker and focus on what actually matters.",
    note: "No speed networking. No attendee app. No hoping people find each other.",
    ctaPrimary: { label: "Bring Weft to your next event", href: "#contact" },
    ctaSecondary: { label: "See how it works", href: "#how" },
    bubble: {
      title: "Hello, I'm Kami.",
      body: "I make sure every person in your event meets the right people.",
    },
    marginalia: "Same people.\nNew opportunities.",
    // Cut out of the supplied render, which arrived as a JPEG on pure white:
    // on a bone canvas that white square read as a box around the character.
    kami: {
      src: "/images/kami.png",
      width: 942,
      height: 1195,
      alt: "Kami, the Weft mascot, a crocheted orange character in a black suit",
    },
  },

  challenge: {
    id: "challenge",
    eyebrow: "The challenge",
    headline: ["You already brought", "the right people", "into the room."],
    body: "Founders, investors, brands, and decision-makers. But valuable conversations still happen by chance. People leave with missed opportunities.",
    marginalia: "The right room,\nbut the missing\nintroductions.",
    // Generic attendee portraits, never a named customer: a real person's face
    // under an invented job title invents a fact about them.
    people: [
      {
        role: "Investors",
        focus: "50% 30%",
        asset: {
          src: "/images/matched-attendee-01.png",
          width: 1000,
          height: 1500,
          alt: "Portrait of an event attendee",
        },
      },
      {
        role: "Founders",
        focus: "50% 28%",
        asset: {
          src: "/images/matched-attendee-02.png",
          width: 1630,
          height: 1775,
          alt: "Portrait of an event attendee",
        },
      },
      {
        role: "Brands",
        focus: "50% 26%",
        asset: {
          src: "/images/portrait-1.png",
          width: 974,
          height: 1210,
          alt: "Portrait of an event attendee",
        },
      },
      {
        role: "Operators",
        focus: "50% 30%",
        asset: {
          src: "/images/matched-attendee-03.png",
          width: 700,
          height: 806,
          alt: "Portrait of an event attendee wearing glasses",
        },
      },
      {
        role: "Media",
        focus: "50% 24%",
        asset: {
          // Cropped from portrait-2.png, which arrived with a stock-viewer
          // "Zoom" button baked into its bottom-right corner.
          src: "/images/portrait-2-clean.png",
          width: 958,
          height: 1250,
          alt: "Portrait of an event attendee",
        },
      },
      {
        role: "Industry leaders",
        focus: "50% 50%",
        asset: {
          // Cropped to head-and-shoulders from portrait-3.png, which is framed
          // wider than the other five and read as mostly jacket in a square tile.
          src: "/images/portrait-3-crop.png",
          width: 800,
          height: 800,
          alt: "Portrait of an event attendee in a suit",
        },
      },
    ],
  },

  how: {
    id: "how",
    eyebrow: "How it works",
    headline: ["From intent", "to introduction."],
    body: "Kami turns guest intent into real, in-person connections, so every event delivers more value.",
    marginalia: "It starts with\na conversation.",
    steps: [
      {
        n: "01",
        icon: "call",
        title: "Kami calls each attendee",
        body: "We understand their goals, interests and what they hope to get out of the event.",
      },
      {
        n: "02",
        icon: "match",
        title: "Kami finds the right people",
        body: "Using AI and event context, Kami matches each guest with high-relevance people in the room.",
      },
      {
        n: "03",
        icon: "host",
        title: "Real Weft hosts make the introductions",
        body: "Our on-site hosts bring people together at the right moment, with context, so conversations start naturally.",
      },
    ],
    call: {
      status: "Speaking with Emma",
      role: "Investor at Horizon Ventures",
      avatar: {
        src: "/images/testimonial-02.png",
        width: 943,
        height: 979,
        alt: "",
      },
      endLabel: "End call",
    },
  },

  real: {
    id: "real",
    eyebrow: "The real picture",
    headline: ["Real people.", "Real introductions."],
    body: "Kami handles the intelligence. Our Weft hosts make it real with warm, contextual introductions that turn good events into great outcomes.",
    marginalia: "More than events.\nReal opportunities.",
    scene: {
      src: "/images/weft-event-conversation.png",
      width: 1024,
      height: 1536,
      alt: "A Weft host standing with two attendees mid-conversation at an event",
    },
    mark: "Weft",
    badge: {
      label: "Introduction made",
      left: "Sarah",
      right: "Michael",
    },
  },

  impact: {
    id: "impact",
    eyebrow: "Measurable impact",
    headline: ["You finally see", "if it worked."],
    body: "Get clear data on real introductions, attendee goals, and meaningful connections, so you can prove ROI and plan what's next.",
    cta: { label: "Bring Weft to your next event", href: "#contact" },
    secondary: { label: "Explore the dashboard", href: "/organizer/sample" },
    marginalia: "Proof,\nnot a hunch.",
    // Sample figures for the product shot, labelled as such in the markup.
    // Not customer results, and not to be presented as any.
    dashboard: {
      caption: "Sample dashboard with example data",
      brand: "Weft",
      nav: ["Overview", "Events", "Network", "People", "Outcomes", "Insights"],
      activeNav: "Overview",
      stats: [
        { label: "Events", value: "142" },
        { label: "Attendees", value: "913" },
        { label: "Valuable connections", value: "82%" },
      ],
      chart: { title: "Introductions over time", delta: "+24%" },
      breakdowns: [
        {
          title: "Top relationship types",
          rows: [
            { label: "Investors", value: "28%" },
            { label: "Potential partners", value: "24%" },
            { label: "Customers", value: "18%" },
          ],
        },
        {
          title: "Introduction outcomes",
          rows: [
            { label: "Meetings requested", value: "41%" },
            { label: "Follow-ups", value: "32%" },
            { label: "Opportunities", value: "16%" },
          ],
        },
      ],
    },
  },

  network: {
    id: "network",
    eyebrow: "A global network",
    headline: ["Every event makes", "the next one smarter."],
    body: "Insights from each city, each audience, and each new connection help you create even more valuable events over time.",
    marginalia: "Each room teaches\nthe next one.",
    // `focus` is the object-position for each frame. The tiles are portrait and
    // three of the four photographs are landscape, so a centred crop would cut
    // the subject out of two of them; each one names where to hold instead.
    cities: [
      {
        name: "Miami",
        focus: "50% 45%",
        asset: {
          src: "/images/art-basel.png",
          width: 1542,
          height: 1882,
          alt: "The Art Basel entrance at the Miami Beach Convention Center",
        },
      },
      {
        name: "San Francisco",
        focus: "55% 50%",
        asset: {
          src: "/images/sf-event.png",
          width: 2284,
          height: 1520,
          alt: "The San Francisco skyline beneath the Bay Bridge",
        },
      },
      {
        name: "New York",
        focus: "52% 62%",
        asset: {
          src: "/images/ny-skyline.png",
          width: 1916,
          height: 1292,
          alt: "The Manhattan skyline at dusk, the Empire State Building at its centre",
        },
      },
      {
        name: "Davos",
        focus: "45% 58%",
        asset: {
          src: "/images/wef-meeting.png",
          width: 2824,
          height: 1892,
          alt: "Delegates gathered in the concourse of the World Economic Forum Annual Meeting",
        },
      },
    ],
  },

  closer: {
    lines: ["You curate the room.", "We make the right introductions happen."],
    // The closer sits inside #contact, so this one cannot scroll to itself —
    // it is the action the rest of the page has been asking for, named for
    // what it actually does rather than repeating the header's label.
    cta: { label: "Email the team", href: "mailto:team@weftnow.com" },
  },

  contact: {
    id: "contact",
    eyebrow: "Let's talk",
    headline: ["Make your event the one", "they don't forget."],
    body: "Tell us about your event. We'll show you the room it could be.",
    pricing:
      "Flat pricing by event size. One number, agreed before your event, no per-guest surprises.",
    links: [
      {
        label: "WhatsApp",
        value: "+57 314 513 5153",
        href: "https://wa.me/573145135153",
        external: true,
      },
      {
        label: "Email",
        value: "team@weftnow.com",
        href: "mailto:team@weftnow.com",
        external: false,
      },
      {
        label: "Instagram",
        value: "@_weftnow",
        href: "https://www.instagram.com/_weftnow/",
        external: true,
      },
      {
        label: "LinkedIn",
        value: "Weft",
        href: "https://www.linkedin.com/company/weftnow/",
        external: true,
      },
    ],
  },

  footer: {
    wordmark: "Weft",
    tagline: "Smarter people. More meaningful connections.",
    links: [
      { label: "For organizers", href: "#impact" },
      { label: "How it works", href: "#how" },
      { label: "The network", href: "#network" },
      { label: "Contact", href: "#contact" },
    ],
    copyright: "© 2026 Weft. All rights reserved.",
  },
} as const;

export type Content = typeof content;
