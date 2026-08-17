import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import rehypeMermaid from "rehype-mermaid"
import { QuartzTransformerPluginInstance, TreeTransform } from "./quartz/plugins/types"
import { componentRegistry } from "./quartz/components/registry"
import { QuartzPluginData } from "./quartz/plugins/vfile"
import { isFolderPath, resolveRelative } from "./quartz/util/path"
import type { Element, Root } from "hast"

const byDirectoryOrder = (first: QuartzPluginData, second: QuartzPluginData): number => {
  const firstIsFolder = isFolderPath(first.slug ?? "")
  const secondIsFolder = isFolderPath(second.slug ?? "")

  if (firstIsFolder !== secondIsFolder) {
    return firstIsFolder ? -1 : 1
  }

  const fileName = (page: QuartzPluginData) =>
    page.slug?.split("/").at(-1) ?? page.frontmatter?.title ?? ""

  return fileName(first).localeCompare(fileName(second), "zh-CN", {
    numeric: true,
    sensitivity: "base",
  })
}

// Keep folder listing pages in the same natural order as the directory explorer.
componentRegistry.setOptionOverrides("@quartz-community/folder-page", {
  sort: byDirectoryOrder,
})

componentRegistry.setOptionOverrides("@quartz-community/search", {
  enablePreview: false,
  fieldPriority: ["title"],
})

// Build the homepage article directory from the notes that already exist.
// The homepage only contains a placeholder; article titles are not duplicated there.
const populateHomeLibrary: TreeTransform = (root: Root, slug, componentData) => {
  if (slug !== "index") return

  const findPlaceholder = (nodes: Root["children"]): Element | undefined => {
    for (const node of nodes) {
      if (node.type !== "element") continue
      const classes = node.properties?.className
      if (Array.isArray(classes) && classes.includes("home-library-list")) return node
      const nested = findPlaceholder(node.children)
      if (nested) return nested
    }
    return undefined
  }

  const placeholder = findPlaceholder(root.children)
  if (!placeholder) return

  const groups = new Map<string, QuartzPluginData[]>()
  for (const page of componentData.allFiles as QuartzPluginData[]) {
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
    ) continue

    const pages = groups.get(category) ?? []
    pages.push(page)
    groups.set(category, pages)
  }

  placeholder.children = [...groups.entries()]
    .sort(([first], [second]) => first.localeCompare(second, "zh-CN"))
    .map(([category, pages], groupIndex) => {
      pages.sort(byDirectoryOrder)
      const details: Element = {
        type: "element",
        tagName: "details",
        properties: groupIndex === 0 ? { open: true } : {},
        children: [
          {
            type: "element",
            tagName: "summary",
            properties: {},
            children: [{ type: "text", value: category }],
          } as Element,
          ...pages.map((page) => ({
            type: "element",
            tagName: "a",
            properties: {
              href: resolveRelative("index" as never, page.slug! as never),
              className: ["internal", "internal-link"],
            },
            children: [{ type: "text", value: page.frontmatter!.title! }],
          }) as Element),
        ],
      }
      return details
    })
}

const staticMermaid: QuartzTransformerPluginInstance = {
  name: "StaticMermaid",
  htmlPlugins() {
    return [
      [
        rehypeMermaid,
        {
          strategy: "img-svg",
          colorScheme: "light",
          dark: {
            theme: "dark",
          },
          mermaidConfig: {
            theme: "neutral",
            securityLevel: "loose",
            fontFamily: "Arial, sans-serif",
          },
        },
      ],
    ]
  },
}

const config = await loadQuartzConfig()
for (const pageType of config.plugins.pageTypes ?? []) {
  const currentTransforms = pageType.treeTransforms
  pageType.treeTransforms = (ctx) => [
    ...(currentTransforms?.(ctx) ?? []),
    populateHomeLibrary,
  ]
}
// Render Mermaid before syntax highlighting so the published site contains
// static SVG images and never needs to download Mermaid in the browser.
config.plugins.transformers.unshift(staticMermaid)
export default config
export const layout = await loadQuartzLayout()
