import * as React from "react"

import { cn } from "@/lib/utils"

const fieldControlClass =
  "w-full min-h-[var(--okado-control-height)] rounded-[var(--okado-radius-control)] border border-[var(--okado-border-control)] bg-white px-4 py-2.5 text-sm text-[var(--okado-text-primary)] outline-none transition placeholder:text-[var(--okado-text-muted)] focus:border-aubergine focus:ring-4 focus:ring-aubergine/12 disabled:cursor-not-allowed disabled:bg-purple-haze disabled:opacity-70"

const fieldTextareaClass =
  "w-full rounded-[var(--okado-radius-control)] border border-[var(--okado-border-control)] bg-white px-4 py-3 text-sm leading-6 text-[var(--okado-text-primary)] outline-none transition placeholder:text-[var(--okado-text-muted)] focus:border-aubergine focus:ring-4 focus:ring-aubergine/12 disabled:cursor-not-allowed disabled:bg-purple-haze disabled:opacity-70"

const FieldLabel = React.forwardRef<HTMLLabelElement, React.ComponentProps<"label">>(
  function FieldLabel({ className, ...props }, ref) {
    return <label ref={ref} className={cn("block text-sm text-[var(--okado-text-primary)]", className)} {...props} />
  },
)
FieldLabel.displayName = "FieldLabel"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldControlClass, className)} {...props} />
  },
)
Input.displayName = "Input"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(fieldTextareaClass, className)} {...props} />
  },
)
Textarea.displayName = "Textarea"

const FieldSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  function FieldSelect({ className, ...props }, ref) {
    return <select ref={ref} className={cn(fieldControlClass, className)} {...props} />
  },
)
FieldSelect.displayName = "FieldSelect"

export { FieldLabel, Input, Textarea, FieldSelect, fieldControlClass, fieldTextareaClass }
