# UI Components Memory — `nodebase`

> **Purpose:** Single-source reference for any AI / developer onboarding to the `nodebase` UI codebase. Captures every component's location, purpose, exports, props, variants, dependencies, and styling conventions so a fresh agent can produce consistent, on-system code on first try.
>
> **Coverage:** All files in `src/components/ui/` (53 components across 32 files).
> **Last updated source:** Two-batch ingest of complete `src/components/ui/` directory.

---

## Table of Contents

1. [Project Snapshot](#1-project-snapshot)
2. [Universal Conventions](#2-universal-conventions)
3. [Theme Tokens](#3-theme-tokens)
4. [Component Inventory](#4-component-inventory)
   - 4.1 [Primitives & Building Blocks](#41-primitives--building-blocks)
   - 4.2 [Layout & Containers](#42-layout--containers)
   - 4.3 [Navigation](#43-navigation)
   - 4.4 [Overlays & Dialogs](#44-overlays--dialogs)
   - 4.5 [Menus & Command](#45-menus--command)
   - 4.6 [Disclosure](#46-disclosure)
   - 4.7 [Forms & Inputs](#47-forms--inputs)
   - 4.8 [Data Display](#48-data-display)
   - 4.9 [Feedback](#49-feedback)
   - 4.10 [Composition Helpers](#410-composition-helpers)
   - 4.11 [Application Shell — Sidebar](#411-application-shell--sidebar)
5. [Cross-Component Dependency Map](#5-cross-component-dependency-map)
6. [Hooks & Utilities](#6-hooks--utilities)
7. [External Library Inventory](#7-external-library-inventory)
8. [Patterns to Replicate When Adding Components](#8-patterns-to-replicate-when-adding-components)
9. [Quick Lookup — Component → Primitive](#9-quick-lookup--component--primitive)

---

## 1. Project Snapshot

| Item | Value |
|---|---|
| Project root | `/home/vishabh/myproject/nodebase` |
| UI components dir | `src/components/ui/` |
| Hooks dir (referenced) | `src/hooks/` (e.g. `use-mobile`) |
| Utilities | `src/lib/utils.ts` (exports `cn`) |
| Stack | **Next.js** (App Router; `"use client"` directives present) + **React** + **TypeScript** |
| Styling | **Tailwind CSS v4** — uses v4 syntax: `bg-(--var)`, `size-(--cell-size)`, `@container/<name>`, `[&_data-state=open]`, `has-[...]`, `peer-*`, `group-*` |
| Component system | **shadcn/ui** convention (Radix UI primitives + CVA + `cn()`) |
| Variant engine | `class-variance-authority` (`cva`, `VariantProps`) |
| Class merger | `cn` from `@/lib/utils` (clsx + tailwind-merge) |
| Polymorphism | `@radix-ui/react-slot` via `asChild` prop |
| Icons | `lucide-react` |
| Path alias | `@/*` → `src/*` |
| Theme switcher | `next-themes` (used by `Toaster`) |
| Form library | `react-hook-form` (used by `Form`) |

---

## 2. Universal Conventions

These hold across **every** file. New components must follow them.

1. **`data-slot="<kebab-name>"`** is set on every component root and on meaningful sub-parts. This is the project's primary styling/targeting hook (e.g. `[&_[data-slot=card-content]]:bg-transparent`, `*:data-[slot=select-value]:line-clamp-1`).
2. **Native props pass-through**: components type as `React.ComponentProps<typeof Primitive>` (or `<"div">`, `<"button">`, etc.) and spread `{...props}`.
3. **`className` always merged via `cn(baseClasses, className)`** so consumer overrides win.
4. **Polymorphism**: where supported, `asChild?: boolean` switches the rendered element via `<Slot>`. Always check for `asChild` before assuming HTML tag.
5. **Standard focus ring**: `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]`.
6. **Standard invalid state**: `aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40`.
7. **Standard disabled**: `disabled:pointer-events-none disabled:opacity-50`.
8. **Animation utilities** rely on `tailwindcss-animate` data-state classes: `data-[state=open]:animate-in`, `data-[state=closed]:animate-out`, `fade-in-0 / fade-out-0`, `zoom-in-95 / zoom-out-95`, `slide-in-from-{top|bottom|left|right}-2`.
9. **Dark mode** via `dark:` variant. Some inputs use `dark:bg-input/30` to reduce contrast on dark surfaces.
10. **Icon auto-sizing inside a component**: `[&_svg:not([class*='size-'])]:size-4` (or `size-3`, `size-3.5` depending on context). Icons that already have explicit `size-*` classes are left alone.
11. **`role` attributes** are set explicitly when not native (e.g. `role="group"`, `role="alert"`, `role="list"`).
12. **A11y labels**: hidden text via `<span className="sr-only">` is added to icon-only buttons (e.g. carousel arrows, dialog close, sidebar trigger).

---

## 3. Theme Tokens

Semantic CSS variables consumed via Tailwind. **Never hardcode hex/rgb in component files** — only token names. Tokens are defined in the global CSS file (not provided in the batches; live alongside the Tailwind config).

**Surface tokens:** `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`

**Brand tokens:** `primary`, `primary-foreground`, `secondary`, `secondary-foreground`

**State tokens:** `destructive`, `border`, `input`, `ring`

**Sidebar tokens (defined for the sidebar subsystem):** `sidebar`, `sidebar-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring`

**Sidebar layout vars (set at runtime by `SidebarProvider`):** `--sidebar-width` (`16rem` desktop / `18rem` mobile), `--sidebar-width-icon` (`3rem`)

**Shape vars:** `--radius` (referenced by `InputGroupAddon` via `calc(var(--radius)-5px)`)

**Sonner overrides (set on the Toaster element):** `--normal-bg: var(--popover)`, `--normal-text: var(--popover-foreground)`, `--normal-border: var(--border)`

**User-facing default style (project preference, not enforced in code):** light theme by default; avoid solid blue or solid black blocks in custom UIs built on top of these primitives.

---

## 4. Component Inventory

Each entry lists: **file**, **exports**, **underlying primitive**, **purpose**, **notable props/variants**, and **gotchas** where they exist.

### 4.1 Primitives & Building Blocks

#### `Button` — `src/components/ui/button.tsx`

- **Exports:** `Button`, `buttonVariants`
- **Element:** native `<button>` or `<Slot>` (when `asChild`)
- Variants (`variant`): `default` (primary), `destructive`, `outline`, `secondary`, `ghost`, `link`
- Sizes (`size`): `default` (h-9), `sm` (h-8), `lg` (h-10), `icon` (size-9), `icon-sm` (size-8), `icon-lg` (size-10)
- Auto-handles SVG sizing and adjusts padding when SVG is the only child (`has-[>svg]:px-3`).
- `buttonVariants(...)` is exported and reused by `AlertDialogAction`, `AlertDialogCancel`, `PaginationLink`.

#### `Badge` — `src/components/ui/badge.tsx`

- **Exports:** `Badge`, `badgeVariants`
- Element: `<span>` or `<Slot>` (`asChild`)
- Variants: `default`, `secondary`, `destructive`, `outline`
- `[a&]:hover:bg-primary/90` — hover styles only kick in when rendered as anchor.

#### `Avatar` — `src/components/ui/avatar.tsx`

- **Exports:** `Avatar`, `AvatarImage`, `AvatarFallback`
- Primitive: `@radix-ui/react-avatar`
- Default `size-8`, circular. `AvatarFallback` uses `bg-muted`.

#### `AspectRatio` — `src/components/ui/aspect-ratio.tsx`

- **Exports:** `AspectRatio`
- Primitive: `@radix-ui/react-aspect-ratio` (pass-through; supply `ratio` prop, e.g. `16/9`).

#### `Checkbox` — `src/components/ui/checkbox.tsx`

- **Exports:** `Checkbox`
- Primitive: `@radix-ui/react-checkbox`
- Default size: `size-4`, `rounded-[4px]`. Indicator: lucide `CheckIcon` size-3.5.

#### `Label` — `src/components/ui/label.tsx`

- **Exports:** `Label`
- Primitive: `@radix-ui/react-label`
- Auto-disables when wrapping a `peer-disabled` or `group-data-[disabled=true]` input.

#### `Separator` — `src/components/ui/separator.tsx`

- **Exports:** `Separator`
- Primitive: `@radix-ui/react-separator`
- Defaults: `orientation="horizontal"`, `decorative={true}`. Uses `data-orientation` to switch between `h-px w-full` and `h-full w-px`.
- Reused by: `ButtonGroupSeparator`, `FieldSeparator`, `ItemSeparator`, `SidebarSeparator`.

#### `Skeleton` — `src/components/ui/skeleton.tsx`

- **Exports:** `Skeleton`
- Element: plain `<div>` with `bg-accent animate-pulse rounded-md`.
- Reused by: `SidebarMenuSkeleton`.

#### `Spinner` — `src/components/ui/spinner.tsx`

- **Exports:** `Spinner`
- Element: lucide `Loader2Icon` with `role="status"` and `aria-label="Loading"`. Default `size-4 animate-spin`.

#### `Kbd` — `src/components/ui/kbd.tsx`

- **Exports:** `Kbd`, `KbdGroup`
- Element: native `<kbd>`. `bg-muted text-muted-foreground`, height `h-5`, `select-none`.
- Has special inverted styling when nested inside a `[data-slot=tooltip-content]` (so the keycap stays readable on the dark tooltip background).

---

### 4.2 Layout & Containers

#### `Card` — `src/components/ui/card.tsx`

- **Exports:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`
- `Card`: outer `flex-col gap-6 rounded-xl border py-6 shadow-sm bg-card`.
- `CardHeader`: grid; auto-creates a 2-col layout when a `CardAction` child is present (`has-data-[slot=card-action]:grid-cols-[1fr_auto]`); uses `@container/card-header` for nested container queries.
- `CardAction`: top-right slot (col-start-2, row-span-2).
- `CardContent` / `CardFooter`: `px-6` padding; footer auto-pads-top when inside `[.border-t]`.

#### `Empty` — `src/components/ui/empty.tsx`

- **Exports:** `Empty`, `EmptyHeader`, `EmptyTitle`, `EmptyDescription`, `EmptyContent`, `EmptyMedia`
- Empty-state placeholder block (dashed border, centered content).
- `EmptyMedia` variants: `default` (transparent), `icon` (size-10 muted square with auto-sized SVG).

#### `Item` family — `src/components/ui/item.tsx`

- **Exports:** `Item`, `ItemMedia`, `ItemContent`, `ItemActions`, `ItemGroup`, `ItemSeparator`, `ItemTitle`, `ItemDescription`, `ItemHeader`, `ItemFooter`
- General-purpose row/list-item layout (richer than a plain list row; thinner than a Card).
- `Item` variants: `variant: default | outline | muted`, `size: default | sm`. Supports `asChild`.
- `ItemMedia` variants: `default` (transparent), `icon` (size-8 bordered tile), `image` (size-10 with overflow-hidden, auto object-cover for `<img>`).
- `ItemContent` is `flex-1 flex-col gap-1`; second consecutive `ItemContent` becomes `flex-none`.
- `ItemHeader` / `ItemFooter` span the full row width (`basis-full`).
- `ItemSeparator` wraps `Separator` with `my-0`.

---

### 4.3 Navigation

#### `Breadcrumb` — `src/components/ui/breadcrumb.tsx`

- **Exports:** `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`, `BreadcrumbEllipsis`
- Semantic `<nav aria-label="breadcrumb"> > <ol> > <li>`.
- Default separator: lucide `ChevronRight`. Ellipsis: `MoreHorizontal`.
- `BreadcrumbLink` supports `asChild` for use with framework `<Link>` components.

#### `NavigationMenu` — `src/components/ui/navigation-menu.tsx`

- **Exports:** `NavigationMenu`, `NavigationMenuList`, `NavigationMenuItem`, `NavigationMenuContent`, `NavigationMenuTrigger`, `NavigationMenuLink`, `NavigationMenuIndicator`, `NavigationMenuViewport`, `navigationMenuTriggerStyle`
- Primitive: `@radix-ui/react-navigation-menu`
- `NavigationMenu` props: `viewport?: boolean` (default `true`). Switches between two layout modes via `data-viewport`:
  - `viewport=true`: content renders inside the centered `<NavigationMenuViewport>` (single panel that morphs).
  - `viewport=false`: each item gets its own popover-style content (uses `group-data-[viewport=false]/navigation-menu:*` selectors).
- `navigationMenuTriggerStyle()` is exported for reuse on standalone links that should look like a triggerless menu item.
- Trigger appends a `ChevronDownIcon` that rotates 180° when open.
- `NavigationMenuLink` highlights active state via `data-[active=true]`.

#### `Pagination` — `src/components/ui/pagination.tsx`

- **Exports:** `Pagination`, `PaginationContent`, `PaginationLink`, `PaginationItem`, `PaginationPrevious`, `PaginationNext`, `PaginationEllipsis`
- Plain semantic markup (`<nav> > <ul> > <li>`), no headless primitive.
- `PaginationLink` props: `isActive?: boolean`, `size?: Button["size"]` (default `"icon"`); applies `buttonVariants({ variant: isActive ? "outline" : "ghost", size })`.
- `PaginationPrevious` / `PaginationNext`: `size="default"`, hides label below `sm` breakpoint.

#### `Menubar` — `src/components/ui/menubar.tsx`

- **Exports:** `Menubar`, `MenubarPortal`, `MenubarMenu`, `MenubarTrigger`, `MenubarContent`, `MenubarGroup`, `MenubarSeparator`, `MenubarLabel`, `MenubarItem`, `MenubarShortcut`, `MenubarCheckboxItem`, `MenubarRadioGroup`, `MenubarRadioItem`, `MenubarSub`, `MenubarSubTrigger`, `MenubarSubContent`
- Primitive: `@radix-ui/react-menubar`
- Top-level `<Menubar>` is a horizontal bar (`bg-background flex h-9 items-center gap-1 rounded-md border p-1 shadow-xs`) containing several `<MenubarMenu>` dropdowns.
- `MenubarItem` extra props: `inset?: boolean`, `variant?: "default" | "destructive"` (mirrors `DropdownMenuItem`).
- `MenubarContent` defaults: `align="start"`, `alignOffset={-4}`, `sideOffset={8}`.

---

### 4.4 Overlays & Dialogs

#### `Dialog` — `src/components/ui/dialog.tsx`

- **Exports:** `Dialog`, `DialogClose`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogOverlay`, `DialogPortal`, `DialogTitle`, `DialogTrigger`
- Primitive: `@radix-ui/react-dialog`
- `DialogContent` extra prop: `showCloseButton?: boolean` (default `true`) — top-right `XIcon`.
- Centered modal: `fixed top-[50%] left-[50%]`, `max-w-lg`, `rounded-lg`. Overlay: `bg-black/50`.

#### `AlertDialog` — `src/components/ui/alert-dialog.tsx`

- **Exports:** `AlertDialog`, `AlertDialogPortal`, `AlertDialogOverlay`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel`
- Primitive: `@radix-ui/react-alert-dialog`
- Action uses `buttonVariants()` (primary), Cancel uses `buttonVariants({ variant: "outline" })`.
- No close X button; non-dismissible by overlay click — this is the difference from `Dialog`.

#### `Drawer` — `src/components/ui/drawer.tsx`

- **Exports:** `Drawer`, `DrawerPortal`, `DrawerOverlay`, `DrawerTrigger`, `DrawerClose`, `DrawerContent`, `DrawerHeader`, `DrawerFooter`, `DrawerTitle`, `DrawerDescription`
- Primitive: `vaul`
- Direction-aware: `data-[vaul-drawer-direction=top|bottom|left|right]` switches positioning, max width/height, border side, and rounded corners.
- Drag handle pill is auto-shown only on `bottom` direction.

#### `Sheet` — `src/components/ui/sheet.tsx`

- **Exports:** `Sheet`, `SheetTrigger`, `SheetClose`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`
- Primitive: `@radix-ui/react-dialog` (re-aliased as `SheetPrimitive`)
- `SheetContent` extra prop: `side?: "top" | "right" | "bottom" | "left"` (default `"right"`).
- Width on left/right: `w-3/4 sm:max-w-sm`. Height on top/bottom: `h-auto`.
- Built-in close X button (top-right). Reused internally by `Sidebar` for mobile mode.

#### `Popover` — `src/components/ui/popover.tsx`

- **Exports:** `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor`
- Primitive: `@radix-ui/react-popover`
- `PopoverContent` defaults: `align="center"`, `sideOffset={4}`, `w-72`, `p-4`, `rounded-md border shadow-md`.

#### `HoverCard` — `src/components/ui/hover-card.tsx`

- **Exports:** `HoverCard`, `HoverCardTrigger`, `HoverCardContent`
- Primitive: `@radix-ui/react-hover-card`
- `HoverCardContent` defaults: `align="center"`, `sideOffset={4}`, `w-64`, `p-4`.

#### `Tooltip` — `src/components/ui/tooltip.tsx`

- **Exports:** `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`
- Primitive: `@radix-ui/react-tooltip`
- `TooltipProvider` default `delayDuration={0}`.
- **Important:** The exported `Tooltip` wraps itself in a `TooltipProvider`, so it works standalone — but if you have a global provider (as `SidebarProvider` does), you can use `TooltipPrimitive.Root` patterns directly.
- `TooltipContent` uses **inverted color scheme** (`bg-foreground text-background`) — this is the only overlay that does this — and renders an `Arrow`. `Kbd` has a special override for this surface.

---

### 4.5 Menus & Command

#### `DropdownMenu` — `src/components/ui/dropdown-menu.tsx`

- **Exports:** `DropdownMenu`, `DropdownMenuPortal`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuGroup`, `DropdownMenuLabel`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`
- Primitive: `@radix-ui/react-dropdown-menu`
- `DropdownMenuItem` extras: `inset?: boolean`, `variant?: "default" | "destructive"`.
- Default `sideOffset={4}`.

#### `ContextMenu` — `src/components/ui/context-menu.tsx`

- **Exports:** `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`, `ContextMenuItem`, `ContextMenuCheckboxItem`, `ContextMenuRadioItem`, `ContextMenuLabel`, `ContextMenuSeparator`, `ContextMenuShortcut`, `ContextMenuGroup`, `ContextMenuPortal`, `ContextMenuSub`, `ContextMenuSubContent`, `ContextMenuSubTrigger`, `ContextMenuRadioGroup`
- Primitive: `@radix-ui/react-context-menu`
- API mirrors `DropdownMenu` (same `inset`, `variant` props on items).

#### `Command` — `src/components/ui/command.tsx`

- **Exports:** `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandShortcut`, `CommandSeparator`
- Primitive: `cmdk`
- `CommandDialog` props: `title`, `description` (sr-only for a11y), `showCloseButton`, `className` — wraps `Command` inside a `Dialog`.
- `CommandInput` is auto-prefixed with lucide `SearchIcon`.

---

### 4.6 Disclosure

#### `Accordion` — `src/components/ui/accordion.tsx`

- **Exports:** `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`
- Primitive: `@radix-ui/react-accordion`
- Trigger auto-rotates a `ChevronDownIcon` 180° on open.
- Animations rely on custom keyframes `accordion-up` / `accordion-down` (must be defined in tailwind config).

#### `Collapsible` — `src/components/ui/collapsible.tsx`

- **Exports:** `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`
- Primitive: `@radix-ui/react-collapsible` — pass-through wrappers, no extra styling. Use as headless primitive.

---

### 4.7 Forms & Inputs

#### `Input` — `src/components/ui/input.tsx`

- **Exports:** `Input`
- Element: native `<input>`. `h-9 w-full rounded-md border bg-transparent px-3 py-1`.
- Standard focus + invalid + disabled treatments. `dark:bg-input/30`. `text-base md:text-sm` (text-base on mobile to avoid iOS zoom-on-focus).
- Reused by `InputGroupInput`, `SidebarInput`.

#### `Textarea` — `src/components/ui/textarea.tsx`

- **Exports:** `Textarea`
- Element: native `<textarea>`. `min-h-16`, `field-sizing-content` (Tailwind v4 utility for auto-grow), `dark:bg-input/30`.
- Reused by `InputGroupTextarea`.

#### `Label` — see [§4.1](#41-primitives--building-blocks)

#### `RadioGroup` — `src/components/ui/radio-group.tsx`

- **Exports:** `RadioGroup`, `RadioGroupItem`
- Primitive: `@radix-ui/react-radio-group`
- Default container: `grid gap-3`.
- Item is `size-4 rounded-full border`; indicator is a centered `CircleIcon` (`size-2 fill-primary`).

#### `Checkbox` — see [§4.1](#41-primitives--building-blocks)

#### `Switch` — `src/components/ui/switch.tsx`

- **Exports:** `Switch`
- Primitive: `@radix-ui/react-switch`
- Track: `h-[1.15rem] w-8`, `rounded-full`. Thumb: `size-4`, slides via `translate-x-[calc(100%-2px)]`.
- Light vs dark color tweaks for both states are explicitly handled.

#### `Slider` — `src/components/ui/slider.tsx`

- **Exports:** `Slider`
- Primitive: `@radix-ui/react-slider`
- Renders one `Thumb` per value (works for single-value AND range — counts `value`/`defaultValue` to know how many thumbs).
- Track: `h-1.5` (horizontal) / `w-1.5` (vertical). Range: `bg-primary`. Vertical orientation supported via `data-[orientation=vertical]`.
- Thumb: `size-4 rounded-full border-primary bg-white`. **Note:** thumb uses literal `bg-white` (the only place outside Sonner overrides where a non-token color appears).

#### `Toggle` — `src/components/ui/toggle.tsx`

- **Exports:** `Toggle`, `toggleVariants`
- Primitive: `@radix-ui/react-toggle`
- Variants: `default` (transparent), `outline` (bordered).
- Sizes: `default` (h-9 px-2 min-w-9), `sm` (h-8), `lg` (h-10).
- Active state via `data-[state=on]:bg-accent data-[state=on]:text-accent-foreground`.

#### `ToggleGroup` — `src/components/ui/toggle-group.tsx`

- **Exports:** `ToggleGroup`, `ToggleGroupItem`
- Primitive: `@radix-ui/react-toggle-group`
- Inherits `variant` and `size` from `Toggle` via `toggleVariants` and propagates them to children through a context (`ToggleGroupContext`).
- Items fuse: `first:rounded-l-md last:rounded-r-md`, with outline variant border-collapse handling.

#### `InputOTP` — `src/components/ui/input-otp.tsx`

- **Exports:** `InputOTP`, `InputOTPGroup`, `InputOTPSlot`, `InputOTPSeparator`
- Primitive: `input-otp` (`OTPInput`, `OTPInputContext`)
- `InputOTPSlot` props: `index: number` — pulls per-slot state (`char`, `hasFakeCaret`, `isActive`) from `OTPInputContext`. Each slot is `h-9 w-9`. Active slot gets a focus ring.
- `InputOTPSeparator`: a `MinusIcon` with `role="separator"`.
- Caret animation uses class `animate-caret-blink` (must be defined in tailwind config).

#### `InputGroup` — `src/components/ui/input-group.tsx`

- **Exports:** `InputGroup`, `InputGroupAddon`, `InputGroupButton`, `InputGroupText`, `InputGroupInput`, `InputGroupTextarea`
- Composable input shell that wraps inputs/textareas with prefix/suffix/top/bottom addons.
- `InputGroupAddon` variants (`align`): `inline-start` (default), `inline-end`, `block-start`, `block-end`. Block variants flip the group to `flex-col`.
- Clicking an addon (when not clicking a button inside it) auto-focuses the inner `<input>`.
- `InputGroupButton`: thin wrapper around `Button` with custom sizes `xs` (h-6), `sm` (h-8), `icon-xs` (size-6), `icon-sm` (size-8). Default `variant="ghost"`, `type="button"`, `size="xs"`.
- `InputGroupInput` / `InputGroupTextarea`: pre-styled `Input` / `Textarea` with `border-0 bg-transparent shadow-none focus-visible:ring-0` so the outer group owns focus styling. Both carry `data-slot="input-group-control"` so the wrapper's `has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50` selector lights the whole group on focus.

#### `Field` family — `src/components/ui/field.tsx`

- **Exports:** `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldLegend`, `FieldSeparator`, `FieldSet`, `FieldContent`, `FieldTitle`
- Composable form-field layout system (label + control + description + error). **Layout-only** — does not provide form state; pair with `Form` (react-hook-form) below.
- `FieldSet` = `<fieldset>` flex column.
- `FieldLegend`: `<legend>` with `variant: "legend" | "label"` (different sizes).
- `FieldGroup`: provides `@container/field-group` for responsive nesting.
- `Field` orientation variants: `vertical` (default), `horizontal`, `responsive` (vertical → horizontal at `@md`). Sets `data-orientation` for child styling hooks.
- `FieldLabel` wraps `Label`. When it wraps a nested `[data-slot=field]` (e.g. a card-style radio choice), it auto-styles to a selectable card and highlights when its inner control is checked: `has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary`.
- `FieldTitle`: div-based label (when `<label>` semantics aren't appropriate).
- `FieldContent`: stacked container for label+description.
- `FieldDescription`: `text-muted-foreground text-sm`, supports inline links (`[&>a]:underline`).
- `FieldSeparator`: horizontal rule with optional centered text content.
- `FieldError`: takes `errors?: Array<{message?: string} | undefined>` OR `children`. Single error → renders message; multiple → bulleted list. `role="alert"`, `text-destructive`. Returns `null` if no content.

#### `Form` — `src/components/ui/form.tsx`

- **Exports:** `useFormField`, `Form`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`, `FormField`
- Primitive: `react-hook-form` (`Controller`, `FormProvider`, `useFormContext`, `useFormState`)
- `Form` = re-export of `FormProvider`.
- `FormField`: typed wrapper around `<Controller>`; pushes `name` into `FormFieldContext`.
- `FormItem`: generates a unique `useId()` and provides it via `FormItemContext`. Default layout: `grid gap-2`.
- `useFormField()` hook returns `{ id, name, formItemId, formDescriptionId, formMessageId, ...fieldState }`. **Throws** if used outside a `<FormField>`.
- `FormLabel`: wraps `Label`; sets `htmlFor={formItemId}`; gets `data-error` and turns red on error.
- `FormControl`: a `<Slot>` that wires `id`, `aria-describedby` (description + message ids), and `aria-invalid` automatically onto the child input.
- `FormDescription`: `<p>` with `id={formDescriptionId}`, muted text.
- `FormMessage`: `<p>` with `id={formMessageId}`, destructive color. Auto-renders `error.message` when present, otherwise `children`. Returns `null` if empty.
- **Composition pattern:** `FormField` → `FormItem` → `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`.

---

### 4.8 Data Display

#### `Calendar` — `src/components/ui/calendar.tsx`

- **Exports:** `Calendar`, `CalendarDayButton`
- Primitive: `react-day-picker` (`DayPicker`)
- Extra prop: `buttonVariant?` (controls nav arrow variant; default `"ghost"`).
- CSS variable `--cell-size` set to `--spacing(8)`. Supports `captionLayout: "label" | "dropdown"`.
- `CalendarDayButton` uses `Button` (variant `ghost`, size `icon`); manages selected/range state via `data-selected-single`, `data-range-start/middle/end`.
- Auto-focuses the day when `modifiers.focused` is true.
- Uses `bg-transparent` for the calendar background when nested inside a `Card` or `Popover` (`[[data-slot=card-content]_&]:bg-transparent`, `[[data-slot=popover-content]_&]:bg-transparent`).

#### `Carousel` — `src/components/ui/carousel.tsx`

- **Exports:** `type CarouselApi`, `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext`
- Primitive: `embla-carousel-react`
- `Carousel` props: `opts?`, `plugins?`, `orientation?: "horizontal" | "vertical"`, `setApi?: (api) => void`.
- Context exposes: `carouselRef`, `api`, `scrollPrev`, `scrollNext`, `canScrollPrev`, `canScrollNext`, `orientation`.
- Keyboard: ArrowLeft/ArrowRight handled at container.
- Buttons absolutely positioned (`-left-12` / `-right-12` for horizontal; `-top-12` / `-bottom-12` for vertical with `rotate-90`).
- Hook `useCarousel()` errors if used outside `<Carousel>`.

#### `Chart` — `src/components/ui/chart.tsx`

- **Exports:** `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`, `ChartStyle`; type `ChartConfig`
- Primitive: `recharts`
- `ChartConfig` shape: `{ [key]: { label?, icon?, color? | theme: { light, dark } } }`.
- `ChartContainer` provides config via `ChartContext`, renders `ResponsiveContainer`, and injects per-chart CSS vars (`--color-<key>`) via a `<ChartStyle>` block for both light and `.dark` selectors. Auto-themes recharts internals (axis ticks → `muted-foreground`, grid lines → `border/50`, etc.).
- `ChartTooltipContent` props: `indicator: "line" | "dot" | "dashed"`, `hideLabel`, `hideIndicator`, `nameKey`, `labelKey`, `formatter`, `labelFormatter`.
- `ChartLegendContent` props: `hideIcon`, `verticalAlign`, `nameKey`.
- Hook `useChart()` errors if used outside `<ChartContainer>`.
- Helper: `getPayloadConfigFromPayload(config, payload, key)` resolves a config entry from a recharts payload object.

#### `Table` — `src/components/ui/table.tsx`

- **Exports:** `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`
- `Table` is wrapped in a `<div data-slot="table-container" class="relative w-full overflow-x-auto">` for horizontal scroll on small screens.
- Standard semantic tags: `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `caption`.
- Row hover: `hover:bg-muted/50`. Selected row: `data-[state=selected]:bg-muted`.
- Cells with a `[role=checkbox]` get `pr-0` and a `translate-y-[2px]` nudge on the checkbox for vertical centering.

#### `Tabs` — `src/components/ui/tabs.tsx`

- **Exports:** `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- Primitive: `@radix-ui/react-tabs`
- `TabsList`: `bg-muted` pill (h-9, rounded-lg, p-[3px]).
- `TabsTrigger` active state: `data-[state=active]:bg-background` + shadow (light); dark mode uses `dark:data-[state=active]:bg-input/30 dark:data-[state=active]:border-input`.

---

### 4.9 Feedback

#### `Progress` — `src/components/ui/progress.tsx`

- **Exports:** `Progress`
- Primitive: `@radix-ui/react-progress`
- Track: `h-2 w-full bg-primary/20 rounded-full`. Indicator: `bg-primary`, animates via `transform: translateX(-${100 - value}%)`.

#### `Skeleton` — see [§4.1](#41-primitives--building-blocks)

#### `Spinner` — see [§4.1](#41-primitives--building-blocks)

#### `Toaster` (Sonner) — `src/components/ui/sonner.tsx`

- **Exports:** `Toaster`
- Primitive: `sonner` (`Toaster as Sonner`)
- Reads theme via `next-themes` `useTheme()` (default `"system"`) and forwards as `theme` prop to Sonner.
- Sets Sonner CSS vars to project tokens: `--normal-bg: var(--popover)`, `--normal-text: var(--popover-foreground)`, `--normal-border: var(--border)`. Mount this once at the app root layout.

#### `Alert` — `src/components/ui/alert.tsx`

- **Exports:** `Alert`, `AlertTitle`, `AlertDescription`
- Element: native `<div role="alert">`.
- Variants: `default` (uses `bg-card text-card-foreground`), `destructive` (uses `text-destructive bg-card`).
- Grid layout adapts based on whether an SVG icon is present (`has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr]`).

---

### 4.10 Composition Helpers

#### `ButtonGroup` — `src/components/ui/button-group.tsx`

- **Exports:** `ButtonGroup`, `ButtonGroupSeparator`, `ButtonGroupText`, `buttonGroupVariants`
- Variants (`orientation`): `horizontal` (default), `vertical` — strips inner borders/radius so buttons fuse.
- `ButtonGroupText`: label-style segment (`bg-muted`, bordered). `asChild` supported.
- `ButtonGroupSeparator`: wraps `Separator`, defaults to vertical, uses `bg-input`.
- Smart selectors: handles nested `Select` triggers (`select-trigger`), inputs (`flex-1`), and nested `ButtonGroup`s (`gap-2`).

---

### 4.11 Application Shell — Sidebar

#### `Sidebar` system — `src/components/ui/sidebar.tsx`

This is the largest component in the codebase — a full collapsible sidebar app shell with mobile/desktop split, cookie-persisted state, keyboard shortcut, and a tree of menu primitives.

**Exports (24 total):**
`Sidebar`, `SidebarContent`, `SidebarFooter`, `SidebarGroup`, `SidebarGroupAction`, `SidebarGroupContent`, `SidebarGroupLabel`, `SidebarHeader`, `SidebarInput`, `SidebarInset`, `SidebarMenu`, `SidebarMenuAction`, `SidebarMenuBadge`, `SidebarMenuButton`, `SidebarMenuItem`, `SidebarMenuSkeleton`, `SidebarMenuSub`, `SidebarMenuSubButton`, `SidebarMenuSubItem`, `SidebarProvider`, `SidebarRail`, `SidebarSeparator`, `SidebarTrigger`, `useSidebar`

**Constants:**

- `SIDEBAR_COOKIE_NAME = "sidebar_state"` — open/closed persisted across reloads.
- `SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7` (7 days).
- `SIDEBAR_WIDTH = "16rem"` (desktop), `SIDEBAR_WIDTH_MOBILE = "18rem"`, `SIDEBAR_WIDTH_ICON = "3rem"`.
- `SIDEBAR_KEYBOARD_SHORTCUT = "b"` — toggles via Cmd/Ctrl + B.

**Context (`useSidebar()`):** `{ state: "expanded" | "collapsed", open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar }`. Throws if called outside `<SidebarProvider>`.

**`SidebarProvider`:**

- Props: `defaultOpen?` (default `true`), `open?`, `onOpenChange?` (controlled mode), plus standard div props.
- Sets CSS vars `--sidebar-width` and `--sidebar-width-icon` on a wrapper div.
- Mounts a `TooltipProvider` (with `delayDuration={0}`) at the root so `SidebarMenuButton` tooltips work in collapsed state.
- Listens for `Cmd/Ctrl+B` to toggle; persists open state to `document.cookie`.

**`Sidebar`:** Three rendering branches based on context:

1. **`collapsible="none"`** → simple fixed-width column, no collapse logic.
2. **`isMobile === true`** → renders inside a `<Sheet>` (using `SheetContent` with hidden close button).
3. **Desktop (default)** → fixed-position sidebar with a transparent gap div for layout, supporting:
   - `side`: `"left"` | `"right"` (default `"left"`)
   - `variant`: `"sidebar"` | `"floating"` | `"inset"` (default `"sidebar"`) — floating gets rounded-lg + border + shadow; inset adds margins so the main content appears framed.
   - `collapsible`: `"offcanvas"` | `"icon"` | `"none"` (default `"offcanvas"`) — offcanvas slides fully off; icon collapses to icon-strip width.

**Layout primitives:**

- `SidebarInset`: `<main>` for the page content next to the sidebar. Auto-margins/rounding when paired with `variant="inset"` sidebar.
- `SidebarTrigger`: `Button` (ghost/icon, size-7) with `PanelLeftIcon`; calls `toggleSidebar()`.
- `SidebarRail`: invisible 4px-wide button along the sidebar edge that toggles on click; cursor changes to `cursor-w-resize`/`cursor-e-resize` based on side and state.
- `SidebarInput`: `Input` styled for the sidebar (`bg-background h-8 w-full shadow-none`).
- `SidebarHeader`, `SidebarFooter`: `flex flex-col gap-2 p-2`.
- `SidebarSeparator`: `Separator` with `bg-sidebar-border mx-2 w-auto`.
- `SidebarContent`: `flex min-h-0 flex-1 flex-col gap-2 overflow-auto`; hides overflow when collapsible is `icon`.

**Group primitives:**

- `SidebarGroup`: section wrapper.
- `SidebarGroupLabel`: small uppercase-ish label; auto-hides when sidebar is icon-collapsed (`group-data-[collapsible=icon]:opacity-0`). Supports `asChild`.
- `SidebarGroupAction`: small absolutely-positioned button (top-right) for group-level actions; auto-hidden in icon mode.
- `SidebarGroupContent`: `w-full text-sm` container.

**Menu primitives:**

- `SidebarMenu`: `<ul>` flex column.
- `SidebarMenuItem`: `<li>` with `group/menu-item` class for hover-revealed actions.
- `SidebarMenuButton` — the workhorse menu row:
  - Variants: `default`, `outline` (gets a 1px shadow ring instead of a border).
  - Sizes: `default` (h-8), `sm` (h-7), `lg` (h-12).
  - Extra props: `asChild`, `isActive` (sets `data-[active=true]` styling), `tooltip` (string or `TooltipContent` props — auto-shows tooltip when sidebar is collapsed and not on mobile).
  - Active: `bg-sidebar-accent text-sidebar-accent-foreground font-medium`.
  - Auto-collapses to a square (`size-8`) in icon-collapsible mode.
- `SidebarMenuAction`: small absolutely-positioned action button on a menu item (top-right). Position adjusts based on sibling button's size via `peer-data-[size=sm|default|lg]/menu-button:top-*`. Optional `showOnHover` keeps it hidden until hover/focus on desktop.
- `SidebarMenuBadge`: small right-aligned badge (e.g. unread count).
- `SidebarMenuSkeleton`: loading row using `Skeleton` with random width (50–90%).
- `SidebarMenuSub` / `SidebarMenuSubItem` / `SidebarMenuSubButton`: nested sub-menu (a `<ul>` indented with a left border `border-sidebar-border`). `SidebarMenuSubButton` accepts `size: "sm" | "md"` and `isActive`. Hidden in icon-collapsed mode.

**Required dependencies:** `@/hooks/use-mobile` (provides `useIsMobile()`), `Sheet`, `Skeleton`, `Tooltip`, `Button`, `Input`, `Separator`.

---

## 5. Cross-Component Dependency Map

```
Button ─────────────┬─── AlertDialog (Action / Cancel use buttonVariants)
                    ├─── Calendar (nav arrows + day buttons)
                    ├─── Carousel (Previous / Next)
                    ├─── Pagination (PaginationLink uses buttonVariants)
                    ├─── InputGroup (InputGroupButton)
                    └─── Sidebar (SidebarTrigger)

Input ──────────────┬─── InputGroup (InputGroupInput)
                    └─── Sidebar (SidebarInput)

Textarea ───────────┴─── InputGroup (InputGroupTextarea)

Label ──────────────┬─── Field (FieldLabel extends Label)
                    └─── Form (FormLabel wraps Label)

Separator ──────────┬─── ButtonGroup (ButtonGroupSeparator)
                    ├─── Field (FieldSeparator)
                    ├─── Item (ItemSeparator)
                    └─── Sidebar (SidebarSeparator)

Skeleton ───────────┴─── Sidebar (SidebarMenuSkeleton)

Sheet ──────────────┴─── Sidebar (mobile rendering)

Tooltip ────────────┴─── Sidebar (collapsed-state menu tooltips +
                                   global TooltipProvider in SidebarProvider)

Dialog ─────────────┴─── Command (CommandDialog wraps Command in Dialog)

Toggle (toggleVariants) ── ToggleGroup (items inherit variant/size)
```

---

## 6. Hooks & Utilities

### `cn` — `src/lib/utils.ts` (referenced everywhere)

Class-name merger; idiomatic shadcn implementation = `clsx(inputs) → twMerge(...)`. Used in every single component.

### `useIsMobile` — `src/hooks/use-mobile.ts` (referenced by `Sidebar`)

Returns boolean; powers responsive logic in `SidebarProvider` and `Sidebar`. Implementation file not provided in the batches.

### Component-internal hooks

- `useFormField()` — exported from `form.tsx`. Pulls `name` + `id` from contexts and merges with RHF `getFieldState`/`useFormState`. Use only inside a `<FormField>`.
- `useChart()` — exported from `chart.tsx`. Returns `{ config }`. Use only inside `<ChartContainer>`.
- `useCarousel()` — exported from `carousel.tsx`. Returns embla-driven controls. Use only inside `<Carousel>`.
- `useSidebar()` — exported from `sidebar.tsx`. Returns sidebar state/setters. Use only inside `<SidebarProvider>`.

All four hooks **throw** with a clear error message when used outside their provider — keep that pattern when adding new context-backed hooks.

---

## 7. External Library Inventory

| Library | Used by |
|---|---|
| `@radix-ui/react-accordion` | Accordion |
| `@radix-ui/react-alert-dialog` | AlertDialog |
| `@radix-ui/react-aspect-ratio` | AspectRatio |
| `@radix-ui/react-avatar` | Avatar |
| `@radix-ui/react-checkbox` | Checkbox |
| `@radix-ui/react-collapsible` | Collapsible |
| `@radix-ui/react-context-menu` | ContextMenu |
| `@radix-ui/react-dialog` | Dialog, Sheet |
| `@radix-ui/react-dropdown-menu` | DropdownMenu |
| `@radix-ui/react-hover-card` | HoverCard |
| `@radix-ui/react-label` | Label, Form |
| `@radix-ui/react-menubar` | Menubar |
| `@radix-ui/react-navigation-menu` | NavigationMenu |
| `@radix-ui/react-popover` | Popover |
| `@radix-ui/react-progress` | Progress |
| `@radix-ui/react-radio-group` | RadioGroup |
| `@radix-ui/react-scroll-area` | ScrollArea |
| `@radix-ui/react-select` | Select |
| `@radix-ui/react-separator` | Separator |
| `@radix-ui/react-slider` | Slider |
| `@radix-ui/react-slot` | Button, Badge, Breadcrumb, ButtonGroup, Item, Sidebar, Form (FormControl) |
| `@radix-ui/react-switch` | Switch |
| `@radix-ui/react-tabs` | Tabs |
| `@radix-ui/react-toggle` | Toggle |
| `@radix-ui/react-toggle-group` | ToggleGroup |
| `@radix-ui/react-tooltip` | Tooltip |
| `class-variance-authority` | All `*Variants` definitions |
| `cmdk` | Command |
| `embla-carousel-react` | Carousel |
| `input-otp` | InputOTP |
| `lucide-react` | All icon usage |
| `next-themes` | Toaster (Sonner) |
| `react-day-picker` | Calendar |
| `react-hook-form` | Form |
| `react-resizable-panels` | Resizable |
| `recharts` | Chart |
| `sonner` | Toaster |
| `vaul` | Drawer |

---

## 8. Patterns to Replicate When Adding Components

1. Add `"use client"` only when the component uses React state, refs, effects, context, or browser APIs. (Pure markup wrappers like `Input`, `Card`, `Pagination`, `Table`, `Skeleton`, `Spinner`, `Kbd`, `Empty`, `Alert`, `Breadcrumb`, `Item`, `Field` non-hook parts, `Label` are fine without it — match precedent.)
2. Wrap a Radix (or other headless) primitive whenever one exists — don't reinvent a11y.
3. Type props as `React.ComponentProps<typeof Primitive>` (or `<"div">` etc. for native).
4. Apply `data-slot="<n>"` on the root and on meaningful sub-parts.
5. Accept `className`, merge with `cn(baseClasses, className)`.
6. Use `cva` for any multi-variant component; export the `*Variants` function alongside.
7. Use semantic theme tokens (`bg-card`, `text-muted-foreground`, `bg-sidebar-accent`) — **never hardcode hex/rgb**. The only literal color in current code is `bg-white` on the `Slider` thumb.
8. Standard focus ring: `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]`.
9. Standard invalid: `aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40`.
10. Standard disabled: `disabled:pointer-events-none disabled:opacity-50`.
11. For polymorphic components, accept `asChild?: boolean` and switch `Comp = asChild ? Slot : "tag"`.
12. For overlays, use `data-[state=open]:animate-in data-[state=closed]:animate-out` plus `fade-*`, `zoom-*`, `slide-in-from-*` utilities.
13. For context-backed components, expose a hook (`useThing()`) that **throws** with a clear error message when called outside the provider.
14. For icon-only buttons, include a `<span className="sr-only">…</span>` label.
15. Reuse `buttonVariants`, `toggleVariants`, etc. via `cn(buttonVariants({...}), className)` rather than copying classes.
16. Default user-facing color preference (project convention): **light theme by default; avoid solid blue or solid black blocks** when designing custom variants on top of these primitives.

---

## 9. Quick Lookup — Component → Primitive

| Component | File | Underlying Primitive |
|---|---|---|
| Accordion | `accordion.tsx` | `@radix-ui/react-accordion` |
| Alert | `alert.tsx` | native `<div role="alert">` |
| AlertDialog | `alert-dialog.tsx` | `@radix-ui/react-alert-dialog` |
| AspectRatio | `aspect-ratio.tsx` | `@radix-ui/react-aspect-ratio` |
| Avatar | `avatar.tsx` | `@radix-ui/react-avatar` |
| Badge | `badge.tsx` | `<span>` / `<Slot>` |
| Breadcrumb | `breadcrumb.tsx` | semantic `<nav>/<ol>/<li>` |
| Button | `button.tsx` | `<button>` / `<Slot>` |
| ButtonGroup | `button-group.tsx` | `<div role="group">` |
| Calendar | `calendar.tsx` | `react-day-picker` |
| Card | `card.tsx` | `<div>` |
| Carousel | `carousel.tsx` | `embla-carousel-react` |
| Chart | `chart.tsx` | `recharts` |
| Checkbox | `checkbox.tsx` | `@radix-ui/react-checkbox` |
| Collapsible | `collapsible.tsx` | `@radix-ui/react-collapsible` |
| Command | `command.tsx` | `cmdk` |
| ContextMenu | `context-menu.tsx` | `@radix-ui/react-context-menu` |
| Dialog | `dialog.tsx` | `@radix-ui/react-dialog` |
| Drawer | `drawer.tsx` | `vaul` |
| DropdownMenu | `dropdown-menu.tsx` | `@radix-ui/react-dropdown-menu` |
| Empty | `empty.tsx` | `<div>` |
| Field | `field.tsx` | `<fieldset>/<div>` (+ `Label`) |
| Form | `form.tsx` | `react-hook-form` |
| HoverCard | `hover-card.tsx` | `@radix-ui/react-hover-card` |
| Input | `input.tsx` | `<input>` |
| InputGroup | `input-group.tsx` | `<div role="group">` |
| InputOTP | `input-otp.tsx` | `input-otp` |
| Item | `item.tsx` | `<div>` (+ `Separator`) |
| Kbd | `kbd.tsx` | `<kbd>` |
| Label | `label.tsx` | `@radix-ui/react-label` |
| Menubar | `menubar.tsx` | `@radix-ui/react-menubar` |
| NavigationMenu | `navigation-menu.tsx` | `@radix-ui/react-navigation-menu` |
| Pagination | `pagination.tsx` | semantic `<nav>/<ul>/<li>` |
| Popover | `popover.tsx` | `@radix-ui/react-popover` |
| Progress | `progress.tsx` | `@radix-ui/react-progress` |
| RadioGroup | `radio-group.tsx` | `@radix-ui/react-radio-group` |
| Resizable | `resizable.tsx` | `react-resizable-panels` |
| ScrollArea | `scroll-area.tsx` | `@radix-ui/react-scroll-area` |
| Select | `select.tsx` | `@radix-ui/react-select` |
| Separator | `separator.tsx` | `@radix-ui/react-separator` |
| Sheet | `sheet.tsx` | `@radix-ui/react-dialog` |
| Sidebar | `sidebar.tsx` | composed (Sheet, Tooltip, Button, Input, Separator, Skeleton) |
| Skeleton | `skeleton.tsx` | `<div>` |
| Slider | `slider.tsx` | `@radix-ui/react-slider` |
| Sonner / Toaster | `sonner.tsx` | `sonner` + `next-themes` |
| Spinner | `spinner.tsx` | lucide `Loader2Icon` |
| Switch | `switch.tsx` | `@radix-ui/react-switch` |
| Table | `table.tsx` | semantic `<table>` |
| Tabs | `tabs.tsx` | `@radix-ui/react-tabs` |
| Textarea | `textarea.tsx` | `<textarea>` |
| Toggle | `toggle.tsx` | `@radix-ui/react-toggle` |
| ToggleGroup | `toggle-group.tsx` | `@radix-ui/react-toggle-group` |
| Tooltip | `tooltip.tsx` | `@radix-ui/react-tooltip` |

---

## Appendix — Components Mentioned but Not in `src/components/ui/`

- **`@/hooks/use-mobile`** — referenced by `Sidebar`. Not provided in batches.
- **`@/lib/utils` → `cn`** — referenced everywhere. Not provided in batches.

If a future hand-off needs full coverage, request these two files plus any feature-level (non-`ui/`) components, the global CSS file (`globals.css` / `app.css`) where the theme tokens are defined, the `tailwind.config.*` for the custom keyframes (`accordion-up`, `accordion-down`, `caret-blink`), and the `app/` (or `pages/`) routing tree.

---

*End of UI Components Memory — `nodebase`.*
