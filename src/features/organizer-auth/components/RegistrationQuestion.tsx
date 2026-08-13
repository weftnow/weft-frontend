"use client";

import type { OrganizerAuthMessages } from "../i18n/organizerAuth.messages";
import { draftFieldForStep, type RegistrationState } from "../model/registration.reducer";
import type { OrganizerRole, RegisterStep } from "../types/organizerAuth.types";
import { AnimatedPrompt } from "./AnimatedPrompt";
import { RoleOptions } from "./RoleOptions";
import styles from "./OrganizerAuth.module.css";

type RegistrationQuestionProps = {
  step: RegisterStep;
  state: RegistrationState;
  messages: OrganizerAuthMessages;
  disabled: boolean;
  onTextChange: (value: string) => void;
  onRoleChange: (role: OrganizerRole) => void;
  onRoleOtherChange: (value: string) => void;
  onEnter: () => void;
};

export function RegistrationQuestion({
  step,
  state,
  messages,
  disabled,
  onTextChange,
  onRoleChange,
  onRoleOtherChange,
  onEnter,
}: RegistrationQuestionProps) {
    const prompt = messages.registration.prompts[step];
    const error = state.fieldError?.field === step
      && state.fieldError?.code !== "roleOther"
      ? messages.errors[state.fieldError.code]
      : null;

    if (step === "role") {
      const roleOtherError = state.fieldError?.field === "role"
        && state.fieldError?.code === "roleOther"
        ? messages.errors.roleOther
        : null;

      return (
        <fieldset className={styles.question} data-registration-question>
          <legend className={styles.questionPrompt}>
            <span className="sr-only">{prompt}</span>
            <AnimatedPrompt text={prompt} />
          </legend>
          <RoleOptions
            labels={messages.roles}
            onChange={onRoleChange}
            selected={state.draft.role}
          />
          {state.draft.role === "other" ? (
            <div className={styles.roleOtherField}>
              <label htmlFor="organizer-role-other">
                {messages.registration.roleOtherLabel}
              </label>
              <input
                aria-describedby={roleOtherError ? "organizer-role-other-error" : undefined}
                aria-invalid={roleOtherError ? true : undefined}
                className={styles.field}
                disabled={disabled}
                id="organizer-role-other"
                maxLength={200}
                onChange={(event) => onRoleOtherChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onEnter();
                  }
                }}
                placeholder={messages.registration.roleOtherPlaceholder}
                type="text"
                value={state.draft.roleOther}
              />
              {roleOtherError ? (
                <p className={styles.error} id="organizer-role-other-error" role="alert">
                  {roleOtherError}
                </p>
              ) : null}
            </div>
          ) : null}
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
        </fieldset>
      );
    }

    const draftField = draftFieldForStep(step);
    const value = state.draft[draftField];
    const type = step === "email" ? "email" : step === "password" ? "password" : "text";
    const autoComplete = step === "contact_name"
      ? "name"
      : step === "organization_name"
        ? "organization"
        : step === "email"
          ? "username"
          : "new-password";

    return (
      <div className={styles.question} data-registration-question>
        <label className={styles.questionPrompt} htmlFor={`organizer-${step}`}>
          <span className="sr-only">{prompt}</span>
          <AnimatedPrompt text={prompt} />
        </label>
        <input
          aria-describedby={error ? `organizer-${step}-error` : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete={autoComplete}
          className={styles.field}
          data-auth-autofocus="true"
          disabled={disabled}
          id={`organizer-${step}`}
          maxLength={step === "password" ? 72 : step === "email" ? 320 : 200}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onEnter();
            }
          }}
          placeholder={messages.registration.placeholders[step]}
          type={type}
          value={typeof value === "string" ? value : ""}
        />
        {error ? (
          <p className={styles.error} id={`organizer-${step}-error`} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
}
