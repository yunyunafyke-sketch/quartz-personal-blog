// 保存图片尺寸偏好，刷新页面或切换文章后仍沿用用户选择。
const imageSizePreferenceKey = "quartz-image-original-size"

function setupImageSizeToggle() {
  // SPA 导航会复用 body，先清理上一页状态；首页背景不参与尺寸切换。
  document.body.classList.remove("article-images-original")
  if (document.body.dataset.slug === "index") return
  const toolbar = document.querySelector(".sidebar.left .flex-component")
  // 避免重复初始化时向工具栏插入多个按钮。
  if (!toolbar || toolbar.querySelector(".image-size-toggle")) return

  let original = false
  try {
    original = localStorage.getItem(imageSizePreferenceKey) === "true"
  } catch {
    // 浏览器禁用本地存储时，默认使用适应屏幕模式。
  }
  const button = document.createElement("button")
  button.type = "button"
  button.className = "image-size-toggle"
  // 使用内联 SVG，尺寸和线条粗细与主题、阅读模式图标一致，无需请求图标文件。
  button.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/></svg>`
  const update = () => {
    // 仅切换 CSS 类，不替换图片地址；同步提示文字和无障碍按下状态。
    document.body.classList.toggle("article-images-original", original)
    button.setAttribute("aria-pressed", String(original))
    const label = original ? "图片：原始大图，点击适应屏幕" : "图片：适应屏幕，点击显示原始大图"
    button.setAttribute("aria-label", label)
    button.title = label
  }
  const onClick = () => {
    original = !original
    update()
    try {
      localStorage.setItem(imageSizePreferenceKey, String(original))
    } catch {
      // 保存失败不影响当前页面的尺寸切换。
    }
  }
  const slot = document.createElement("div")
  slot.className = "image-size-toggle-slot"
  slot.append(button)
  // 插入主题按钮之前，使图片开关紧邻搜索框。
  const darkmode = toolbar.querySelector(".darkmode")?.parentElement
  toolbar.insertBefore(slot, darkmode ?? null)
  update()
  button.addEventListener("click", onClick)
  // 离开当前页面时移除监听，避免 SPA 导航累积事件处理器。
  window.addCleanup(() => button.removeEventListener("click", onClick))
}

// 同时处理首次打开页面和站内 SPA 导航后的初始化。
document.addEventListener("nav", setupImageSizeToggle)
