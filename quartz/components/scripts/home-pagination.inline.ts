// 委托监听支持首页的 SPA 切换，每页固定展示 18 篇文章。
document.addEventListener("click", (event) => {
  const target = event.target
  if (!(target instanceof Element)) return
  const button = target.closest<HTMLButtonElement>(".editorial-pagination button")
  const pagination = button?.closest<HTMLElement>(".editorial-pagination")
  if (!button || !pagination || button.disabled) return
  const section = pagination.closest("section")
  if (!section) return
  const rows = section.querySelectorAll<HTMLElement>(".editorial-row")
  const total = Math.ceil(rows.length / 18)
  const current = Number(pagination.dataset.currentPage ?? 1)
  const next = Math.max(
    1,
    Math.min(
      total,
      button.dataset.page ? Number(button.dataset.page) : current + Number(button.dataset.pageStep),
    ),
  )
  pagination.dataset.currentPage = String(next)
  rows.forEach((row, index) => {
    row.hidden = index < (next - 1) * 18 || index >= next * 18
  })
  pagination.querySelectorAll<HTMLButtonElement>("button").forEach((item) => {
    if (item.dataset.page) {
      if (Number(item.dataset.page) === next) item.setAttribute("aria-current", "page")
      else item.removeAttribute("aria-current")
    } else item.disabled = item.dataset.pageStep === "-1" ? next === 1 : next === total
  })
  section.scrollIntoView({ block: "start" })
})
