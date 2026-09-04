import { FolderContent as CommunityFolderContent } from "@quartz-community/folder-page"
import type { QuartzPluginData } from "../plugins/vfile"
import type { BuildTimeTrieData } from "../util/ctx"
import type { FileTrieNode } from "../util/fileTrie"
import type { QuartzComponent, QuartzComponentProps } from "./types"

type FolderSort = (first: QuartzPluginData, second: QuartzPluginData) => number

interface FolderContentOptions {
  showFolderCount?: boolean
  showSubfolders?: boolean
  sort?: FolderSort
}

type PageDates = NonNullable<BuildTimeTrieData["dates"]>

function latestDate(first: Date, second: Date): Date {
  return first.getTime() >= second.getTime() ? first : second
}

function mergeDates(current: PageDates | undefined, candidate: PageDates): PageDates {
  if (!current) return { ...candidate }

  return {
    created: latestDate(current.created, candidate.created),
    modified: latestDate(current.modified, candidate.modified),
    published: latestDate(current.published, candidate.published),
  }
}

function mostRecentDatesInsideFolder(folder: FileTrieNode<BuildTimeTrieData>): PageDates | undefined {
  let dates: PageDates | undefined

  const collectDates = (node: FileTrieNode<BuildTimeTrieData>) => {
    if (node.data?.dates) dates = mergeDates(dates, node.data.dates)
    for (const child of node.children) collectDates(child)
  }

  for (const child of folder.children) collectDates(child)

  // An empty folder with its own index page can still display that page's date.
  return dates ?? (folder.data?.dates ? { ...folder.data.dates } : undefined)
}

function addDatesToDirectSubfolders(props: QuartzComponentProps): void {
  const slug = props.fileData.slug
  const folder = slug ? props.ctx.trie?.findNode(slug.split("/")) : undefined
  if (!folder) return

  const configuredDateType = props.fileData.defaultDateType
  const defaultDateType =
    configuredDateType === "created" || configuredDateType === "published"
      ? configuredDateType
      : "modified"

  for (const child of folder.children) {
    if (!child.isFolder) continue

    const dates = mostRecentDatesInsideFolder(child)
    if (!dates) continue

    const title = child.displayName
    child.data = child.data
      ? ({ ...child.data, dates, defaultDateType } as BuildTimeTrieData)
      : ({
          slug: child.slug,
          title,
          filePath: `${child.slug}.md`,
          relativePath: `${child.slug}.md`,
          frontmatter: { title, tags: [] },
          dates,
          defaultDateType,
        } as unknown as BuildTimeTrieData)
  }
}

export default function FolderContentWithDates(options?: FolderContentOptions): QuartzComponent {
  const CommunityComponent = CommunityFolderContent(
    options as Parameters<typeof CommunityFolderContent>[0],
  ) as unknown as QuartzComponent

  const FolderContentWithDates: QuartzComponent = (props) => {
    addDatesToDirectSubfolders(props)
    return <CommunityComponent {...props} />
  }

  FolderContentWithDates.css = CommunityComponent.css
  FolderContentWithDates.beforeDOMLoaded = CommunityComponent.beforeDOMLoaded
  FolderContentWithDates.afterDOMLoaded = CommunityComponent.afterDOMLoaded

  return FolderContentWithDates
}
