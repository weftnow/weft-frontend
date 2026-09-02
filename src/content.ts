export const content = {
  media: {
    heroRail: [
      {
        src: "/images/event-group-table.jpg",
        width: 2340,
        height: 1560,
        alt: "Six attendees sitting around one table together at an evening event",
      },
      {
        src: "/images/event-night-venue.mp4",
        width: 2340,
        height: 1560,
        alt: "Clip of attendees talking at tables under a marquee after dark",
        type: "video",
      },
      {
        src: "/images/event-evening-tables.mp4",
        width: 1080,
        height: 1350,
        alt: "Clip of three attendees talking over laptops at an outdoor table",
        type: "video",
      },
      {
        src: "/images/event-group-photos.png",
        width: 2340,
        height: 1560,
        alt: "Attendees posing for group photos at a long dinner table and outdoors",
      },
      {
        src: "/images/event-talk.mp4",
        width: 2340,
        height: 1560,
        alt: "Clip of a speaker presenting to a seated room",
        type: "video",
      },
      {
        src: "/images/event-workspace-collage.mp4",
        width: 1080,
        height: 1350,
        alt: "Clip of attendees working and talking in a shared space",
        type: "video",
      },
      {
        src: "/images/event-group-lunch.png",
        width: 2340,
        height: 1560,
        alt: "Attendees sharing lunch together at a long outdoor table",
      },
    ],
    portraits: [
      {
        src: "/images/matched-attendee-01.png",
        width: 1000,
        height: 1500,
        alt: "Portrait of a smiling attendee in a matched group",
      },
      {
        src: "/images/matched-attendee-02.png",
        width: 1630,
        height: 1775,
        alt: "Portrait of a laughing attendee in a matched group",
      },
      {
        src: "/images/matched-attendee-03.png",
        width: 700,
        height: 806,
        alt: "Portrait of an attendee wearing glasses in a matched group",
      },
    ],
    problem: {
      src: "/images/crowded-networking-room.png",
      width: 816,
      height: 1126,
      alt: "One attendee standing alone in a crowded conference room full of badges",
    },
    how: [
      {
        src: "/images/intake-on-phone.mp4",
        width: 1440,
        height: 1080,
        alt: "Clip of an attendee answering the Weft intake on a phone at an event",
        type: "video",
      },
      {
        src: "/images/weft-event-conversation.png",
        width: 2340,
        height: 1560,
        alt: "Four attendees talking in a small group at a Weft event, one holding the Weft app",
      },
      {
        src: "/images/group-reveal.webm",
        width: 1440,
        height: 1080,
        alt: "Clip of the room rearranging as groups are revealed",
        type: "video",
      },
    ],
    // The featured story runs behind a named quote, so it stays an event photo
    // rather than a face: a stock portrait beside a real name reads as a fake.
    outcome: {
      src: "/images/event-group-cafe.png",
      width: 3024,
      height: 4032,
      alt: "Attendees sitting together around a cafe table at an event",
    },
    contact: {
      src: "/images/contact-mark.png",
      width: 800,
      height: 800,
      alt: "The Weft mark, six blue petals arranged around an open centre",
    },
  },
  nav: {
    links: [
      { label: "The problem", href: "#problem" },
      { label: "How it works", href: "#how" },
      { label: "Stories", href: "#stories" },
      { label: "FAQ", href: "#faq" },
    ],
    // The nav's one button belongs to returning organizers. New organizers get
    // "Book a call" in the hero, which is the louder ask on a page written for
    // the people who buy Weft.
    cta: { label: "Sign in", href: "/organizer/login" },
  },

  hero: {
    // Two-tone: `muted` renders in --ash and resolves last. `accent` names the
    // words that take the ember highlight, without their punctuation.
    headline: [
      {
        text: "Where attendees finally meet the right people.",
        muted: "",
        accent: "right",
      },
    ],
    sub: "Weft matches your attendees into small groups based on their goals and values, then guides the conversation. Great connections become your event's reputation.",
    ctaPrimary: "Book a call",
    ctaPrimaryHref: "#contact",
    ctaSecondary: "Try the matching",
    ctaSecondaryHref: "/match",
    eyebrow: "The networking layer for business events",
  },

  // logos: `real` renders real wordmark components; `placeholders` are stand-in marks.
  logos: {
    intro: "The teams behind unforgettable events run on Weft",
    real: ["google"] as const,
    placeholders: ["Northwind", "Lumen", "Atlas", "Vela", "Corva"],
  },

  problem: {
    eyebrow: "The networking that didn't work",
    headline: [{ text: "Everyone came to connect.", muted: "Almost no one did." }],
    beats: [
      {
        stat: "Dozens of “networking” events.",
        label: "People thirsty for connections.",
      },
      {
        stat: "Thousands of introductions.",
        label: "LinkedIn profiles exchanged along the way in awkward experiences.",
      },
      {
        stat: "No real contacts. Nothing to remember.",
        label: "More contacts in the pocket, still zero connections.",
      },
    ],
    kicker: "Without real connections that last, your event becomes just another one.",
  },

  turn: {
    line: [
      { text: "So we built the thread that pulls", muted: "the people who actually belong." },
    ],
  },

  how: {
    eyebrow: "How Weft works",
    headline: [{ text: "Three steps.", muted: "One unforgettable room." }],
    steps: [
      {
        n: "01",
        title: "They tell us what actually matters to them",
        body: "A two-minute intake before the event, not a resume. We ask about their goals, expertise, values, and who they're hoping to meet, not just their job title.",
      },
      {
        n: "02",
        title: "The algorithm weaves the groups",
        body: "Weft weighs goals, expertise, and values together, not just job titles or small talk. It forms small groups where every person is exactly who someone else came to meet.",
        computing: ["Determine your personality…", "Finding you the best match…"],
      },
      {
        n: "03",
        title: "The room rearranges itself",
        body: "At the moment you choose, everyone learns their group live, and strangers walk straight toward the exact people they came to meet.",
      },
    ],
  },

  reveal: {
    eyebrow: "The moment it clicks",
    headline: [{ text: "Four strangers.", muted: "One reason they're here." }],
    body: "This is the part attendees post about. The reveal turns a room of nametags into the best conversation of their quarter, because for once they were matched on their goals, expertise, and values, not just their industry.",
    // The five avatars in the fan-out: [attendee, ...four matches]
    group: [
      { initials: "YOU", role: "You" },
      { initials: "AM", role: "The investor you needed" },
      { initials: "RK", role: "Your next hire" },
      { initials: "TS", role: "The operator two steps ahead" },
      { initials: "JD", role: "The friend you didn't expect to make" },
    ],
  },

  organizer: {
    eyebrow: "For organizers",
    headline: [{ text: "Almost no work for you.", muted: "Real results after." }],
    lead: "When networking fails, attendees don't come back, and you're left refilling the room with new people every event. Weft fixes the reason they leave.",
    blocks: [
      {
        title: "What you do",
        items: [
          "Send us your attendee list, or connect your Luma or Eventbrite event.",
          "Pick the moment for the group reveal.",
          "That's it. No app for attendees to download, no software for your team to learn.",
        ],
      },
      {
        title: "What you get",
        items: [
          "A live dashboard showing who came to meet whom.",
          "Guided group conversations that run themselves.",
          "A post-event report: which attendees want to meet again, and how the room rated it.",
          "Follow-up second meetings arranged for mutual matches.",
        ],
      },
    ],
  },

  testimonials: {
    eyebrow: "Stories",
    headline: [{ text: "The events people", muted: "remember." }],
    outcomes: [
      "Turn random networking into real connection",
      "Make your event impossible to forget",
      "Prove your event created real value",
    ],
    // Each story carries its own avatar, so a photo can never drift onto the
    // wrong name. `initials` is the honest fallback when we have no photo of
    // the person who actually said it.
    items: [
      {
        type: "quote",
        quote:
          "The best part was seeing that people stayed. They did not want to leave even after the event ended.",
        name: "Alissa Ku",
        title: "Head of Events, Selina Indonesia",
        initials: "AK",
      },
      {
        type: "quote",
        quote:
          "Weft did in one evening what I hadn't been able to do in a year of building my community.",
        name: "Typhaine Morvan",
        title: "CEO, Bali Exception Sales",
        photo: {
          src: "/images/testimonial-typhaine.jpg",
          width: 800,
          height: 800,
          alt: "Portrait of Typhaine Morvan, CEO of Bali Exception Sales",
        },
      },
      {
        type: "quote",
        quote:
          "The reveal moment got a genuine gasp. I have never seen a networking session do that.",
        name: "Nate Nwajei",
        title: "Operations @ Arkadia",
        initials: "NN",
      },
      {
        type: "quote",
        quote:
          "People left with conversations they were still talking about the next day.",
        name: "Ayu Sudana",
        title: "Founder @ Uttama Hospitality",
        photo: {
          src: "/images/testimonial-ayu.jpeg",
          width: 800,
          height: 800,
          alt: "Portrait of Ayu Sudana, founder of Uttama Hospitality",
        },
      },
      {
        type: "quote",
        quote:
          "It made a big room feel intentional from the very first introduction.",
        name: "Ronaldo Orlovskyi",
        title: "CEO @ Bali Nexus Investment Partners",
        photo: {
          src: "/images/testimonial-ronaldo.jpeg",
          width: 800,
          height: 800,
          alt: "Portrait of Ronaldo Orlovskyi, CEO of Bali Nexus Investment Partners",
        },
      },
    ],
  },

  faq: {
    eyebrow: "FAQ",
    headline: [{ text: "The things", muted: "people ask." }],
    items: [
      {
        q: "How is this different from the networking feature in our event app?",
        a: "Most event apps give your guests a directory and a chat window, then leave them to find each other. Weft does the finding, matching, engagement. Your attendees come ready connected before, during and after the event.",
      },
      {
        q: "How does the matching work?",
        a: "It looks at three things about each guest: what they want out of the event, what they know, and what they care about. In simple terms, Weft matches your attendees with the person they want to meet at the event, the topics we curated they can talk about, and they left with the contacts they are looking for.",
      },
      {
        q: "How much do our guests have to do beforehand?",
        a: "One 2-minute form on their phone. Fill it early and get a preview of who you'll meet. Forget? Your attendees can still do it at the door.",
      },
      {
        q: "Does this work for large events and conferences?",
        a: "Yes. For big events we make the form even shorter, under a minute, because we pull most of what we need from your registration data (like name, company, and role). Guests only answer the questions that matter most: what they want to accomplish and who they want to meet.",
      },
      {
        q: "What do we get after the event?",
        a: "A dashboard you can watch during the event and keep afterwards: how good the matches were, how many people took part, and how they rated their groups. It's built to be something you can show sponsors and your own leadership.",
      },
      {
        q: "What does it cost?",
        a: "A flat price based on the size of your event, agreed before the event starts. There's no per-guest fee. Contact team@weftnow.com for more information.",
      },
    ],
  },

  contact: {
    eyebrow: "Let's talk",
    headline: [{ text: "Make your event the one", muted: "they don't forget." }],
    body: "Tell us about your event. We'll show you the room it could be.",
    pricing:
      "Flat pricing by event size. One number, agreed before your event, no per-guest surprises.",
    links: [
      {
        label: "WhatsApp",
        value: "+57 314 513 5153",
        href: "https://wa.me/573145135153",
        mark: "WA",
        external: true,
      },
      {
        label: "Email",
        value: "team@weftnow.com",
        href: "mailto:team@weftnow.com",
        mark: "@",
        external: false,
      },
      {
        label: "Instagram",
        value: "@_weftnow",
        href: "https://www.instagram.com/_weftnow/",
        mark: "IG",
        external: true,
      },
      {
        label: "LinkedIn",
        value: "Weft",
        href: "https://www.linkedin.com/company/weftnow/",
        mark: "in",
        external: true,
      },
    ],
    fields: {
      name: "Your name",
      email: "Work email",
      event: "What are you organizing?",
    },
    cta: "Book a call",
    wordmark: "weft",
    footerLinks: ["The problem", "How it works", "Stories", "FAQ"],
    copyright: "© 2026 Weft. All rights reserved.",
  },
} as const;

export type Content = typeof content;
