import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import rehypeMermaid from "rehype-mermaid"
import { QuartzTransformerPluginInstance } from "./quartz/plugins/types"
import { componentRegistry } from "./quartz/components/registry"
import { QuartzPluginData } from "./quartz/plugins/vfile"
import { isFolderPath } from "./quartz/util/path"

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
// Render Mermaid before syntax highlighting so the published site contains
// static SVG images and never needs to download Mermaid in the browser.
config.plugins.transformers.unshift(staticMermaid)
export default config
export const layout = await loadQuartzLayout()
