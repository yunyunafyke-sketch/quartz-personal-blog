import { FullSlug, resolveRelative } from "../util/path"
import { buildDirectoryTree, compareDirectoryPages, DirectoryTreeNode } from "../util/directory"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

function SearchDirectory({ fileData, allFiles }: QuartzComponentProps) {
  const tree = buildDirectoryTree(allFiles)

  const renderNode = (node: DirectoryTreeNode, topLevel = false) => (
    <details open={topLevel && node === tree[0]}>
      <summary>{node.name}</summary>
      {node.children.map((child) => renderNode(child))}
      {node.pages.sort(compareDirectoryPages).map((page) => (
        <a
          href={resolveRelative(fileData.slug!, page.slug! as FullSlug)}
          class="internal internal-link"
        >
          {page.frontmatter!.title}
        </a>
      ))}
    </details>
  )

  return (
    <section class="home-library global-search-library" aria-label="文章目录">
      <div class="home-library-list">{tree.map((node) => renderNode(node, true))}</div>
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
