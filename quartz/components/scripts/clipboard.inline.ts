// 复制按钮的默认图标，以及复制成功后短暂显示的绿色对勾。
const copyIcon = `<svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16"><path fill-rule="evenodd" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"></path><path fill-rule="evenodd" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"></path></svg>`
const successIcon = `<svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16"><path fill-rule="evenodd" fill="rgb(63, 185, 80)" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"></path></svg>`

// 优先读取语法高亮插件保留的原始代码，读取不到时再使用页面中渲染后的文字。
function getCodeText(code: HTMLElement) {
  const serializedText = code.dataset.clipboard
  if (serializedText) {
    try {
      const parsedText = JSON.parse(serializedText)
      if (typeof parsedText === "string") return parsedText.replace(/\n\n/g, "\n")
    } catch {
      // 插件数据格式异常时继续走下方的 innerText 兜底，不影响复制按钮使用。
    }
  }

  return code.innerText.replace(/\n\n/g, "\n")
}

// 传统复制方案：临时创建屏幕外文本框，选中文字后执行 copy，再立即移除文本框。
// 该过程只在用户点击时运行，不会常驻 DOM，也不会造成页面卡顿。
function copyWithHiddenTextarea(text: string) {
  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.readOnly = true
  textarea.setAttribute("aria-hidden", "true")
  Object.assign(textarea.style, {
    position: "fixed",
    top: "0",
    left: "-9999px",
    width: "1px",
    height: "1px",
    opacity: "0",
    pointerEvents: "none",
  })

  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)

  try {
    return document.execCommand("copy")
  } finally {
    textarea.remove()
  }
}

// HTTPS/localhost 优先使用现代 Clipboard API；HTTP 或权限拒绝时自动降级。
async function copyCode(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // 现代接口失败后继续执行传统复制方案。
    }
  }

  if (!copyWithHiddenTextarea(text)) {
    throw new Error("The browser rejected both clipboard copy methods")
  }
}

// 首次加载和 SPA 页面切换后都可能出现新的代码块，因此按需补充复制按钮。
function setupClipboardButtons() {
  for (const pre of document.querySelectorAll("pre")) {
    // 同一个代码块只创建一个按钮，避免重复初始化。
    if (pre.querySelector(":scope > .clipboard-button")) continue

    const code = pre.querySelector<HTMLElement>("code")
    if (!code) continue

    const button = document.createElement("button")
    button.className = "clipboard-button"
    button.type = "button"
    button.innerHTML = copyIcon
    button.ariaLabel = "复制代码"
    button.title = "复制代码"
    pre.prepend(button)
  }
}

// 使用事件委托统一处理所有复制按钮，包括 SPA 切换后动态生成的按钮。
document.addEventListener("click", async (event) => {
  const target = event.target
  if (!(target instanceof Element)) return

  const button = target.closest<HTMLButtonElement>(".clipboard-button")
  if (!button) return

  const code = button.parentElement?.querySelector<HTMLElement>("code")
  if (!code) return

  try {
    await copyCode(getCodeText(code))
    // 复制成功后显示两秒对勾，再恢复默认图标。
    button.blur()
    button.innerHTML = successIcon
    button.title = "已复制"
    window.setTimeout(() => {
      button.innerHTML = copyIcon
      button.title = "复制代码"
    }, 2000)
  } catch (error) {
    // 两种复制方式都失败时保留控制台信息，并通过 title 提示用户手动复制。
    console.error(error)
    button.title = "复制失败，请手动选择代码复制"
  }
})

// nav 用于 Quartz 页面切换，render 用于页面内容重新渲染。
document.addEventListener("nav", setupClipboardButtons)
document.addEventListener("render", setupClipboardButtons)
