import { FullSlug, resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

function byDirectoryOrder(first: QuartzPluginData, second: QuartzPluginData) {
  const firstName = first.slug?.split("/").at(-1) ?? first.frontmatter?.title ?? ""
  const secondName = second.slug?.split("/").at(-1) ?? second.frontmatter?.title ?? ""
  return firstName.localeCompare(secondName, "zh-CN", {
    numeric: true,
    sensitivity: "base",
  })
}

function SearchDirectory({ fileData, allFiles }: QuartzComponentProps) {
  const groups = new Map<string, QuartzPluginData[]>()
  for (const page of allFiles) {
    const pageSlug = page.slug ?? ""
    const pathParts = (page.filePath ?? "").split("/")
    const category = pathParts[0] === "content" ? pathParts[1] : pathParts[0]
    if (
      !category ||
      category === "tags" ||
      pageSlug === "index" ||
      pageSlug.endsWith("/index") ||
      page.unlisted === true ||
      !page.frontmatter?.title
    ) {
      continue
    }

    const pages = groups.get(category) ?? []
    pages.push(page)
    groups.set(category, pages)
  }

  return (
    <section class="home-library global-search-library" aria-label="文章目录">
      <div class="home-library-list">
        {[...groups.entries()]
          .sort(([first], [second]) => first.localeCompare(second, "zh-CN"))
          .map(([category, pages], groupIndex) => (
            <details open={groupIndex === 0}>
              <summary>{category}</summary>
              {pages.sort(byDirectoryOrder).map((page) => (
                <a
                  href={resolveRelative(fileData.slug!, page.slug! as FullSlug)}
                  class="internal internal-link"
                >
                  {page.frontmatter!.title}
                </a>
              ))}
            </details>
          ))}
      </div>
    </section>
  )
}

const Body: QuartzComponent = (props: QuartzComponentProps) => {
  return (
    <div id="quartz-body">
      {props.fileData.slug !== "index" && <SearchDirectory {...props} />}
      {props.children}
    </div>
  )
}

export default (() => Body) satisfies QuartzComponentConstructor
