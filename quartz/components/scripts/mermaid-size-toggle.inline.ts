const mermaidOriginalSizeClass = "is-original-size"

// 为正文中的 Mermaid 流程图添加“原始尺寸/适应页面”切换能力。
function setupMermaidSizeToggles() {
  const mermaidImages = document.querySelectorAll<HTMLImageElement>(
    "article picture > img[id^='mermaid-']",
  )

  mermaidImages.forEach((image) => {
    const picture = image.parentElement
    // Quartz 局部导航可能重复触发初始化，已处理过的流程图不再重复包装。
    if (!(picture instanceof HTMLPictureElement) || picture.closest(".mermaid-size-viewer")) return

    const originalWidth = Number.parseFloat(image.getAttribute("width") ?? "")
    const originalHeight = Number.parseFloat(image.getAttribute("height") ?? "")
    if (!Number.isFinite(originalWidth) || !Number.isFinite(originalHeight)) return

    // 每张 Mermaid 图使用独立容器，按钮只切换当前图，不影响同一篇文章中的其他流程图。
    const viewer = document.createElement("div")
    viewer.className = `mermaid-size-viewer ${mermaidOriginalSizeClass}`
    const controls = document.createElement("div")
    controls.className = "mermaid-size-viewer__controls"
    const viewport = document.createElement("div")
    viewport.className = "mermaid-size-viewer__viewport"
    const originalButton = document.createElement("button")
    const fitButton = document.createElement("button")
    for (const button of [originalButton, fitButton]) {
      button.className = "mermaid-size-viewer__toggle"
      button.type = "button"
    }
    originalButton.textContent = "原始尺寸"
    fitButton.textContent = "适应页面"
    originalButton.setAttribute("aria-pressed", "true")
    fitButton.setAttribute("aria-pressed", "false")

    // 构建时生成的图片自带原始宽高，通过 CSS 变量保留它们，切换时无需重新渲染 Mermaid。
    picture.style.setProperty("--mermaid-original-width", `${originalWidth}px`)
    picture.style.setProperty("--mermaid-original-height", `${originalHeight}px`)
    picture.before(viewer)
    controls.append(originalButton, fitButton)
    viewport.append(picture)
    viewer.append(controls, viewport)

    const setMode = (showOriginalSize: boolean) => {
      viewer.classList.toggle(mermaidOriginalSizeClass, showOriginalSize)
      originalButton.setAttribute("aria-pressed", String(showOriginalSize))
      fitButton.setAttribute("aria-pressed", String(!showOriginalSize))
      if (showOriginalSize) viewport.scrollTo({ top: 0, left: 0 })
    }
    const showOriginal = () => setMode(true)
    const showFit = () => setMode(false)
    originalButton.addEventListener("click", showOriginal)
    fitButton.addEventListener("click", showFit)
    window.addCleanup(() => {
      originalButton.removeEventListener("click", showOriginal)
      fitButton.removeEventListener("click", showFit)
    })
  })
}

// 同时兼容首次渲染和 Quartz SPA 页面跳转后的重新渲染。
document.addEventListener("nav", setupMermaidSizeToggles)
document.addEventListener("render", setupMermaidSizeToggles)
