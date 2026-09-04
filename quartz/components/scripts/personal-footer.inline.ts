const footerModalOpenClass = "personal-footer-modal-open"

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
setupPersonalFooter()
