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
    cta: "Try it!",
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
  compatibilityTest: {
    intro: {
      eyebrow: "Compatibility Test",
      headline: ["How compatible are you", "with that person?"],
      sub: "Twenty questions, about four minutes. We read the signal between them, then hand you a link to send someone.",
      cta: "Begin",
    },
    helpers: {
      single: "Pick the one that fits",
      pick2: "Pick exactly two",
      pick2Count: "{n} of 2 picked",
    },
    quiz: {
      eyebrow: "About you",
      progress: "{n} of {total}",
      back: "Back",
      next: "Next question",
    },
    loaderPhrases: [
      "Reading the signal between your answers…",
      "Mapping your values…",
      "Finding your connection style…",
      "Weaving your thread…",
    ],
    details: {
      eyebrow: "Last thing",
      headline: "Where should we send your thread?",
      sub: "We need this to match you with whoever answers your link.",
      fieldsLabel: "Your details",
      fields: { name: "Your name", email: "Email", phone: "Phone" },
      cta: "Get my link",
      back: "Back",
      failed: "We couldn't save that. Please try again.",
      incomplete: "Please answer every question before we can weave your thread.",
      stranded: "Your result is ready, but we couldn't open it. Use the link below.",
    },
    share: {
      eyebrow: "Your link is ready",
      headline: "Now send it to one person.",
      sub: "Compatibility takes two. Your result appears the moment someone answers your link — and you'll both see it.",
      copy: "Copy link",
      copied: "Copied ✓",
      note: "Send this link to one person. Opening it starts the questions for them.",
      returnLink: "Save your own link",
      returnHint: "Opens your result when they answer. Keep it — it works without cookies, on any device.",
      // Named apart from `copy` so screen readers and a hurried thumb can tell
      // the two buttons on this screen apart: one link is for sending, one is
      // only ever for keeping.
      returnCopy: "Copy your own link",
      returnAnnounce: "Your own link copied to clipboard",
      restart: "Start over",
      announce: "Link copied to clipboard",
      matchesLink: "See who's answered",
      linkLabel: "Your link",
    },
    invite: {
      eyebrow: "You've been invited",
      // {name} is filled by withName() -- trimmed and length-capped there.
      headline: "{name} wants to know how you two connect.",
      sub: "The same twenty questions they answered, about four minutes. Answer them and you'll both see the result.",
      cta: "Answer {name}'s questions",
    },
    inviteError: {
      expired: {
        eyebrow: "Link expired",
        headline: "This invitation has run out.",
        body: "Invitations last thirty days. Ask whoever sent it for a fresh link — or start a thread of your own.",
      },
      unknown: {
        eyebrow: "Link not found",
        headline: "We can't find that invitation.",
        body: "The link may have been mistyped or cut short somewhere along the way. Ask for it again, or start a thread of your own.",
      },
      unavailable: {
        eyebrow: "Not right now",
        headline: "We couldn't reach the service.",
        body: "Something on our side is having a moment. The link is still good — try it again shortly.",
      },
      cta: "Start your own",
    },
    pair: {
      eyebrow: "Compatibility result",
      heading: "Here's your match",
      backToMatches: "Back to matches",
      scoreLabel: "Fit score",
      // {percent} is filled by the component; read to screen readers after scoreLabel.
      scoreOutOf: "{percent} out of 100",
      // shown under the number so nobody reads it as a percentage or a grade
      scoreUnit: "fit",
      scoreNote:
        "A fit score out of 100, from values, outlook, humour and pace — not a grade.",
      scaleLow: "Different",
      scaleHigh: "Aligned",
      sharedLabel: "What you both lead with",
      matchLabel: "You match on",
      matchSub: "The things that bring you together.",
      peopleLabel: "How you each read",
      noShared: "You don't share a top value — which is its own kind of interesting.",
      sharedTag: "Shared",
      notMeasured: "not measured",
      differenceLabel: "Where you differ",
      differenceSub: "Healthy differences to be aware of.",
      evaluationHeading: "How we evaluated this match",
      evaluationSub: "The qualities reflected in both of your answers.",
      evaluationValues: "Beliefs, principles, and what matters most.",
      evaluationTraits: {
        humour: "The way you create ease and connection.",
        opensUp: "How quickly trust and openness tend to build.",
        pace: "The rhythm and space each person prefers.",
        lifeStage: "The context shaping what matters right now.",
      },
      traits: {
        humour: "Humour",
        opensUp: "Opens up",
        pace: "Pace",
        lifeStage: "Life stage",
      },
      shareHeadline: "Now send yours to someone else.",
      shareSub: "The same twenty questions, a different person, a different result.",
      restart: "Take it yourself",
      matchesLink: "See all your threads",
      missing: {
        eyebrow: "Not found",
        headline: "We can't find that result.",
        body: "The link may have been mistyped or cut short. Ask whoever shared it to send it again.",
      },
      unavailable: {
        eyebrow: "Not right now",
        headline: "We couldn't reach the service.",
        body: "Something on our side is having a moment. Try the link again shortly.",
      },
    },
    matches: {
      eyebrow: "Your threads",
      headline: "Everyone who's answered you.",
      // {count} is filled in by the page; the singular form avoids "1 matches".
      countOne: "One person has answered your link.",
      countMany: "{count} people have answered your link.",
      open: "See the full result",
      waiting: {
        eyebrow: "Nothing yet",
        headline: "Nobody's answered your link yet.",
        body: "Compatibility takes two. Send your link to one more person — the result appears the moment they finish.",
        cta: "Get a fresh link",
        failed: "We couldn't make a new link just now. Please try again.",
      },
      none: {
        eyebrow: "Nothing here yet",
        headline: "You haven't taken this yet.",
        body: "Answer twenty questions, send the link you get, and this is where your results will be.",
        cta: "Take the test",
      },
      lost: {
        eyebrow: "Thread not found",
        headline: "We've lost track of your thread.",
        body: "This browser remembers taking the test, but we can no longer find it. Starting again takes about four minutes.",
        cta: "Start again",
      },
      unavailable: {
        eyebrow: "Not right now",
        headline: "We couldn't reach the service.",
        body: "Something on our side is having a moment. Your thread is safe — try again shortly.",
        cta: "Try again",
      },
    },
    thread: {
      waiting: {
        eyebrow: "Your thread",
        headline: "No one has answered yet.",
        body: "The moment someone opens your link and answers, their result appears here. Keep this page — it works even if you clear your cookies or switch phones.",
      },
      unknown: {
        eyebrow: "Not found",
        headline: "We don't recognise this link.",
        body: "Check you copied the whole thing. If it was a link you saved, it may have been from a different browser.",
        cta: "Take the test",
      },
      unavailable: {
        eyebrow: "Not right now",
        headline: "We can't reach your thread.",
        body: "Something on our side is down. Your result is safe — try again in a moment.",
      },
    },
  },
} as const;

export type Content = typeof content;
