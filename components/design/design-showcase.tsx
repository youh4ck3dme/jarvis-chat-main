"use client"

import * as React from "react"
import {
  ArrowRight,
  Columns2,
  Download,
  Grid2x2,
  LayoutList,
  Rows2,
  Sparkles,
  Square,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button"
import { ShaderButton } from "@/components/ui/shader-button"
import { ExclusionTabs } from "@/components/ui/exclusion-tabs"
import { ViewModeToggle } from "@/components/ui/view-mode-toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 md:p-8">
      <header className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight text-card-foreground text-balance">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      </header>
      {children}
    </section>
  )
}

const TOKENS: { name: string; token: string }[] = [
  { name: "background", token: "bg-background" },
  { name: "foreground", token: "bg-foreground" },
  { name: "primary", token: "bg-primary" },
  { name: "secondary", token: "bg-secondary" },
  { name: "muted", token: "bg-muted" },
  { name: "accent", token: "bg-accent" },
  { name: "destructive", token: "bg-destructive" },
  { name: "border", token: "bg-border" },
  { name: "chart-1", token: "bg-chart-1" },
  { name: "chart-2", token: "bg-chart-2" },
  { name: "chart-3", token: "bg-chart-3" },
  { name: "chart-4", token: "bg-chart-4" },
]

export function DesignShowcase() {
  const [tab, setTab] = React.useState("overview")
  const [view, setView] = React.useState("grid")
  const [align, setAlign] = React.useState("list")

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-10 md:px-8 md:py-16">
      <header className="mb-10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5" />
          Shader Button Design System
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          A shader-driven UI kit built on OKLch and Geist
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty md:text-base">
          Every surface uses semantic OKLch tokens and the Geist type family.
          Animated shader and liquid-metal controls replace the flat button
          language across the app.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <ShaderButton size="lg">
            Get started
            <ArrowRight />
          </ShaderButton>
          <LiquidMetalButton size="lg">
            <Download />
            Download kit
          </LiquidMetalButton>
        </div>
      </header>

      <div className="mb-8">
        <ExclusionTabs
          value={tab}
          onValueChange={setTab}
          items={[
            { value: "overview", label: "Overview" },
            { value: "buttons", label: "Buttons" },
            { value: "controls", label: "Controls" },
            { value: "tokens", label: "Tokens" },
          ]}
        />
      </div>

      <div className="flex flex-col gap-6">
        <Section
          title="Shader Button"
          description="A flowing multi-stop gradient built from the chart color tokens, with a soft hover glow. Comes in a filled flow variant and an animated gradient-ring outline variant."
        >
          <div className="flex flex-wrap items-center gap-4">
            <ShaderButton>Flow</ShaderButton>
            <ShaderButton variant="outline">Outline ring</ShaderButton>
            <ShaderButton size="sm">Small</ShaderButton>
            <ShaderButton size="lg">
              Large
              <ArrowRight />
            </ShaderButton>
            <ShaderButton size="icon" aria-label="Sparkle">
              <Sparkles />
            </ShaderButton>
          </div>
        </Section>

        <Section
          title="Liquid Metal Button"
          description="An animated metallic gradient with a moving sheen highlight and inset bevel, giving a tactile brushed-metal feel while staying theme-aware."
        >
          <div className="flex flex-wrap items-center gap-4">
            <LiquidMetalButton size="sm">Small</LiquidMetalButton>
            <LiquidMetalButton>
              <Download />
              Default
            </LiquidMetalButton>
            <LiquidMetalButton size="lg">Large</LiquidMetalButton>
            <LiquidMetalButton size="icon" aria-label="Add">
              <Square />
            </LiquidMetalButton>
          </div>
        </Section>

        <Section
          title="Exclusion Tabs"
          description="A pill navigation whose active indicator uses the CSS exclusion blend mode, inverting the label beneath it for a high-contrast, screenless look."
        >
          <ExclusionTabs
            defaultValue="chat"
            items={[
              { value: "chat", label: "Chat" },
              { value: "builder", label: "Builder" },
              { value: "preview", label: "Preview" },
              { value: "settings", label: "Settings" },
            ]}
          />
        </Section>

        <Section
          title="View Mode Toggle"
          description="A compact segmented control for switching display layouts, with optional icons and a raised active state."
        >
          <div className="flex flex-wrap items-center gap-6">
            <ViewModeToggle
              value={view}
              onValueChange={setView}
              options={[
                { value: "grid", label: "Grid", icon: Grid2x2 },
                { value: "columns", label: "Split", icon: Columns2 },
                { value: "list", label: "List", icon: LayoutList },
              ]}
            />
            <ViewModeToggle
              size="sm"
              value={align}
              onValueChange={setAlign}
              options={[
                { value: "list", label: "Rows", icon: Rows2 },
                { value: "grid", label: "Grid", icon: Grid2x2 },
              ]}
            />
          </div>
        </Section>

        <Section
          title="Toggle Group"
          description="Grouped toggle buttons for multi-state selections, themed with the OKLch token set."
        >
          <ToggleGroup type="multiple" variant="outline">
            <ToggleGroupItem value="bold" aria-label="Bold">
              Bold
            </ToggleGroupItem>
            <ToggleGroupItem value="italic" aria-label="Italic">
              Italic
            </ToggleGroupItem>
            <ToggleGroupItem value="underline" aria-label="Underline">
              Underline
            </ToggleGroupItem>
          </ToggleGroup>
        </Section>

        <Section
          title="Standard Buttons"
          description="The base button variants inherit the same OKLch tokens so the system stays cohesive next to the shader controls."
        >
          <div className="flex flex-wrap items-center gap-4">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
        </Section>

        <Section
          title="Color Tokens"
          description="The full OKLch palette in the current theme. All components reference these semantic tokens rather than hard-coded colors."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {TOKENS.map((t) => (
              <div
                key={t.name}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
              >
                <span
                  className={`size-8 shrink-0 rounded-md border border-border ${t.token}`}
                />
                <span className="font-mono text-xs text-muted-foreground">
                  {t.name}
                </span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        Shader Button design system · OKLch color space · Geist typography
      </footer>
    </main>
  )
}
