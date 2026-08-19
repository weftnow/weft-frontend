export const content = {
  media: {
    heroRail: [
      {
        src: "/placeholders/weft/carousel1.JPG",
        width: 2340,
        height: 1560,
        alt: "Carousel image 1",
        placeholder: false,
      },
      {
        src: "/placeholders/weft/video3.mp4",
        width: 2340,
        height: 1560,
        alt: "Carousel clip of Weft experience",
        placeholder: false,
        type: "video"
      },
      {
        src: "/placeholders/weft/video1.mp4",
        width: 1080,
        height: 1350,
        alt: "Carousel clip of the Weft matching experience",
        placeholder: false,
        type: "video",
      },
      {
        src: "/placeholders/weft/carousel33.png",
        width: 2340,
        height: 1560,
        alt: "Carousel image 3",
        placeholder: false,
      },
      {
        src: "/placeholders/weft/video4.mp4",
        width: 2340,
        height: 1560,
        alt: "Carousel clip of the Weft matching experience",
        placeholder: false,
        type: "video"
      },
      {
        src: "/placeholders/weft/video2.mp4",
        width: 1080,
        height: 1350,
        alt: "Carousel clip of attendees connecting at an event",
        placeholder: false,
        type: "video",
      },
      {
        src: "/placeholders/weft/carousel5.png",
        width: 2340,
        height: 1560,
        alt: "Carousel image 5",
        placeholder: false,
      },
    ],
    portraits: [
      {
        src: "/placeholders/weft/attendee-01.png",
        width: 1000,
        height: 1500,
        alt: "Placeholder portrait of a smiling event attendee",
        placeholder: true,
      },
      {
        src: "/placeholders/weft/attendee-02.png",
        width: 447,
        height: 495,
        alt: "Placeholder portrait of a matched event attendee",
        placeholder: true,
      },
      {
        src: "/placeholders/weft/attendee-03.png",
        width: 700,
        height: 806,
        alt: "Placeholder portrait of another matched attendee",
        placeholder: true,
      },
    ],
    problem: {
      src: "/placeholders/weft/problem-room.png",
      width: 816,
      height: 1126,
      alt: "Placeholder event portrait representing an unproductive room",
      placeholder: true,
    },
    how: [
      {
        src: "/placeholders/weft/how-it-works-1.mp4",
        width: 1440,
        height: 1080,
        alt: "Clip of attendee intake before the event",
        placeholder: false,
        type: "video",
      },
      {
        src: "/placeholders/weft/matching-preview.png",
        width: 2340,
        height: 1560,
        alt: "Placeholder preview of group computation",
        placeholder: true,
      },
      {
        src: "/placeholders/weft/how-it-works-3.webm",
        width: 1440,
        height: 1080,
        alt: "Clip of the room rearranging as groups are revealed",
        placeholder: false,
        type: "video",
      },
    ],
    outcome: {
      src: "/placeholders/weft/outcome-feature.png",
      width: 3021,
      height: 2904,
      alt: "Placeholder portrait for the featured event outcome",
      placeholder: true,
    },
    testimonialAvatars: [
      {
        src: "/placeholders/weft/testimonial-01.png",
        width: 1630,
        height: 1775,
        alt: "Placeholder portrait for the first testimonial",
        placeholder: true,
      },
      {
        src: "/placeholders/weft/testimonial-02.png",
        width: 943,
        height: 979,
        alt: "Placeholder portrait for the second testimonial",
        placeholder: true,
      },
      {
        src: "/placeholders/weft/testimonial-03.png",
        width: 736,
        height: 1104,
        alt: "Placeholder portrait for the third testimonial",
        placeholder: true,
      },
      {
        src: "/placeholders/weft/customer1.jpeg",
        width: 800,
        height: 800,
        alt: "Placeholder portrait for the fourth testimonial",
        placeholder: true,
      },
      {
        src: "/placeholders/weft/customer2.jpeg",
        width: 800,
        height: 800,
        alt: "Placeholder portrait for the fifth testimonial",
        placeholder: true,
      },
    ],
    contact: {
      src: "/placeholders/weft/contact-art.png",
      width: 800,
      height: 800,
      alt: "Placeholder artwork for the Weft contact panel",
      placeholder: true,
    },
  },
  nav: {
    links: [
      { label: "The problem", href: "#problem" },
      { label: "How it works", href: "#how" },
      { label: "Stories", href: "#stories" },
      { label: "FAQ", href: "#faq" },
    ],
    // The nav's one button belongs to returning organizers. Attendees reach the
    // matching demo from the hero's "Try it!", which is the louder ask on a page
    // written for the people who buy Weft.
    cta: { label: "Sign in", href: "/organizer/login" },
  },

  hero: {
    // Two-tone: `muted` renders in --ash and resolves last.
    headline: [
      { text: "Matched on what matters, not your badge.", muted: "", accent: "your badge" },
    ],
    sub: "Weft matches attendees on their goals and values, not small talk. Finding the right people becomes the best part of the event.",
    ctaPrimary: "Try it!",
    ctaSecondary: "See how it works",
    // Placeholder metric. Replace NN with the real post-event figure before launch,
    // and keep it identical to the matching number in `payoff.stats`.
    proofLabel: "Boost your event engagement rate",
  },

  // logos: `real` renders real wordmark components; `placeholders` are placeholder marks.
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
    kicker: "Without real connections that lasts, your event becomes just another one",
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
    // Placeholder stats, replace with real numbers before launch.
    stats: [
      { value: 92, suffix: "%", label: "of matched attendees rate their group a 9 or 10" },
      { value: 3.4, suffix: "x", label: "more qualified conversations vs. open networking" },
      { value: 4.8, suffix: "/5", label: "average event rating after adding Weft" },
    ],
    // The five avatars in the fan-out: [attendee, ...four matches]
    group: [
      { initials: "YOU", role: "You" },
      { initials: "AM", role: "The investor you needed" },
      { initials: "RK", role: "Your next hire" },
      { initials: "TS", role: "The operator two steps ahead" },
      { initials: "JD", role: "The friend you didn't expect to make" },
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
    // Placeholder quotes and names, replace before launch.
    items: [
      {
        type: "quote",
        quote:
        "The best part was seeing people stay do not want to leave even after the event ended",
        name: "Alissa Ku",
        title: "Head of Events, Selina Indonesia",
      },
      {
        type: "quote",
        quote:
          "Weft did in one evening what I hadn't been able in a year building my community",
        name: "Typhaine Morvan",
        title: "CEO Bali Exception Sales",
      },
      {
        type: "quote",
        quote:
          "The reveal moment got a genuine gasp. I have never seen a networking session do that.",
        name: "Nate Nwajei",
        title: "Operations @ Arkadia",
      },
      {
        type: "quote",
        quote:
          "People left with conversations they were still talking about the next day.",
        name: "Ayu Sudana",
        title: "Founder @ Uttama hospitality.",
      },
      {
        type: "quote",
        quote:
          "It made a big room feel intentional from the very first introduction.",
        name: "Ronaldo Orlovskyi",
        title: "CEO @ Bali Nexus Investment Partners",
      },
    ],
  },

  faq: {
    eyebrow: "FAQ",
    headline: [{ text: "The things", muted: "people ask." }],
    items: [
      {
        q: "How is Weft different from other networking tools?",
        a: "Most of them hand you a chat app and a list to scroll, and you still do the work of finding anyone worth meeting. Weft solves the whole room at once with our own scoring model, and it optimizes for the person who's least well matched at each table, not the average. You get a table to walk to, not an app to navigate.",
      },
      {
        q: "How is this different from matching by shared interests?",
        a: "Two people who both like hiking might have nothing else in common. Weft looks past hobbies to what actually predicts a good conversation: goals, expertise, and values together. Then it builds small groups around that.",
      },
      {
        q: "How much does an attendee have to do beforehand?",
        a: "About two minutes. A short intake captures their goals, expertise, values, and who they're hoping to meet, not just their job title. If they skip it, Weft still places them using whatever the organizer provides.",
      },
      {
        q: "What size event does Weft work for?",
        a: "From 30-person dinners to multi-thousand-person conferences. Group sizes and reveal timing are configurable per session.",
      },
      {
        q: "How does the matching actually decide?",
        a: "Weft models goals, expertise, and values together, not just shared industry or interests. It optimizes for groups where each person is genuinely glad to be there, then balances for enough difference to keep the conversation interesting.",
      },
      {
        q: "Do organizers get to see how it went?",
        a: "Yes. A live dashboard shows match quality, participation, and post-event ratings you can put in front of sponsors and leadership.",
      },
      {
        q: "Can we brand the experience?",
        a: "The attendee-facing app carries your event's identity. Weft runs the matchmaking; your brand gets the credit.",
      },
    ],
  },

  contact: {
    eyebrow: "Let's talk",
    headline: [{ text: "Make your event the one", muted: "they don't forget." }],
    body: "Tell us about your event. We'll show you the room it could be.",
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
