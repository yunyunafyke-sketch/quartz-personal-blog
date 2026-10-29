// 委托监听支持首页的 SPA 切换，每页固定展示 18 篇文章。
function goToHomePage(pagination: HTMLElement, next: number) {
  const section = pagination.closest("section")
  if (!section) return
  const rows = section.querySelectorAll<HTMLElement>(".editorial-row")
  const total = Math.ceil(rows.length / 18)
  if (!Number.isInteger(next) || next < 1 || next > total) return
  pagination.dataset.currentPage = String(next)
  rows.forEach((row, index) => {
    row.hidden = index < (next - 1) * 18 || index >= next * 18
  })
  const currentIsHidden = !pagination.querySelector(`button[data-page="${next}"]`)
  pagination
    .querySelectorAll<HTMLButtonElement>("button[data-page], button[data-page-jump]")
    .forEach((item) => {
      const isJump = item.hasAttribute("data-page-jump")
      const isCurrent = isJump ? currentIsHidden : Number(item.dataset.page) === next
      if (isCurrent) item.setAttribute("aria-current", "page")
      else item.removeAttribute("aria-current")
      if (isJump) {
        item.setAttribute("aria-expanded", "false")
        item.setAttribute(
          "aria-label",
          currentIsHidden ? `当前第 ${next} 页，选择页码` : "选择页码",
        )
      }
    })
  pagination.querySelectorAll<HTMLButtonElement>("button[data-page-step]").forEach((item) => {
    item.disabled = item.dataset.pageStep === "-1" ? next === 1 : next === total
  })
  const form = pagination.querySelector<HTMLFormElement>(".editorial-pagination-jump")
  if (form) form.hidden = true
  section.scrollIntoView({ block: "start" })
}

document.addEventListener("click", (event) => {
  const target = event.target
  if (!(target instanceof Element)) return
  document
    .querySelectorAll<HTMLFormElement>(".editorial-pagination-jump:not([hidden])")
    .forEach((form) => {
      if (form.contains(target) || target.closest("[data-page-jump]")) return
      form.hidden = true
      form
        .closest(".editorial-pagination")
        ?.querySelector("[data-page-jump]")
        ?.setAttribute("aria-expanded", "false")
    })
  const button = target.closest<HTMLButtonElement>(".editorial-pagination button")
  const pagination = button?.closest<HTMLElement>(".editorial-pagination")
  if (!button || !pagination || button.disabled) return
  if (button.hasAttribute("data-page-jump")) {
    const form = pagination.querySelector<HTMLFormElement>(".editorial-pagination-jump")
    const input = form?.querySelector<HTMLInputElement>("input")
    if (!form || !input) return
    form.hidden = !form.hidden
    button.setAttribute("aria-expanded", String(!form.hidden))
    if (!form.hidden) {
      input.value = pagination.dataset.currentPage ?? "1"
      input.focus({ preventScroll: true })
      input.select()
    }
    return
  }
  if (!button.dataset.page && !button.dataset.pageStep) return
  const current = Number(pagination.dataset.currentPage ?? 1)
  goToHomePage(
    pagination,
    button.dataset.page ? Number(button.dataset.page) : current + Number(button.dataset.pageStep),
  )
})

document.addEventListener("submit", (event) => {
  const form = event.target
  if (!(form instanceof HTMLFormElement) || !form.matches(".editorial-pagination-jump")) return
  event.preventDefault()
  const pagination = form.closest<HTMLElement>(".editorial-pagination")
  const input = form.querySelector<HTMLInputElement>("input")
  if (!pagination || !input || !form.reportValidity()) return
  goToHomePage(pagination, input.valueAsNumber)
  pagination.querySelector<HTMLButtonElement>("[data-page-jump]")?.focus({ preventScroll: true })
})

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !(event.target instanceof Element)) return
  const form = event.target.closest<HTMLFormElement>(".editorial-pagination-jump")
  if (!form) return
  form.hidden = true
  const button = form
    .closest(".editorial-pagination")
    ?.querySelector<HTMLButtonElement>("[data-page-jump]")
  button?.setAttribute("aria-expanded", "false")
  button?.focus()
})
