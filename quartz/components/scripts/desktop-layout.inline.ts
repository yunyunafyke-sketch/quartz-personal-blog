const layoutStorageKey = "quartz-desktop-layout"

type SidebarSide = "left" | "right"
type LayoutPreferences = {
  leftWidth?: number
  rightWidth?: number
  leftCollapsed?: boolean
  rightCollapsed?: boolean
}

function readPreferences(): LayoutPreferences {
  try {
    return JSON.parse(localStorage.getItem(layoutStorageKey) ?? "{}") as LayoutPreferences
  } catch {
    return {}
  }
}

function setupDesktopLayout() {
  const body = document.getElementById("quartz-body")
  if (!body || !window.matchMedia("(min-width: 1200px)").matches) return

  // The homepage reuses the left sidebar as a floating search toolbar. It
  // should stay visible even when the visitor collapsed the article sidebar
  // on a previous page; keep the saved preference for regular notes only.
  if (document.body.dataset.slug === "index") {
    body.classList.remove("left-sidebar-collapsed", "right-sidebar-collapsed")
    return
  }

  const preferences = readPreferences()
  const save = () => localStorage.setItem(layoutStorageKey, JSON.stringify(preferences))
  const setWidth = (side: SidebarSide, width: number) => {
    const safeWidth = Math.round(Math.min(560, Math.max(180, width)))
    preferences[`${side}Width`] = safeWidth
    body.style.setProperty(`--${side}-sidebar-width`, `${safeWidth}px`)
  }
  const setCollapsed = (side: SidebarSide, collapsed: boolean) => {
    preferences[`${side}Collapsed`] = collapsed
    body.classList.toggle(`${side}-sidebar-collapsed`, collapsed)
    const button = body.querySelector<HTMLButtonElement>(`.sidebar-toggle-${side}`)
    if (button) {
      const isLeft = side === "left"
      button.setAttribute(
        "aria-label",
        `${collapsed ? "显示" : "隐藏"}${isLeft ? "左侧" : "右侧"}目录`,
      )
      button.setAttribute("title", button.getAttribute("aria-label") ?? "")
      button.setAttribute("data-tooltip", button.getAttribute("aria-label") ?? "")
      button.classList.toggle("is-collapsed", collapsed)
    }
  }

  if (preferences.leftWidth) setWidth("left", preferences.leftWidth)
  if (preferences.rightWidth) setWidth("right", preferences.rightWidth)
  setCollapsed("left", preferences.leftCollapsed === true)
  setCollapsed("right", preferences.rightCollapsed === true)

  const onToggle = (side: SidebarSide) => () => {
    setCollapsed(side, !body.classList.contains(`${side}-sidebar-collapsed`))
    save()
  }
  const leftToggle = body.querySelector<HTMLButtonElement>(".sidebar-toggle-left")
  const rightToggle = body.querySelector<HTMLButtonElement>(".sidebar-toggle-right")
  const onLeftToggle = onToggle("left")
  const onRightToggle = onToggle("right")
  leftToggle?.addEventListener("click", onLeftToggle)
  rightToggle?.addEventListener("click", onRightToggle)

  const addResizer = (side: SidebarSide) => {
    const divider = body.querySelector<HTMLElement>(`.layout-divider-${side}`)
    if (!divider) return
    const onPointerDown = (event: PointerEvent) => {
      if (body.classList.contains(`${side}-sidebar-collapsed`)) return
      event.preventDefault()
      divider.setPointerCapture(event.pointerId)
      document.body.classList.add("is-resizing-layout")
      const onPointerMove = (moveEvent: PointerEvent) => {
        const bounds = body.getBoundingClientRect()
        const width =
          side === "left" ? moveEvent.clientX - bounds.left : bounds.right - moveEvent.clientX
        setWidth(side, width)
      }
      const onPointerUp = () => {
        document.body.classList.remove("is-resizing-layout")
        save()
        divider.removeEventListener("pointermove", onPointerMove)
        divider.removeEventListener("pointerup", onPointerUp)
        divider.removeEventListener("pointercancel", onPointerUp)
      }
      divider.addEventListener("pointermove", onPointerMove)
      divider.addEventListener("pointerup", onPointerUp)
      divider.addEventListener("pointercancel", onPointerUp)
    }
    divider.addEventListener("pointerdown", onPointerDown)
    if (typeof window.addCleanup === "function") {
      window.addCleanup(() => divider.removeEventListener("pointerdown", onPointerDown))
    }
  }

  addResizer("left")
  addResizer("right")
  if (typeof window.addCleanup === "function") {
    window.addCleanup(() => {
      leftToggle?.removeEventListener("click", onLeftToggle)
      rightToggle?.removeEventListener("click", onRightToggle)
    })
  }
}

document.addEventListener("nav", setupDesktopLayout)
