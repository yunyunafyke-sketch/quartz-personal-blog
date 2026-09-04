import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import rehypeMermaid from "rehype-mermaid"
import { QuartzTransformerPluginInstance, TreeTransform } from "./quartz/plugins/types"
import { componentRegistry } from "./quartz/components/registry"
import PersonalFooter from "./quartz/components/PersonalFooter"
import FolderContentWithDates from "./quartz/components/FolderContentWithDates"
import { QuartzPluginData } from "./quartz/plugins/vfile"
import {
  buildDirectoryTree,
  compareDirectoryPages,
  DirectoryTreeNode,
} from "./quartz/util/directory"
import { isFolderPath, resolveRelative } from "./quartz/util/path"
import type { Element, Root } from "hast"

// 用本站的个性化页脚替换社区默认页脚，同时保留 Quartz 的配置加载与布局机制。
componentRegistry.register("@quartz-community/footer", PersonalFooter, "local-personal-footer")

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

  const renderNode = (node: DirectoryTreeNode, topLevel = false): Element => {
    const details: Element = {
      type: "element",
      tagName: "details",
      properties: topLevel && node === tree[0] ? { open: true } : {},
      children: [
        {
          type: "element",
          tagName: "summary",
          properties: {},
          children: [{ type: "text", value: node.name }],
        } as Element,
        ...node.children.map((child) => renderNode(child)),
        ...node.pages.sort(compareDirectoryPages).map(
          (page) =>
            ({
              type: "element",
              tagName: "a",
              properties: {
                href: resolveRelative("index" as never, page.slug! as never),
                className: ["internal", "internal-link"],
              },
              children: [{ type: "text", value: page.frontmatter!.title! }],
            }) as Element,
        ),
      ],
    }
    return details
  }

  const tree = buildDirectoryTree(componentData.allFiles as QuartzPluginData[])
  placeholder.children = tree.map((node) => renderNode(node, true))
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

// Community folder pages aggregate child dates but omit the selected date type
// for generated subfolders. Use the same list component with that missing data
// restored, so directory rows show the most recent date of their descendants.
const folderPage = config.plugins.pageTypes?.find((pageType) => pageType.name === "FolderPage")
if (folderPage) {
  folderPage.body = () => FolderContentWithDates({ sort: byDirectoryOrder })
}

// Quartz 默认会把每篇笔记的正文写入 static/contentIndex.json。
// 本站搜索只按标题匹配，生成索引时不传入正文，以减小索引体积。
const contentIndex = config.plugins.emitters.find((emitter) => emitter.name === "ContentIndex")
if (contentIndex) {
  const emitWithoutBody = (
    emit: () => unknown,
    content: Parameters<typeof contentIndex.emit>[1],
  ): Promise<unknown> => {
    const originalTexts = content.map(([, file]) => file.data.text)
    content.forEach(([, file]) => {
      file.data.text = ""
    })

    try {
      return Promise.resolve(emit()).finally(() => {
        content.forEach(([, file], index) => {
          file.data.text = originalTexts[index]
        })
      })
    } catch (error) {
      content.forEach(([, file], index) => {
        file.data.text = originalTexts[index]
      })
      throw error
    }
  }

  const originalEmit = contentIndex.emit
  contentIndex.emit = (ctx, content, resources) =>
    emitWithoutBody(() => originalEmit(ctx, content, resources), content) as ReturnType<
      typeof originalEmit
    >

  const originalPartialEmit = contentIndex.partialEmit
  if (originalPartialEmit) {
    contentIndex.partialEmit = (ctx, content, resources, changeEvents) =>
      emitWithoutBody(
        () => originalPartialEmit(ctx, content, resources, changeEvents),
        content,
      ) as ReturnType<typeof originalPartialEmit>
  }
}

for (const pageType of config.plugins.pageTypes ?? []) {
  const currentTransforms = pageType.treeTransforms
  pageType.treeTransforms = (ctx) => [...(currentTransforms?.(ctx) ?? []), populateHomeLibrary]
}
// Render Mermaid before syntax highlighting so the published site contains
// static SVG images and never needs to download Mermaid in the browser.
config.plugins.transformers.unshift(staticMermaid)
export default config
export const layout = await loadQuartzLayout()
