"use client";

import { useState, type FormEvent } from "react";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { content } from "@/content";
import {
  hasErrors,
  trimDetails,
  validateDetails,
  type Details,
  type DetailsErrors,
} from "@/lib/details";

/**
 * The quiz asks for these only once the answers are in: the form arrives after
 * the effort, and it gates the thing the person came for.
 */
export function DetailsForm({
  initialDetails,
  submitError,
  busy,
  onBack,
  onSubmit,
}: {
  initialDetails: Details;
  submitError: string | null;
  busy: boolean;
  onBack: () => void;
  onSubmit: (details: Details) => void;
}) {
  const copy = content.compatibilityTest.details;
  const [details, setDetails] = useState<Details>(initialDetails);
  const [errors, setErrors] = useState<DetailsErrors>({});

  function change(field: keyof Details, value: string) {
    const next = { ...details, [field]: value };
    setDetails(next);
    // Only re-check a field that has already been rejected -- complaining while
    // someone is still typing their email is noise.
    if (errors[field]) setErrors({ ...errors, [field]: validateDetails(next)[field] });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateDetails(details);
    setErrors(found);
    if (hasErrors(found)) return;
    onSubmit(trimDetails(details));
  }

  return (
    <div className="ctest-stage ctest-stage--details">
      <span className="ctest-eyebrow">{copy.eyebrow}</span>
      <h2 className="ctest-prompt">{copy.headline}</h2>
      <p className="mt-2 max-w-sm text-pretty text-base leading-relaxed text-ink/60">
        {copy.sub}
      </p>

      <form className="ctest-form mt-8" noValidate onSubmit={submit}>
        <div className="ctest-card-head">
          <span aria-hidden className="ctest-rule" />
          <span className="ctest-section-label">{copy.fieldsLabel}</span>
        </div>
        <DetailsField
          autoComplete="name"
          error={errors.name}
          field="name"
          label={copy.fields.name}
          onChange={change}
          type="text"
          value={details.name}
        />
        <DetailsField
          autoComplete="email"
          error={errors.email}
          field="email"
          label={copy.fields.email}
          onChange={change}
          type="email"
          value={details.email}
        />
        <DetailsField
          autoComplete="tel"
          error={errors.phone}
          field="phone"
          label={copy.fields.phone}
          onChange={change}
          type="tel"
          value={details.phone}
        />

        {submitError && (
          <p className="ctest-error" role="alert">
            {submitError}
          </p>
        )}

        <div className="ctest-actions ctest-actions--details">
          <button
            className="ctest-back"
            onClick={onBack}
            type="button"
          >
            <span aria-hidden>&larr;</span> {copy.back}
          </button>
          <PremiumButton hand={false} tone="ember" type="submit" disabled={busy}>
            {copy.cta}
          </PremiumButton>
        </div>
      </form>
    </div>
  );
}

function DetailsField({
  autoComplete,
  error,
  field,
  label,
  onChange,
  type,
  value,
}: {
  autoComplete: string;
  error?: string;
  field: keyof Details;
  label: string;
  onChange: (field: keyof Details, value: string) => void;
  type: "text" | "email" | "tel";
  value: string;
}) {
  const id = `ctest-${field}`;
  return (
    <label className="ctest-label" htmlFor={id}>
      <span>{label}</span>
      <input
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={error ? true : undefined}
        autoComplete={autoComplete}
        className={`ctest-input${error ? " ctest-input--bad" : ""}`}
        id={id}
        name={field}
        onChange={(event) => onChange(field, event.target.value)}
        type={type}
        value={value}
      />
      {error && (
        <span className="ctest-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </label>
  );
}
