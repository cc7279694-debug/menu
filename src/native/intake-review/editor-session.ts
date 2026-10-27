import { useRef } from "react";
import type { RecipeDetailsInput } from "../recipe-model";
import { createFieldBindings, type IntakeFieldBindings } from "./field-bindings";

/** UI-only review metadata. The current editable DTO stays exclusively in RecipeEditor. */
export interface IntakeEditingSession {
  readonly identity: object;
  readonly originalRecipe: RecipeDetailsInput;
  getBindings(): IntakeFieldBindings;
  rememberBindings(bindings: IntakeFieldBindings): void;
}

export function useIntakeEditingSession(identity: object | null, originalRecipe?: RecipeDetailsInput): IntakeEditingSession | null {
  const session = useRef<IntakeEditingSession | null>(null);
  if (!identity || !originalRecipe) session.current = null;
  else if (session.current?.identity !== identity) {
    let bindings = createFieldBindings(originalRecipe);
    session.current = {
      identity, originalRecipe,
      getBindings: () => bindings,
      rememberBindings: next => { bindings = next; },
    };
  }
  return session.current;
}
