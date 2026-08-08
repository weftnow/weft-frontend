import type { FormDefinitionDto } from "../schemas/questionnaire.contract.schema";

export const backendFormEn: FormDefinitionDto = {
  form_version: "v1",
  language: "en",
  event_name: "Mixer",
  accepting_submissions: true,
  questions: [
    {
      key: "name",
      type: "short_text",
      required: true,
      label: "Your name",
      format: "name",
      max_length: 200,
    },
    {
      key: "email",
      type: "short_text",
      required: false,
      label: "Email",
      format: "email",
      max_length: 254,
    },
    {
      key: "phone",
      type: "short_text",
      required: false,
      label: "Phone",
      format: "tel",
      max_length: 32,
    },
    {
      key: "company",
      type: "short_text",
      required: false,
      label: "Company",
      placeholder: "Where you work",
      format: "organization",
      max_length: 200,
    },
    {
      key: "t1",
      type: "long_text",
      required: true,
      label: "What do you want to accomplish today? Be specific.",
      placeholder: "e.g. raise a seed round for my fintech",
      format: "text",
      max_length: 1_000,
    },
    {
      key: "t2",
      type: "long_text",
      required: true,
      label: "Describe the person it would help you most to meet tonight.",
      format: "text",
      max_length: 1_000,
    },
    {
      key: "s1_situation",
      type: "single_choice",
      required: true,
      label: "Your work situation right now",
      options: [
        { value: "company", label: "At a company" },
        { value: "own_business", label: "Running my own business" },
        { value: "independent", label: "Independent, freelance" },
        { value: "exploring", label: "Exploring, studying" },
      ],
    },
    {
      key: "s1_function",
      type: "single_choice",
      required: true,
      label: "What do you actually do?",
      options: [
        { value: "engineering_product", label: "Engineering · Product" },
        { value: "sales_bd", label: "Sales · BD" },
        { value: "marketing_growth", label: "Marketing · Growth" },
        { value: "ops_finance", label: "Ops · Finance" },
        { value: "design", label: "Design" },
        { value: "investing", label: "Investing" },
        { value: "exploring", label: "Still exploring" },
      ],
    },
    {
      key: "s2",
      type: "single_choice",
      required: true,
      label: "How long have you been in this?",
      options: [
        { value: 1, label: "Just starting (under 2 years)" },
        { value: 2, label: "2–5 years" },
        { value: 3, label: "5–10 years" },
        { value: 4, label: "10–15 years" },
        { value: 5, label: "15+ years" },
      ],
    },
    {
      key: "s3",
      type: "single_choice",
      required: true,
      label: "Today, you'd most enjoy…",
      options: [
        { value: "up", label: "Picking the brain of someone ahead of you" },
        {
          value: "peer",
          label: "Comparing notes with people in your exact situation",
        },
        { value: "down", label: "Helping someone earlier on their path" },
      ],
    },
    {
      key: "s4",
      type: "multi_choice",
      required: true,
      label: "What fits you best?",
      min_select: 1,
      options: [
        { value: "raise_capital", label: "Raise capital" },
        { value: "find_customers", label: "Find customers" },
        { value: "find_provider", label: "Solve a problem, find a provider" },
        { value: "find_partners", label: "Find partners" },
        { value: "hire_talent", label: "Hire talent" },
        { value: "find_job", label: "Find job opportunities" },
        { value: "find_cofounder", label: "Find a co-founder" },
        { value: "meet_peers", label: "Meet peers" },
      ],
    },
    {
      key: "s5",
      type: "multi_choice",
      required: false,
      label: "So what can you bring?",
      min_select: 0,
      options: [
        { value: "experience", label: "Experience in my field" },
        { value: "intros", label: "Intros to the right people" },
        { value: "distribution", label: "Distribution, audiences" },
        { value: "capital", label: "Capital" },
        { value: "mentorship", label: "Mentorship" },
        { value: "hiring", label: "We are hiring" },
        { value: "technical_help", label: "Hands-on technical help" },
      ],
    },
    {
      key: "s6",
      type: "single_choice",
      required: true,
      label:
        "Someone tells a story about a rough week at work. You've had almost the exact same thing happen. What do you do?",
      options: [
        {
          value: 1,
          label: "Tell mine, it's the fastest way to show them I get it",
        },
        { value: 2, label: "Mention briefly, then ask more about theirs" },
        { value: 3, label: "Ask what happened next, mine can wait" },
        {
          value: 4,
          label: "Mostly just react, I don't need to add anything",
        },
      ],
    },
    {
      key: "s7",
      type: "single_choice",
      required: true,
      label:
        "A friend shows you something they made and are clearly proud of. You think it's not good. They ask what you think.",
      options: [
        {
          value: 1,
          label: "Tell them what's not working, that's what \"what do you think\" means",
        },
        { value: 2, label: "Lead with what works, then say the real thing" },
        {
          value: 3,
          label: "Ask what they are unsure about, and answer only that",
        },
        {
          value: 4,
          label: "Tell them I like it, they needed the win more than advice",
        },
      ],
    },
    {
      key: "s8",
      type: "single_choice",
      required: true,
      label:
        "Think about the last event like this you went to. When were you at your best?",
      options: [
        { value: 1, label: "The first 20 mins, I came in ready" },
        {
          value: 2,
          label: "After about half an hour once I found my people",
        },
        {
          value: 3,
          label: "Late, the last conversation of the event is always the best one",
        },
        { value: 4, label: "Honestly, it was not great" },
      ],
    },
    {
      key: "s9",
      type: "single_choice",
      required: true,
      label:
        "Two events: one with structured group activities, one that's just drinks and good people. Which do you book?",
      options: [
        { value: 1, label: "The structured one, I get more out of it" },
        {
          value: 2,
          label: "The open one, I don't like structured activities",
        },
        { value: 3, label: "Whichever has the better people" },
      ],
    },
    {
      key: "s10",
      type: "single_choice",
      required: true,
      label:
        "You can either stay with a group that's really clicking, or rotate to meet five new people. You…",
      options: [
        { value: 1, label: "Stay, this is why I came" },
        { value: 2, label: "Rotate, I can always text the group later" },
        { value: 3, label: "Stay a bit longer, then make the rounds" },
      ],
    },
  ],
};

export const backendFormEs: FormDefinitionDto = {
  form_version: "v1",
  language: "es",
  event_name: "Mixer",
  accepting_submissions: true,
  questions: [
    {
      key: "name",
      type: "short_text",
      required: true,
      label: "Tu nombre",
      format: "name",
      max_length: 200,
    },
    {
      key: "email",
      type: "short_text",
      required: false,
      label: "Correo",
      format: "email",
      max_length: 254,
    },
    {
      key: "phone",
      type: "short_text",
      required: false,
      label: "Teléfono",
      format: "tel",
      max_length: 32,
    },
    {
      key: "company",
      type: "short_text",
      required: false,
      label: "Empresa",
      placeholder: "Dónde trabajas",
      format: "organization",
      max_length: 200,
    },
    {
      key: "t1",
      type: "long_text",
      required: true,
      label: "¿Qué quieres lograr hoy? Sé específico.",
      placeholder: "ej. levantar una ronda seed para mi fintech",
      format: "text",
      max_length: 1_000,
    },
    {
      key: "t2",
      type: "long_text",
      required: true,
      label: "Describe a la persona que más te ayudaría conocer esta noche.",
      format: "text",
      max_length: 1_000,
    },
    {
      key: "s1_situation",
      type: "single_choice",
      required: true,
      label: "Tu situación laboral ahora mismo",
      options: [
        { value: "company", label: "En una empresa" },
        { value: "own_business", label: "Con mi propio negocio" },
        { value: "independent", label: "Independiente, freelance" },
        { value: "exploring", label: "Explorando, estudiando" },
      ],
    },
    {
      key: "s1_function",
      type: "single_choice",
      required: true,
      label: "¿A qué te dedicas?",
      options: [
        { value: "engineering_product", label: "Ingeniería · Producto" },
        { value: "sales_bd", label: "Ventas · Desarrollo de negocio" },
        { value: "marketing_growth", label: "Marketing · Crecimiento" },
        { value: "ops_finance", label: "Operaciones · Finanzas" },
        { value: "design", label: "Diseño" },
        { value: "investing", label: "Inversión" },
        { value: "exploring", label: "Todavía explorando" },
      ],
    },
    {
      key: "s2",
      type: "single_choice",
      required: true,
      label: "¿Cuánto llevas en esto?",
      options: [
        { value: 1, label: "Recién empezando (menos de 2 años)" },
        { value: 2, label: "2–5 años" },
        { value: 3, label: "5–10 años" },
        { value: 4, label: "10–15 años" },
        { value: 5, label: "Más de 15 años" },
      ],
    },
    {
      key: "s3",
      type: "single_choice",
      required: true,
      label: "Hoy, lo que más disfrutarías…",
      options: [
        { value: "up", label: "Aprender de alguien que va más adelante" },
        {
          value: "peer",
          label: "Comparar notas con gente en tu misma situación",
        },
        { value: "down", label: "Ayudar a alguien que va empezando" },
      ],
    },
    {
      key: "s4",
      type: "multi_choice",
      required: true,
      label: "¿Qué te describe mejor?",
      min_select: 1,
      options: [
        { value: "raise_capital", label: "Levantar capital" },
        { value: "find_customers", label: "Conseguir clientes" },
        {
          value: "find_provider",
          label: "Resolver algo, encontrar un proveedor",
        },
        { value: "find_partners", label: "Encontrar aliados" },
        { value: "hire_talent", label: "Contratar talento" },
        { value: "find_job", label: "Buscar oportunidades laborales" },
        { value: "find_cofounder", label: "Encontrar un cofundador" },
        { value: "meet_peers", label: "Conocer pares" },
      ],
    },
    {
      key: "s5",
      type: "multi_choice",
      required: false,
      label: "¿Y qué puedes aportar?",
      min_select: 0,
      options: [
        { value: "experience", label: "Experiencia en lo mío" },
        {
          value: "intros",
          label: "Presentaciones con la gente indicada",
        },
        { value: "distribution", label: "Distribución, audiencia" },
        { value: "capital", label: "Capital" },
        { value: "mentorship", label: "Mentoría" },
        { value: "hiring", label: "Estamos contratando" },
        { value: "technical_help", label: "Ayuda técnica práctica" },
      ],
    },
    {
      key: "s6",
      type: "single_choice",
      required: true,
      label:
        "Alguien cuenta que tuvo una semana dura en el trabajo. A ti te pasó casi exactamente lo mismo. ¿Qué haces?",
      options: [
        {
          value: 1,
          label: "Cuento la mía, es la forma más rápida de mostrar que lo entiendo",
        },
        {
          value: 2,
          label: "La menciono rápido y luego pregunto más por la suya",
        },
        { value: 3, label: "Pregunto qué pasó después, la mía puede esperar" },
        {
          value: 4,
          label: "Sobre todo escucho y reacciono, no necesito agregar nada",
        },
      ],
    },
    {
      key: "s7",
      type: "single_choice",
      required: true,
      label:
        "Un amigo te muestra algo que hizo y está claramente orgulloso. A ti no te parece bueno. Te pregunta qué opinas.",
      options: [
        { value: 1, label: "Le digo qué no funciona, para eso se pregunta" },
        {
          value: 2,
          label: "Empiezo por lo que sí funciona y luego le digo lo real",
        },
        {
          value: 3,
          label: "Le pregunto qué le genera dudas y respondo solo eso",
        },
        {
          value: 4,
          label: "Le digo que me gusta, necesitaba el ánimo más que el consejo",
        },
      ],
    },
    {
      key: "s8",
      type: "single_choice",
      required: true,
      label:
        "Piensa en el último evento así al que fuiste. ¿Cuándo estuviste en tu mejor momento?",
      options: [
        { value: 1, label: "Los primeros 20 minutos, llegué con toda" },
        {
          value: 2,
          label: "Después de media hora, cuando encontré a mi gente",
        },
        {
          value: 3,
          label: "Al final, la última conversación siempre es la mejor",
        },
        { value: 4, label: "La verdad, no estuvo bien" },
      ],
    },
    {
      key: "s9",
      type: "single_choice",
      required: true,
      label:
        "Dos eventos: uno con actividades de grupo estructuradas y otro que es solo drinks y buena gente. ¿Cuál reservas?",
      options: [
        { value: 1, label: "El estructurado, le saco más provecho" },
        {
          value: 2,
          label: "El abierto, no me gustan las actividades estructuradas",
        },
        { value: 3, label: "El que tenga mejor gente" },
      ],
    },
    {
      key: "s10",
      type: "single_choice",
      required: true,
      label:
        "Puedes quedarte con un grupo con el que estás conectando muy bien, o rotar y conocer a cinco personas nuevas. Tú…",
      options: [
        { value: 1, label: "Me quedo, a esto vine" },
        { value: 2, label: "Roto, al grupo le puedo escribir después" },
        { value: 3, label: "Me quedo un rato más y luego doy la vuelta" },
      ],
    },
  ],
};
