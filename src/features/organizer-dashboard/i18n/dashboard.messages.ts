/**
 * The chip labels, copied verbatim from the s4 and s5 options in the backend's
 * app/forms/definition.py.
 *
 * The intent endpoint returns the raw keys an attendee picked — "find_customers",
 * not "Find customers" — because the backend has no view layer. Rendering a key
 * in front of an organizer would leak our schema into their dashboard, so every
 * key gets its label here. Copied rather than fetched: these change roughly
 * never, and a round trip to render a bar chart axis is not worth the coupling.
 *
 * If a question ever gains an option, add it here in the same commit. An
 * unmapped key falls back to the raw string, which is ugly on purpose — it is
 * meant to be noticed in review rather than silently render as blank.
 */

export type ChipLabel = { en: string; es: string };

/** s4 — "What fits you best?" All 8 values. */
export const ASK_LABELS: Record<string, ChipLabel> = {
  raise_capital: { en: "Raise capital", es: "Levantar capital" },
  find_customers: { en: "Find customers", es: "Conseguir clientes" },
  find_provider: {
    en: "Solve a problem, find a provider",
    es: "Resolver algo, encontrar un proveedor",
  },
  find_partners: { en: "Find partners", es: "Encontrar aliados" },
  hire_talent: { en: "Hire talent", es: "Contratar talento" },
  find_job: {
    en: "Find job opportunities",
    es: "Buscar oportunidades laborales",
  },
  find_cofounder: { en: "Find a co-founder", es: "Encontrar un cofundador" },
  meet_peers: { en: "Meet peers", es: "Conocer pares" },
};

/** s5 — "So what can you bring?" All 7 values. */
export const OFFER_LABELS: Record<string, ChipLabel> = {
  experience: { en: "Experience in my field", es: "Experiencia en lo mío" },
  intros: {
    en: "Intros to the right people",
    es: "Presentaciones con la gente indicada",
  },
  distribution: { en: "Distribution, audiences", es: "Distribución, audiencia" },
  capital: { en: "Capital", es: "Capital" },
  mentorship: { en: "Mentorship", es: "Mentoría" },
  hiring: { en: "We are hiring", es: "Estamos contratando" },
  technical_help: {
    en: "Hands-on technical help",
    es: "Ayuda técnica práctica",
  },
};
