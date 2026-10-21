const footerModalOpenClass = "personal-footer-modal-open"

// 每次 Quartz 无刷新切页时，先移除旧文章留下的目录监听器。
let teardownCurrentToc: (() => void) | undefined

// Keep the flat TOC links compatible with Quartz while adding outline controls.
function setupTocOutline() {
  // The layout toolbar owns whole-sidebar folding; keep this label static.
  document.querySelectorAll<HTMLButtonElement>("button.toc-header").forEach((header) => {
    const label = document.createElement("div")
    label.className = "toc-header toc-heading"
    const heading = header.querySelector("h3")
    if (heading) label.append(heading)
    else label.textContent = "目录"
    header.nextElementSibling?.classList.remove("collapsed")
    header.closest(".toc")?.classList.remove("collapsed")
    header.replaceWith(label)
  })
  document.querySelectorAll<HTMLElement>(".toc-content").forEach((list) => {
    const rows = [...list.querySelectorAll<HTMLElement>(":scope > li")]
    const depth = (row: HTMLElement) =>
      Number([...row.classList].find((name) => /^depth-\d+$/.test(name))?.split("-")[1] ?? 0)
    const update = () => {
      const collapsed: number[] = []
      for (const row of rows) {
        const level = depth(row)
        while (collapsed.length && collapsed[collapsed.length - 1] >= level) collapsed.pop()
        row.hidden = collapsed.length > 0
        if (row.classList.contains("outline-collapsed")) collapsed.push(level)
      }
    }
    rows.forEach((row, index) => {
      if (row.dataset.outlineReady) return
      row.dataset.outlineReady = "true"
      const level = depth(row)
      row.style.setProperty("--outline-depth", String(level))
      for (let ancestor = 0; ancestor < level; ancestor++) {
        const guide = document.createElement("span")
        guide.className = "toc-outline-guide"
        guide.style.left = `${ancestor * 0.75 + 0.35}rem`
        guide.setAttribute("aria-hidden", "true")
        row.append(guide)
      }
      if (!rows[index + 1] || depth(rows[index + 1]) <= level) return
      const button = document.createElement("button")
      button.type = "button"
      button.className = "toc-outline-toggle"
      button.setAttribute("aria-expanded", "true")
      const title = row.querySelector("a")?.textContent ?? ""
      button.setAttribute("aria-label", `折叠 ${title}`)
      button.addEventListener("click", () => {
        const collapsed = row.classList.toggle("outline-collapsed")
        button.setAttribute("aria-expanded", String(!collapsed))
        button.setAttribute("aria-label", `${collapsed ? "展开" : "折叠"} ${title}`)
        update()
      })
      row.prepend(button)
    })
    update()
  })
}

function setupCurrentToc() {
  teardownCurrentToc?.()
  setupTocOutline()

  const links = [...document.querySelectorAll<HTMLAnchorElement>(".toc-content > li > a[data-for]")]
  const entries = links
    .map((link) => ({ link, heading: document.getElementById(link.dataset.for ?? "") }))
    .filter(
      (entry): entry is { link: HTMLAnchorElement; heading: HTMLElement } =>
        entry.heading instanceof HTMLElement,
    )

  if (entries.length === 0) return

  const setCurrent = (id: string) => {
    // `toc-current` 只会赋给一个链接，样式层据此显示唯一的选中背景。
    for (const { link } of entries) {
      link.classList.toggle("toc-current", link.dataset.for === id)
    }
  }

  const updateCurrent = () => {
    // 阅读线以上最后一个标题就是当前章节；文章开头尚未经过标题时，选中第一项。
    const readingLine = 112
    const current =
      entries.filter(({ heading }) => heading.getBoundingClientRect().top <= readingLine).at(-1) ??
      entries[0]
    setCurrent(current.link.dataset.for ?? "")
  }

  let animationFrame: number | undefined
  const scheduleUpdate = () => {
    // 滚动事件触发频繁，合并到下一帧再计算，避免重复读取布局信息。
    if (animationFrame !== undefined) return
    animationFrame = window.requestAnimationFrame(() => {
      animationFrame = undefined
      updateCurrent()
    })
  }

  const handleClick = (event: Event) => {
    // 点击目录后立即反馈选中状态；随后滚动事件会按实际阅读位置再次校准。
    const link = event.currentTarget
    if (link instanceof HTMLAnchorElement) setCurrent(link.dataset.for ?? "")
  }

  for (const { link } of entries) link.addEventListener("click", handleClick)
  window.addEventListener("scroll", scheduleUpdate, { passive: true })
  window.addEventListener("resize", scheduleUpdate)
  updateCurrent()

  teardownCurrentToc = () => {
    if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame)
    for (const { link } of entries) link.removeEventListener("click", handleClick)
    window.removeEventListener("scroll", scheduleUpdate)
    window.removeEventListener("resize", scheduleUpdate)
  }
}

// Quartz 无刷新切页会替换正文，首次加载和每次渲染后都重新寻找当前目录项。
setupCurrentToc()
document.addEventListener("nav", () => window.requestAnimationFrame(setupCurrentToc))
document.addEventListener("render", () => window.requestAnimationFrame(setupCurrentToc))

// 为每个页脚绑定一次收款码弹窗事件，兼容 Quartz 的首次加载和 SPA 页面切换。
function setupPersonalFooter() {
  document.querySelectorAll<HTMLElement>(".personal-footer").forEach((footer) => {
    if (footer.dataset.coffeeReady === "true") return

    const openButton = footer.querySelector<HTMLButtonElement>("[data-coffee-open]")
    const closeButton = footer.querySelector<HTMLButtonElement>("[data-coffee-close]")
    const modal = footer.querySelector<HTMLElement>("[data-coffee-modal]")
    const modalCard = modal?.querySelector<HTMLElement>(".personal-footer__modal-card")
    if (!openButton || !closeButton || !modal || !modalCard) return

    footer.dataset.coffeeReady = "true"
    let previouslyFocused: HTMLElement | null = null

    const openModal = () => {
      previouslyFocused =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      modal.hidden = false
      document.body.classList.add(footerModalOpenClass)
      modalCard.focus()
    }

    const closeModal = () => {
      if (modal.hidden) return
      modal.hidden = true
      document.body.classList.remove(footerModalOpenClass)
      previouslyFocused?.focus()
    }

    // 只在点击半透明遮罩本身时关闭，点击收款码卡片不会误触。
    const closeFromBackdrop = (event: MouseEvent) => {
      if (event.target === modal) closeModal()
    }

    const closeFromKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !modal.hidden) closeModal()
    }

    openButton.addEventListener("click", openModal)
    closeButton.addEventListener("click", closeModal)
    modal.addEventListener("click", closeFromBackdrop)
    document.addEventListener("keydown", closeFromKeyboard)

    window.addCleanup(() => {
      openButton.removeEventListener("click", openModal)
      closeButton.removeEventListener("click", closeModal)
      modal.removeEventListener("click", closeFromBackdrop)
      document.removeEventListener("keydown", closeFromKeyboard)
      document.body.classList.remove(footerModalOpenClass)
    })
  })
}

document.addEventListener("nav", setupPersonalFooter)
document.addEventListener("render", setupPersonalFooter)
