function getSearchTerms(input: HTMLInputElement) {
  return input.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
}

function getDirectoryLinks(details: HTMLDetailsElement) {
  // Use the element's direct children instead of :scope. The latter is not
  // supported consistently by older browsers and can make the filter silently
  // skip every article link.
  return [...details.children].filter(
    (child): child is HTMLAnchorElement => child instanceof HTMLAnchorElement,
  )
}

function highlightTitle(link: HTMLAnchorElement, terms: string[]) {
  const title = link.dataset.homeTitle ?? link.textContent ?? ""
  link.dataset.homeTitle = title

  if (terms.length === 0) {
    link.textContent = title
    return true
  }

  const lowerTitle = title.toLocaleLowerCase()
  const ranges: Array<[number, number]> = []
  for (const term of terms) {
    let start = lowerTitle.indexOf(term)
    while (start !== -1) {
      ranges.push([start, start + term.length])
      start = lowerTitle.indexOf(term, start + term.length)
    }
  }

  if (ranges.length === 0) {
    link.textContent = title
    return false
  }

  ranges.sort((first, second) => first[0] - second[0])
  const merged: Array<[number, number]> = []
  for (const range of ranges) {
    const previous = merged.at(-1)
    if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1])
    else merged.push([...range])
  }

  link.replaceChildren()
  let cursor = 0
  for (const [start, end] of merged) {
    if (start > cursor) link.append(document.createTextNode(title.slice(cursor, start)))
    const match = document.createElement("mark")
    match.className = "home-title-match"
    match.textContent = title.slice(start, end)
    link.append(match)
    cursor = end
  }
  if (cursor < title.length) link.append(document.createTextNode(title.slice(cursor)))
  return true
}

function applyTitleFilter() {
  const input = document.querySelector<HTMLInputElement>(".search-container .search-bar")
  const library = document.querySelector<HTMLElement>(".home-library")
  if (!input || !library) return

  const terms = getSearchTerms(input)
  for (const details of library.querySelectorAll<HTMLDetailsElement>("details")) {
    const links = getDirectoryLinks(details)
    let hasMatch = false
    for (const link of links) {
      const title = link.dataset.homeTitle ?? link.textContent ?? ""
      const matched =
        terms.length === 0 || terms.every((term) => title.toLocaleLowerCase().includes(term))
      highlightTitle(link, matched ? terms : [])
      link.hidden = !matched
      hasMatch ||= matched
    }

    details.hidden = terms.length > 0 && !hasMatch
    details.open = terms.length > 0 ? hasMatch : details.dataset.homeDefaultOpen === "true"
  }
}

function setupTitleSearch() {
  const library = document.querySelector<HTMLElement>(".home-library")
  if (!library) return

  for (const details of library.querySelectorAll<HTMLDetailsElement>("details")) {
    if (!details.dataset.homeDefaultOpen) {
      details.dataset.homeDefaultOpen = details.open ? "true" : "false"
    }
  }

  // The search component can replace its input during SPA navigation, so the
  // delegated listener below is the single source of truth for every search
  // input instance.
  applyTitleFilter()
}

// The search component can be mounted before the router emits its first
// navigation event. Initialise immediately as well as on later SPA renders.
setupTitleSearch()
document.addEventListener("nav", () => setTimeout(setupTitleSearch, 0))
document.addEventListener("render", () => setTimeout(setupTitleSearch, 0))

// Keep the directory in sync even if the search component replaces its input
// node after this script has started.
document.addEventListener(
  "input",
  (event) => {
    const target = event.target
    if (target instanceof HTMLInputElement && target.matches(".search-container .search-bar")) {
      applyTitleFilter()
    }
  },
  true,
)
