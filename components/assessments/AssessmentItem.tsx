"use client";

import type { AssessmentItemDefinition } from "@/lib/assessments/types";

export function AssessmentItem({ item, value, onChange }: { item: AssessmentItemDefinition; value: unknown; onChange: (value: unknown) => void }) {
  const stringValue = typeof value === "string" ? value : "";
  const selected = Array.isArray(value) ? value.map(String) : [];

  if (item.type === "textarea") {
    return <label className="assessment-field"><span>{item.prompt}</span>{item.helpText && <small>{item.helpText}</small>}<textarea value={stringValue} onChange={(e) => onChange(e.target.value)} rows={4}/></label>;
  }
  if (item.type === "text") {
    return <label className="assessment-field"><span>{item.prompt}</span>{item.helpText && <small>{item.helpText}</small>}<input value={stringValue} onChange={(e) => onChange(e.target.value)}/></label>;
  }
  if (item.type === "number") {
    return <label className="assessment-field"><span>{item.prompt}</span><input type="number" min={item.min} max={item.max} value={typeof value === "number" ? value : ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}/></label>;
  }
  if (item.type === "multi") {
    return <fieldset className="assessment-choice-group"><legend>{item.prompt}</legend>{item.helpText && <small>{item.helpText}</small>}<div className="assessment-options">{item.options?.map((option) => <label key={option.value} className={selected.includes(option.value) ? "assessment-option selected" : "assessment-option"}><input type="checkbox" checked={selected.includes(option.value)} onChange={(e) => onChange(e.target.checked ? [...selected, option.value] : selected.filter((v) => v !== option.value))}/><span>{option.label}</span></label>)}</div></fieldset>;
  }
  if (item.type === "likert" || item.type === "yes_no" || item.type === "single") {
    return <fieldset className="assessment-choice-group"><legend>{item.prompt}</legend>{item.helpText && <small>{item.helpText}</small>}<div className={item.type === "likert" ? "assessment-options likert" : "assessment-options"}>{item.options?.map((option) => <label key={option.value} className={String(value ?? "") === option.value ? "assessment-option selected" : "assessment-option"}><input type="radio" name={item.id} value={option.value} checked={String(value ?? "") === option.value} onChange={() => onChange(option.value)}/><span>{option.label}</span></label>)}</div></fieldset>;
  }
  return <label className="assessment-field"><span>{item.prompt}</span><textarea value={stringValue} onChange={(e) => onChange(e.target.value)} rows={4}/></label>;
}
