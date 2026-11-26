import type { RefObject } from 'react'

/** After a failed submit, move focus to the first field marked invalid (waits a frame for aria-invalid to render). */
export function focusFirstInvalid(form: RefObject<HTMLFormElement | null>) {
  requestAnimationFrame(() => requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()))
}
