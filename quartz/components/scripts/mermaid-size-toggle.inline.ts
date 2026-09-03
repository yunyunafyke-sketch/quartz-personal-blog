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
    viewer.className = "mermaid-size-viewer"
    const controls = document.createElement("div")
    controls.className = "mermaid-size-viewer__controls"
    const viewport = document.createElement("div")
    viewport.className = "mermaid-size-viewer__viewport"
    const button = document.createElement("button")
    button.className = "mermaid-size-viewer__toggle"
    button.type = "button"
    button.textContent = "原始尺寸"
    button.setAttribute("aria-pressed", "false")
    button.setAttribute("title", "按流程图原始尺寸显示，并在图框内滚动查看")

    // 构建时生成的图片自带原始宽高，通过 CSS 变量保留它们，切换时无需重新渲染 Mermaid。
    picture.style.setProperty("--mermaid-original-width", `${originalWidth}px`)
    picture.style.setProperty("--mermaid-original-height", `${originalHeight}px`)
    picture.before(viewer)
    controls.append(button)
    viewport.append(picture)
    viewer.append(controls, viewport)

    const onToggle = () => {
      const showOriginalSize = viewer.classList.toggle(mermaidOriginalSizeClass)
      // 按钮文案表示下一步可执行的操作，aria-pressed 则表示当前是否为原始尺寸模式。
      button.textContent = showOriginalSize ? "适应页面" : "原始尺寸"
      button.setAttribute("aria-pressed", String(showOriginalSize))
      button.setAttribute(
        "title",
        showOriginalSize ? "恢复为适应正文宽度显示" : "按流程图原始尺寸显示，并在图框内滚动查看",
      )

      // 每次进入原始尺寸模式时回到图的左上角，避免沿用上一次滚动位置造成内容难以定位。
      if (showOriginalSize) viewport.scrollTo({ top: 0, left: 0 })
    }

    button.addEventListener("click", onToggle)
    window.addCleanup(() => button.removeEventListener("click", onToggle))
  })
}

// 同时兼容首次渲染和 Quartz SPA 页面跳转后的重新渲染。
document.addEventListener("nav", setupMermaidSizeToggles)
document.addEventListener("render", setupMermaidSizeToggles)
