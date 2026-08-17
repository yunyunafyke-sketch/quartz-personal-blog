import { QuartzPluginData } from "../plugins/vfile"

export type DirectoryTreeNode = {
  name: string
  pages: QuartzPluginData[]
  children: DirectoryTreeNode[]
}

function compareNames(first: string, second: string) {
  return first.localeCompare(second, "zh-CN", { numeric: true, sensitivity: "base" })
}

export function compareDirectoryPages(first: QuartzPluginData, second: QuartzPluginData) {
  const firstName = first.slug?.split("/").at(-1) ?? first.frontmatter?.title ?? ""
  const secondName = second.slug?.split("/").at(-1) ?? second.frontmatter?.title ?? ""
  return compareNames(firstName, secondName)
}

export function buildDirectoryTree(allFiles: QuartzPluginData[]) {
  const roots = new Map<string, DirectoryTreeNode>()

  for (const page of allFiles) {
    const pageSlug = page.slug ?? ""
    const pathParts = (page.filePath ?? "").split("/").filter(Boolean)
    if (pathParts[0] === "content") pathParts.shift()
    pathParts.pop()

    const category = pathParts[0]
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

    const root = roots.get(category) ?? { name: category, pages: [], children: [] }
    roots.set(category, root)
    let current: DirectoryTreeNode = root

    for (const folder of pathParts.slice(1)) {
      const existingChild = current.children.find((node) => node.name === folder)
      if (existingChild) {
        current = existingChild
      } else {
        const child: DirectoryTreeNode = { name: folder, pages: [], children: [] }
        current.children.push(child)
        current = child
      }
    }

    current.pages.push(page)
  }

  const sortTree = (nodes: DirectoryTreeNode[]) => {
    nodes.sort((first, second) => compareNames(first.name, second.name))
    for (const node of nodes) sortTree(node.children)
  }
  const tree = [...roots.values()]
  sortTree(tree)
  return tree
}
