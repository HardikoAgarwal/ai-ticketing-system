import { Toaster as Sonner, type ToasterProps } from "sonner"

import { useTheme } from "@/theme/ThemeProvider"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolved } = useTheme()
  return (
    <Sonner
      theme={resolved}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-mint-ink" />,
        info: <InfoIcon className="size-4 text-sky-ink" />,
        warning: <TriangleAlertIcon className="size-4 text-butter-ink" />,
        error: <OctagonXIcon className="size-4 text-rose-ink" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--line)",
          "--border-radius": "var(--radius-panel)",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: "cn-toast" } }}
      {...props}
    />
  )
}

export { Toaster }
