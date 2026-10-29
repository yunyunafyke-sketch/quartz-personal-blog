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

// 首页展示组件：文章来自现有内容索引；首屏标题和介绍读取 content/index.md 的属性。
function HomeCover({ fileData, allFiles }: QuartzComponentProps) {
  // 复用目录树筛选可公开展示的文章，展开后按修改时间显示最近更新。
  const tree = buildDirectoryTree(allFiles)
  const flatten = (nodes: DirectoryTreeNode[]): DirectoryTreeNode["pages"] =>
    nodes.flatMap((node) => [...node.pages, ...flatten(node.children)])
  const pages = flatten(tree).sort(
    (a, b) => Number(b.dates?.modified ?? 0) - Number(a.dates?.modified ?? 0),
  )
  // 精选区域固定为三个分类入口，目录地址从真实文章 slug 提取，兼容大小写转换。
  const selected = [
    {
      title: "臭名昭著aTrust隔离计划",
      keyword: "atrust",
      cover: "aTrust",
      label: "NETWORK & SECURITY",
    },
    {
      title: "基于Quartz搭建的个人博客",
      keyword: "quartz",
      cover: "Quartz",
      label: "BUILD & CREATE",
    },
    { title: "Java", keyword: "java", cover: "Java", label: "LEARN & EXPLORE" },
  ].map((category) => {
    const node = tree.find((item) => item.name.toLowerCase().includes(category.keyword))
    const page = node ? flatten([node])[0] : undefined
    return { ...category, slug: page ? `${page.slug!.split("/")[0]}/index` : "index" }
  })
  const href = (slug: string) => resolveRelative(fileData.slug!, slug as FullSlug)
  return (
    <div class="home-editorial">
      <header class="editorial-header">
        <a class="editorial-brand" href={href("index")}>
          <span class="editorial-avatar">A</span>
          <span>
            Afyke<span class="editorial-subtitle">记录 · 思考 · 实践</span>
          </span>
        </a>
        <nav aria-label="首页导航">
          <a href="#home-articles">文章</a>
          <a href="#home-topics">分类</a>
          <a href="#home-intro">关于</a>
        </nav>
      </header>

      <main class="editorial-main">
        <section id="home-intro" class="afyke-ribbon-home" aria-label="Afyke 博客首页">
          <iframe
            class="afyke-ribbon-background"
            src={resolveRelative(fileData.slug!, "static/ribbon/index.html" as FullSlug)}
            title="流动彩带背景"
            aria-hidden="true"
            tabIndex={-1}
          />
          <section class="afyke-home-card" aria-labelledby="afyke-home-title">
            <div class="afyke-home-grid">
              <div class="afyke-home-copy">
                <p class="afyke-home-kicker">AFYKE BLOG · 技术与生活</p>
                <h1 id="afyke-home-title">
                  {String(fileData.frontmatter?.heroTitle ?? "把想法写下来，\n把问题弄明白。")}
                </h1>
                <div class="afyke-home-author">
                  <span class="afyke-home-avatar" aria-hidden="true">
                    A
                  </span>
                  <div>
                    <strong>Afyke</strong>
                    <span>开发者 / 持续学习者</span>
                  </div>
                </div>
                <p class="afyke-home-description">
                  {String(
                    fileData.frontmatter?.heroDescription ??
                      "记录开发实践、工具探索与个人项目，让每一次尝试都有迹可循。",
                  )}
                </p>
                {pages.length > 0 && (
                  <a class="afyke-home-cta internal" href="#home-articles">
                    开始阅读 <span aria-hidden="true"> →</span>
                  </a>
                )}
                <p class="afyke-home-count">已记录 {pages.length} 篇文章 · 保持好奇，持续记录。</p>
              </div>
              <div class="afyke-home-cover">
                <img
                  src={resolveRelative(
                    fileData.slug!,
                    "static/images/home-forest.webp" as FullSlug,
                  )}
                  alt="仰望秋日森林，橙色树冠与青蓝色天空交织"
                  width="1400"
                  height="738"
                  loading="eager"
                  fetchpriority="high"
                  decoding="async"
                />
              </div>
            </div>
          </section>
        </section>
        {/* 首屏下方沿用简洁的精选卡片、最近更新与分类布局。 */}
        <section class="editorial-featured" aria-labelledby="featured-title">
          <h2 id="featured-title">Featured articles</h2>
          <div class="editorial-cards">
            {selected.map((category, index) => (
              <a class="editorial-card internal" href={href(category.slug)}>
                <div class={`editorial-art editorial-art-${index}`} aria-hidden="true">
                  <span class="editorial-art-label">{category.label}</span>
                  <strong>{category.cover}</strong>
                  <span class="editorial-art-line">AFYKE / NOTES 0{index + 1}</span>
                </div>
                <h3>{category.title}</h3>
              </a>
            ))}
          </div>
        </section>
        <div class="editorial-columns">
          <section id="home-articles">
            <h2>All articles</h2>
            <div class="editorial-articles">
              {pages.map((page, index) => (
                <a class="editorial-row internal" href={href(page.slug!)} hidden={index >= 18}>
                  {/* 与列表排序一致，显示文章修改日期，按北京时间格式化。 */}
                  <span>
                    {page.dates?.modified
                      ? new Intl.DateTimeFormat("sv-SE", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          timeZone: "Asia/Shanghai",
                        }).format(page.dates.modified)
                      : "—"}
                  </span>
                  <h3>
                    {page.frontmatter!.title}
                    {/* 分类随文章目录生成，标签跟在标题后，不单独添加跳转。 */}
                    <span class="editorial-category-badge">{page.slug!.split("/")[0]}</span>
                  </h3>
                </a>
              ))}
            </div>
            {/* 全部文章按每页 18 篇切换，按钮由文章总数生成。 */}
            <nav class="editorial-pagination" aria-label="文章分页" data-current-page="1">
              <button type="button" data-page-step="-1" disabled>
                Previous
              </button>
              {Array.from({ length: Math.ceil(pages.length / 18) }, (_, index) => (
                <button
                  type="button"
                  data-page={index + 1}
                  aria-current={index === 0 ? "page" : undefined}
                >
                  {index + 1}
                </button>
              ))}
              <button type="button" data-page-step="1" disabled={pages.length <= 18}>
                Next
              </button>
            </nav>
          </section>
          <aside id="home-topics">
            <h2>Popular tags</h2>
            <div class="editorial-topics">
              {tree.map((node) => (
                <a
                  class="internal"
                  href={href(node.pages[0]?.slug ?? flatten(node.children)[0]?.slug ?? "index")}
                >
                  {node.name}
                  <span>{flatten([node]).length}</span>
                </a>
              ))}
            </div>
            <p class="editorial-aside-note">
              把遇到的问题写下来，
              <br />
              让零散的经验慢慢连接。
            </p>
          </aside>
        </div>
        <footer class="editorial-footer">
          <span>Afyke Blog</span>
          <span>保持好奇，持续记录。</span>
        </footer>
      </main>
    </div>
  )
}

const Body: QuartzComponent = (props: QuartzComponentProps) => {
  return (
    <div id="quartz-body">
      {/* 搜索目录供所有页面复用；首页单独展示封面，文章页继续使用原布局。 */}
      <SearchDirectory {...props} />
      {props.fileData.slug === "index" && <HomeCover {...props} />}
      {props.children}
    </div>
  )
}

export default (() => Body) satisfies QuartzComponentConstructor
