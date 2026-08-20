"use client";

import { useRef, useState, type FormEvent, type RefObject } from "react";
import {
  changePassword as defaultChangePassword,
  updateSettings as defaultUpdateSettings,
  DashboardClientError,
} from "@/features/organizer-dashboard/api/client/dashboard.client";
import {
  ORGANIZER_LANGUAGES,
  ORGANIZER_ROLES,
  type OrganizerLanguage,
  type OrganizerRole,
} from "@/features/organizer-auth/types/organizerAuth.types";
import {
  passwordChangeSchema,
  settingsUpdateSchema,
  type OrganizerMe,
  type PasswordChangeBody,
  type SettingsUpdateBody,
} from "../schemas/settings.schema";
import dashStyles from "@/features/organizer-dashboard/components/Dashboard.module.css";
import styles from "./Settings.module.css";

/**
 * Every zone the runtime knows about, computed once at module scope rather
 * than per render — the list does not change while the page is open, and
 * this is what makes an unknown-zone rejection unreachable from the UI: there
 * is no free-text box for the backend's ZoneInfo check to ever disagree with.
 */
const TIMEZONES = Intl.supportedValuesOf("timeZone");

const ROLE_LABELS: Record<OrganizerRole, string> = {
  founder: "Founder",
  community_manager: "Community manager",
  event_manager: "Event manager",
  operations: "Operations",
  marketing_lead: "Marketing lead",
  other: "Other",
};

const LANGUAGE_LABELS: Record<OrganizerLanguage, string> = {
  en: "English",
  es: "Español",
};

const PLAN_UNLOCKS =
  "The paid plan unlocks attendee names, contact details and outcomes — " +
  "who sat where, and what came of the night.";

/** Matches the tone of CreateEventForm's ERRORS map: nothing was lost. */
const SAVE_ERROR = "We couldn't save that. Your details are still here — try again.";
const PASSWORD_INVALID_ERROR =
  "That isn't your current password. The rest of your settings are untouched.";

export type SettingsClient = {
  updateSettings(body: SettingsUpdateBody): Promise<OrganizerMe>;
  changePassword(body: PasswordChangeBody): Promise<void>;
};

/**
 * Four cards, four independent saves.
 *
 * Organization and Defaults both write the same backend resource — PATCH
 * /v1/auth/me replaces the whole row, the same "one form sends everything"
 * trade settingsUpdateSchema's refine documents — so every submit here still
 * sends the complete set of profile fields, not just the ones on the card
 * that was clicked. But "complete" does not mean "current": the fields that
 * belong to the *other* card are read from `savedProfile` — the last row the
 * backend actually confirmed — not from that card's live state. Otherwise
 * clicking Save on Defaults while an unsaved Organization edit sits in its
 * box would silently write that edit too, which is worse than the failure
 * this independence was built to prevent: a save that never asked for
 * confirmation succeeding is a bigger problem than one that fails loudly.
 *
 * What stays independent per card beyond that is the *save* itself: each has
 * its own submitting flag and its own error string, so a role_other left
 * blank on Organization does not paint an error onto Defaults, and a wrong
 * password never touches either.
 */
export function SettingsCards({
  organizer,
  client = { updateSettings: defaultUpdateSettings, changePassword: defaultChangePassword },
}: {
  organizer: OrganizerMe;
  client?: SettingsClient;
}) {
  const [organizationName, setOrganizationName] = useState(organizer.organization_name);
  const [contactName, setContactName] = useState(organizer.contact_name);
  const [role, setRole] = useState<OrganizerRole>(organizer.role as OrganizerRole);
  const [roleOther, setRoleOther] = useState(organizer.role_other ?? "");
  const [whatsapp, setWhatsapp] = useState(organizer.whatsapp ?? "");
  const [timezone, setTimezone] = useState(organizer.timezone);
  const [defaultLanguage, setDefaultLanguage] = useState<OrganizerLanguage>(
    organizer.default_language as OrganizerLanguage,
  );

  // The last row the backend actually confirmed. PATCH /v1/auth/me replaces
  // the whole row, so whichever card is submitted still has to send a value
  // for every field — but the *other* card's fields come from here, not from
  // its live state. Without this split, saving Defaults while an unsaved
  // Organization edit sits in its box would write that unsaved edit too: a
  // successful save on one card silently committing data the organizer never
  // confirmed on the other.
  const [savedProfile, setSavedProfile] = useState<OrganizerMe>(organizer);

  const [orgSubmitting, setOrgSubmitting] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);
  const orgInFlight = useRef(false);

  const [defaultsSubmitting, setDefaultsSubmitting] = useState(false);
  const [defaultsError, setDefaultsError] = useState<string | null>(null);
  const defaultsInFlight = useRef(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const passwordInFlight = useRef(false);

  // The zone stored on the organizer's row might not be one Intl still lists
  // (a deprecated alias, say). Dropping it from the options would silently
  // move the organizer to whatever sorts first the moment the page loads —
  // so it stays selectable even though it never appears if it is already
  // covered by TIMEZONES.
  const timezoneOptions = TIMEZONES.includes(organizer.timezone)
    ? TIMEZONES
    : [organizer.timezone, ...TIMEZONES];

  /**
   * Only ever called with the response to *this card's own* submit, so only
   * this card's own live fields are safe to overwrite with it — the response
   * also echoes back the other card's fields (the PATCH always returns the
   * whole row), and writing those into the other card's live state would
   * clobber whatever the organizer is mid-typing there.
   */
  function applySavedOrganization(saved: OrganizerMe) {
    setSavedProfile(saved);
    setOrganizationName(saved.organization_name);
    setContactName(saved.contact_name);
    setRole(saved.role as OrganizerRole);
    setRoleOther(saved.role_other ?? "");
    setWhatsapp(saved.whatsapp ?? "");
  }

  function applySavedDefaults(saved: OrganizerMe) {
    setSavedProfile(saved);
    setTimezone(saved.timezone);
    setDefaultLanguage(saved.default_language as OrganizerLanguage);
  }

  async function saveProfile(
    inFlight: RefObject<boolean>,
    setSubmitting: (value: boolean) => void,
    setError: (value: string | null) => void,
    buildBody: () => unknown,
    onSaved: (saved: OrganizerMe) => void,
  ) {
    if (inFlight.current) return;

    const parsed = settingsUpdateSchema.safeParse(buildBody());
    if (!parsed.success) {
      setError(SAVE_ERROR);
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      onSaved(await client.updateSettings(parsed.data));
    } catch (reason) {
      if (reason instanceof DashboardClientError && reason.code === "unauthorized") {
        window.location.assign("/organizer/login");
        return;
      }
      setError(SAVE_ERROR);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  async function submitOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // This card's own fields as they currently sit in the boxes; the other
    // card's fields as they were last confirmed saved — never as they
    // currently sit in Defaults' own unsaved edit buffer.
    await saveProfile(orgInFlight, setOrgSubmitting, setOrgError, () => ({
      organization_name: organizationName,
      contact_name: contactName,
      role,
      role_other: roleOther,
      whatsapp,
      timezone: savedProfile.timezone,
      default_language: savedProfile.default_language,
    }), applySavedOrganization);
  }

  async function submitDefaults(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveProfile(defaultsInFlight, setDefaultsSubmitting, setDefaultsError, () => ({
      organization_name: savedProfile.organization_name,
      contact_name: savedProfile.contact_name,
      role: savedProfile.role,
      role_other: savedProfile.role_other ?? "",
      whatsapp: savedProfile.whatsapp ?? "",
      timezone,
      default_language: defaultLanguage,
    }), applySavedDefaults);
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordInFlight.current) return;

    const parsed = passwordChangeSchema.safeParse({
      current_password: currentPassword,
      new_password: newPassword,
    });
    if (!parsed.success) {
      setPasswordError(SAVE_ERROR);
      return;
    }

    passwordInFlight.current = true;
    setPasswordSubmitting(true);
    setPasswordError(null);
    try {
      await client.changePassword(parsed.data);
      setCurrentPassword("");
      setNewPassword("");
    } catch (reason) {
      if (reason instanceof DashboardClientError) {
        if (reason.code === "unauthorized") {
          window.location.assign("/organizer/login");
          return;
        }
        if (reason.code === "invalidPassword") {
          setPasswordError(PASSWORD_INVALID_ERROR);
          return;
        }
      }
      setPasswordError(SAVE_ERROR);
    } finally {
      passwordInFlight.current = false;
      setPasswordSubmitting(false);
    }
  }

  return (
    <div className={dashStyles.cardGrid}>
      {/*
        Full width rather than sharing a row: with up to five fields
        (including role_other) this is the card with the most to hold, and
        `.major` at four of six columns was leaving Defaults stranded alone
        on the row below it with three empty columns beside it.
      */}
      <form
        className={`${dashStyles.card} ${dashStyles.wide}`}
        noValidate
        onSubmit={submitOrganization}
      >
        <h2>Organization</h2>
        <div className={styles.fields}>
          <label className={styles.field}>
            <span>Organization name</span>
            <input
              className={styles.input}
              disabled={orgSubmitting}
              name="organization_name"
              onChange={(changed) => setOrganizationName(changed.target.value)}
              type="text"
              value={organizationName}
            />
          </label>
          <label className={styles.field}>
            <span>Contact name</span>
            <input
              className={styles.input}
              disabled={orgSubmitting}
              name="contact_name"
              onChange={(changed) => setContactName(changed.target.value)}
              type="text"
              value={contactName}
            />
          </label>
          <label className={styles.field}>
            <span>Role</span>
            <select
              className={styles.select}
              disabled={orgSubmitting}
              name="role"
              onChange={(changed) => {
                const nextRole = changed.target.value as OrganizerRole;
                setRole(nextRole);
                // A box that is no longer shown should not keep sending its
                // last value — otherwise switching away from "other" and
                // back to "founder" saves a role_other nobody can see or edit.
                if (nextRole !== "other") setRoleOther("");
              }}
              value={role}
            >
              {ORGANIZER_ROLES.map((option) => (
                <option key={option} value={option}>
                  {ROLE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          {role === "other" ? (
            <label className={styles.field}>
              <span>What should we call your role?</span>
              <input
                className={styles.input}
                disabled={orgSubmitting}
                name="role_other"
                onChange={(changed) => setRoleOther(changed.target.value)}
                type="text"
                value={roleOther}
              />
            </label>
          ) : null}
          <label className={styles.field}>
            <span>WhatsApp</span>
            <input
              className={styles.input}
              disabled={orgSubmitting}
              name="whatsapp"
              onChange={(changed) => setWhatsapp(changed.target.value)}
              type="text"
              value={whatsapp}
            />
          </label>
        </div>
        {orgError ? (
          <p className={dashStyles.errorNote} role="alert">{orgError}</p>
        ) : null}
        <div className={dashStyles.actionRow}>
          <button className={dashStyles.primary} disabled={orgSubmitting} type="submit">
            {orgSubmitting ? "Saving…" : "Save organization"}
          </button>
        </div>
      </form>

      <form
        className={`${dashStyles.card} ${dashStyles.half}`}
        noValidate
        onSubmit={submitDefaults}
      >
        <h2>Defaults</h2>
        <div className={styles.fields}>
          <label className={styles.field}>
            <span>Timezone</span>
            <select
              className={styles.select}
              disabled={defaultsSubmitting}
              name="timezone"
              onChange={(changed) => setTimezone(changed.target.value)}
              value={timezone}
            >
              {timezoneOptions.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
            <p className={styles.fieldCaption}>
              Events that don&apos;t set their own timezone use this one — changing it
              moves when they start and lock.
            </p>
          </label>
          <label className={styles.field}>
            <span>Language</span>
            <select
              className={styles.select}
              disabled={defaultsSubmitting}
              name="default_language"
              onChange={(changed) =>
                setDefaultLanguage(changed.target.value as OrganizerLanguage)
              }
              value={defaultLanguage}
            >
              {ORGANIZER_LANGUAGES.map((option) => (
                <option key={option} value={option}>
                  {LANGUAGE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {defaultsError ? (
          <p className={dashStyles.errorNote} role="alert">{defaultsError}</p>
        ) : null}
        <div className={dashStyles.actionRow}>
          <button className={dashStyles.primary} disabled={defaultsSubmitting} type="submit">
            {defaultsSubmitting ? "Saving…" : "Save defaults"}
          </button>
        </div>
      </form>

      <form
        className={`${dashStyles.card} ${dashStyles.half}`}
        noValidate
        onSubmit={submitPassword}
      >
        <h2>Password</h2>
        <div className={styles.fields}>
          <label className={styles.field}>
            <span>Current password</span>
            <input
              autoComplete="current-password"
              className={styles.input}
              disabled={passwordSubmitting}
              name="current_password"
              onChange={(changed) => setCurrentPassword(changed.target.value)}
              type="password"
              value={currentPassword}
            />
          </label>
          <label className={styles.field}>
            <span>New password</span>
            <input
              autoComplete="new-password"
              className={styles.input}
              disabled={passwordSubmitting}
              name="new_password"
              onChange={(changed) => setNewPassword(changed.target.value)}
              type="password"
              value={newPassword}
            />
          </label>
        </div>
        {passwordError ? (
          <p className={dashStyles.errorNote} role="alert">{passwordError}</p>
        ) : null}
        <div className={dashStyles.actionRow}>
          <button className={dashStyles.primary} disabled={passwordSubmitting} type="submit">
            {passwordSubmitting ? "Saving…" : "Change password"}
          </button>
        </div>
      </form>

      <section className={`${dashStyles.card} ${dashStyles.wide}`}>
        <h2>Your plan</h2>
        <p className={styles.planName}>{organizer.plan}</p>
        <p className={dashStyles.caption}>{PLAN_UNLOCKS}</p>
        {/*
          No upgrade button: there is no billing system behind this screen,
          and a button shaped like one would be a lie. A mailto link is the
          honest version of the same offer.
        */}
        {organizer.plan === "free" ? (
          <p className={dashStyles.secondary}>
            <a href="mailto:team@weftnow.com?subject=Upgrading%20my%20Weft%20plan">
              Ask about upgrading
            </a>
          </p>
        ) : null}
      </section>
    </div>
  );
}
