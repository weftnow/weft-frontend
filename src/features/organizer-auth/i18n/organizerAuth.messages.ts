import type {
  OrganizerLanguage,
  OrganizerRole,
  RegisterStep,
} from "../types/organizerAuth.types";

export type OrganizerAuthMessages = {
  languageLabel: string;
  english: string;
  spanish: string;
  registration: {
    prompts: Record<RegisterStep, string>;
    placeholders: Record<Exclude<RegisterStep, "role">, string>;
    roleOtherLabel: string;
    roleOtherPlaceholder: string;
    progress: string;
    continue: string;
    back: string;
    submit: string;
    submitting: string;
    accountPrompt: string;
    loginLink: string;
  };
  roles: Record<OrganizerRole, string>;
  login: {
    title: string;
    emailLabel: string;
    passwordLabel: string;
    submit: string;
    submitting: string;
    newPrompt: string;
    registerLink: string;
  };
  errors: {
    contact_name: string;
    organization_name: string;
    role: string;
    roleOther: string;
    email: string;
    password: string;
    emailAlreadyRegistered: string;
    invalidCredentials: string;
    unavailable: string;
  };
};

export const organizerAuthMessages: Record<
  OrganizerLanguage,
  OrganizerAuthMessages
> = {
  en: {
    languageLabel: "Language",
    english: "English",
    spanish: "Español",
    registration: {
      prompts: {
        contact_name: "What should we call you?",
        organization_name: "What organization are you hosting with?",
        role: "What's your role?",
        email: "What's your work email?",
        password: "Create a password.",
      },
      placeholders: {
        contact_name: "Your name",
        organization_name: "Organization name",
        email: "you@organization.com",
        password: "At least 8 characters",
      },
      roleOtherLabel: "Describe your role",
      roleOtherPlaceholder: "Your role",
      progress: "Question {current} of {total}",
      continue: "Continue",
      back: "Back",
      submit: "Create account",
      submitting: "Creating account",
      accountPrompt: "Already have an account?",
      loginLink: "Sign in",
    },
    roles: {
      founder: "Founder",
      community_manager: "Community Manager",
      event_manager: "Event Manager",
      operations: "Operations",
      marketing_lead: "Marketing lead",
      other: "Other",
    },
    login: {
      title: "Welcome back.",
      emailLabel: "Work email",
      passwordLabel: "Password",
      submit: "Sign in",
      submitting: "Signing in",
      newPrompt: "New to Weft?",
      registerLink: "Create an account",
    },
    errors: {
      contact_name: "Enter your name.",
      organization_name: "Enter your organization name.",
      role: "Choose your role.",
      roleOther: "Tell us your role.",
      email: "Enter a valid work email.",
      password: "Use between 8 and 72 characters.",
      emailAlreadyRegistered: "An account already exists for this email.",
      invalidCredentials: "The email or password is incorrect.",
      unavailable: "We couldn't reach Weft. Check your connection and try again.",
    },
  },
  es: {
    languageLabel: "Idioma",
    english: "English",
    spanish: "Español",
    registration: {
      prompts: {
        contact_name: "¿Cómo deberíamos llamarte?",
        organization_name: "¿Con qué organización haces tus eventos?",
        role: "¿Cuál es tu rol?",
        email: "¿Cuál es tu correo de trabajo?",
        password: "Crea una contraseña.",
      },
      placeholders: {
        contact_name: "Tu nombre",
        organization_name: "Nombre de la organización",
        email: "tu@organizacion.com",
        password: "Mínimo 8 caracteres",
      },
      roleOtherLabel: "Describe tu rol",
      roleOtherPlaceholder: "Tu rol",
      progress: "Pregunta {current} de {total}",
      continue: "Continuar",
      back: "Atrás",
      submit: "Crear cuenta",
      submitting: "Creando cuenta",
      accountPrompt: "¿Ya tienes una cuenta?",
      loginLink: "Inicia sesión",
    },
    roles: {
      founder: "Fundador/a",
      community_manager: "Community Manager",
      event_manager: "Event Manager",
      operations: "Operaciones",
      marketing_lead: "Líder de marketing",
      other: "Otro",
    },
    login: {
      title: "Qué bueno verte de nuevo.",
      emailLabel: "Correo de trabajo",
      passwordLabel: "Contraseña",
      submit: "Iniciar sesión",
      submitting: "Iniciando sesión",
      newPrompt: "¿Primera vez en Weft?",
      registerLink: "Crea una cuenta",
    },
    errors: {
      contact_name: "Escribe tu nombre.",
      organization_name: "Escribe el nombre de tu organización.",
      role: "Elige tu rol.",
      roleOther: "Cuéntanos tu rol.",
      email: "Escribe un correo de trabajo válido.",
      password: "Usa entre 8 y 72 caracteres.",
      emailAlreadyRegistered: "Ya existe una cuenta con este correo.",
      invalidCredentials: "El correo o la contraseña son incorrectos.",
      unavailable: "No pudimos conectar con Weft. Revisa tu conexión e inténtalo de nuevo.",
    },
  },
};
