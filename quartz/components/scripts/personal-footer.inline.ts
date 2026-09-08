const footerModalOpenClass = "personal-footer-modal-open"

// 每次 Quartz 无刷新切页时，先移除旧文章留下的目录监听器。
let teardownCurrentToc: (() => void) | undefined

function setupCurrentToc() {
  teardownCurrentToc?.()

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
