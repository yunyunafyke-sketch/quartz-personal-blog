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
  // 优先挑选 Quartz、Java、Git 各一篇作为入口，不足三篇时由其他文章补齐。
  const featured = ["Quartz", "Java", "Git"]
    .map((keyword) => pages.find((page) => page.frontmatter?.title?.includes(keyword)))
    .filter((page, index, items) => page && items.indexOf(page) === index)
  const selected = [...featured, ...pages.filter((page) => !featured.includes(page))].slice(0, 3)
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
        <section id="home-intro" class="stripe-stage">
          {/* 彩带外框保持斜向直边，内部通过 SVG 曲线变形制造交错流动感。 */}
          <div class="stripe-ribbon" aria-hidden="true">
            <svg class="ribbon-mesh" viewBox="0 0 1600 300" preserveAspectRatio="none">
              {/* 主色层减少薄荷、浅粉与浅蓝，集中使用紫、红、金橙；青蓝层缩窄至原来的 65%。
                  所有色标独立循环换色，避免上下边缘固定为同一颜色。
                  曲线变形控制色块位置，色标动画控制配色，两者使用不同周期。 */}
              <defs>
                <linearGradient id="ribbon-base" x2="1" y2="1">
                  <stop stop-color="#ffd257">
                    <animate
                      attributeName="stop-color"
                      values="#ffd257;#a75aee;#ffb965;#ffd257"
                      dur="9s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset=".28" stop-color="#ffb965">
                    <animate
                      attributeName="stop-color"
                      values="#ffb965;#ff536b;#aa55e8;#ffb965"
                      dur="10s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset=".55" stop-color="#ffd05c">
                    <animate
                      attributeName="stop-color"
                      values="#ffd05c;#ffb965;#cc55bb;#ffd05c"
                      dur="11s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset=".8" stop-color="#ef638f">
                    <animate
                      attributeName="stop-color"
                      values="#ef638f;#aa55e8;#ffd257;#ef638f"
                      dur="12s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset="1" stop-color="#ffc344">
                    <animate
                      attributeName="stop-color"
                      values="#ffc344;#cc55bb;#9858e5;#ffc344"
                      dur="9s"
                      repeatCount="indefinite"
                    />
                  </stop>
                </linearGradient>
                <linearGradient id="ribbon-violet" x2="1" y2=".3">
                  <stop stop-color="#9270f5">
                    <animate
                      attributeName="stop-color"
                      values="#9270f5;#ffd257;#a75aee;#9270f5"
                      dur="10s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset=".18" stop-color="#a75aee">
                    <animate
                      attributeName="stop-color"
                      values="#a75aee;#9858e5;#ff536b;#a75aee"
                      dur="11s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset=".38" stop-color="#9971f4">
                    <animate
                      attributeName="stop-color"
                      values="#9971f4;#a75aee;#ffb965;#9971f4"
                      dur="12s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset=".55" stop-color="#e26adf">
                    <animate
                      attributeName="stop-color"
                      values="#e26adf;#ff536b;#aa55e8;#e26adf"
                      dur="9s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset=".7" stop-color="#bc58df">
                    <animate
                      attributeName="stop-color"
                      values="#bc58df;#ffb965;#cc55bb;#bc58df"
                      dur="10s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset="1" stop-color="#9b60eb">
                    <animate
                      attributeName="stop-color"
                      values="#9b60eb;#aa55e8;#ffd257;#9b60eb"
                      dur="11s"
                      repeatCount="indefinite"
                    />
                  </stop>
                </linearGradient>
                <linearGradient id="ribbon-coral" x2="1" y2=".7">
                  <stop stop-color="#ff354e">
                    <animate
                      attributeName="stop-color"
                      values="#ff354e;#cc55bb;#9858e5;#ff354e"
                      dur="12s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset=".2" stop-color="#ff73b8">
                    <animate
                      attributeName="stop-color"
                      values="#ff73b8;#ffd257;#a75aee;#ff73b8"
                      dur="9s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset=".45" stop-color="#ff515c">
                    <animate
                      attributeName="stop-color"
                      values="#ff515c;#9858e5;#ff536b;#ff515c"
                      dur="10s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset=".6" stop-color="#ff824c">
                    <animate
                      attributeName="stop-color"
                      values="#ff824c;#a75aee;#ffb965;#ff824c"
                      dur="11s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset=".75" stop-color="#ff344b">
                    <animate
                      attributeName="stop-color"
                      values="#ff344b;#ff536b;#aa55e8;#ff344b"
                      dur="12s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset="1" stop-color="#ff996c">
                    <animate
                      attributeName="stop-color"
                      values="#ff996c;#ffb965;#cc55bb;#ff996c"
                      dur="9s"
                      repeatCount="indefinite"
                    />
                  </stop>
                </linearGradient>
                <linearGradient id="ribbon-cyan" x2="1" y2=".4">
                  <stop stop-color="#78e2cd">
                    <animate
                      attributeName="stop-color"
                      values="#78e2cd;#78e2cd;#ffd257;#78e2cd"
                      dur="10s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset=".25" stop-color="#66d8f7">
                    <animate
                      attributeName="stop-color"
                      values="#66d8f7;#e27ace;#80dcf9;#66d8f7"
                      dur="11s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset=".5" stop-color="#80dcf9">
                    <animate
                      attributeName="stop-color"
                      values="#80dcf9;#ffd257;#a75aee;#80dcf9"
                      dur="12s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset=".75" stop-color="#8fa3f7">
                    <animate
                      attributeName="stop-color"
                      values="#8fa3f7;#80dcf9;#ff536b;#8fa3f7"
                      dur="9s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset="1" stop-color="#78e1ed">
                    <animate
                      attributeName="stop-color"
                      values="#78e1ed;#a75aee;#ffb965;#78e1ed"
                      dur="10s"
                      repeatCount="indefinite"
                    />
                  </stop>
                </linearGradient>
                {/* 每层独立改变模糊半径，让清晰曲线与柔和交融交替出现。 */}
                {[
                  { id: "ribbon-soft", duration: "7s", values: "2;20;5;27;2" },
                  { id: "ribbon-soft-coral", duration: "9s", values: "22;3;26;7;22" },
                  { id: "ribbon-soft-cyan", duration: "6.5s", values: "12;1;22;4;12" },
                ].map(({ id, duration, values }) => (
                  <filter id={id} x="-20%" y="-50%" width="140%" height="200%">
                    <feGaussianBlur stdDeviation="12">
                      <animate
                        attributeName="stdDeviation"
                        values={values}
                        dur={duration}
                        repeatCount="indefinite"
                      />
                    </feGaussianBlur>
                  </filter>
                ))}
              </defs>
              <path fill="url(#ribbon-base)" d="M-100 -100H1700V400H-100Z" />
              {/* 三层曲面分别以 6、7.5、8.5 秒循环；红色窄曲面与青蓝曲面反向穿插，
                  紫色大曲面承托交叠，避免所有色带沿同一方向平行移动。
                  每组路径保持相同命令结构；不对称时间节点和缓动曲线产生快慢交替，首尾闭合循环。 */}
              <g>
                <path
                  fill="url(#ribbon-violet)"
                  filter="url(#ribbon-soft)"
                  d="M-100 -30C300 10 520 260 900 190S1350 60 1700 160L1700 400H-100Z"
                >
                  <animate
                    attributeName="d"
                    dur="6s"
                    repeatCount="indefinite"
                    values="M-100 -30C300 10 520 260 900 190S1350 60 1700 160L1700 400H-100Z;M-100 210C300 340 520 20 900 50S1350 240 1700 300L1700 400H-100Z;M-100 -30C300 10 520 260 900 190S1350 60 1700 160L1700 400H-100Z"
                    calcMode="spline"
                    keyTimes="0;.38;1"
                    keySplines=".65 0 .2 1;.2 .05 .75 1"
                  />
                </path>
                <path
                  fill="url(#ribbon-coral)"
                  filter="url(#ribbon-soft-coral)"
                  d="M-100 210C300 220 650 50 1000 20S1400 -30 1700 60L1700 155C1300 40 950 160 650 210S150 320 -100 270Z"
                >
                  <animate
                    attributeName="d"
                    dur="7.5s"
                    repeatCount="indefinite"
                    values="M-100 210C300 220 650 50 1000 20S1400 -30 1700 60L1700 155C1300 40 950 160 650 210S150 320 -100 270Z;M-100 -20C300 0 650 260 1000 250S1400 150 1700 90L1700 210C1300 320 950 350 650 290S150 100 -100 70Z;M-100 210C300 220 650 50 1000 20S1400 -30 1700 60L1700 155C1300 40 950 160 650 210S150 320 -100 270Z"
                    calcMode="spline"
                    keyTimes="0;.63;1"
                    keySplines=".35 0 .8 1;.7 0 .15 1"
                  />
                </path>
                <path
                  fill="url(#ribbon-cyan)"
                  transform="translate(0 55) scale(1 .65)"
                  filter="url(#ribbon-soft-cyan)"
                  opacity=".9"
                  d="M-100 20C250 20 530 180 900 290S1400 220 1700 120L1700 250C1300 390 1000 360 700 230S180 100 -100 110Z"
                >
                  <animate
                    attributeName="d"
                    dur="8.5s"
                    repeatCount="indefinite"
                    values="M-100 20C250 20 530 180 900 290S1400 220 1700 120L1700 250C1300 390 1000 360 700 230S180 100 -100 110Z;M-100 320C250 260 530 80 900 -20S1400 30 1700 130L1700 220C1300 140 1000 80 700 150S180 400 -100 400Z;M-100 20C250 20 530 180 900 290S1400 220 1700 120L1700 250C1300 390 1000 360 700 230S180 100 -100 110Z"
                    calcMode="spline"
                    keyTimes="0;.44;1"
                    keySplines=".75 0 .15 1;.3 0 .85 1"
                  />
                </path>
              </g>
            </svg>
          </div>
          {/* 首屏左右分栏：左侧介绍可在 index.md 修改，右侧文章数量随内容自动更新。 */}
          <div class="stripe-card">
            <div class="stripe-copy">
              <p class="stripe-kicker">AFYKE BLOG · 技术与生活</p>
              <h1>{String(fileData.frontmatter?.heroTitle ?? "把想法写下来，\n把问题弄明白。")}</h1>
              <div class="stripe-author">
                <span class="editorial-avatar">A</span>
                <span>
                  <strong>Afyke</strong>
                  <small>开发者 / 持续学习者</small>
                </span>
              </div>
              <p class="stripe-description">
                {String(
                  fileData.frontmatter?.heroDescription ??
                    "记录开发实践、工具探索与个人项目，让每一次尝试都有迹可循。",
                )}
              </p>
              <a class="stripe-cta" href="#home-articles">
                开始阅读 <span aria-hidden="true">→</span>
              </a>
            </div>
            <div class="stripe-visual" aria-label={`已收录 ${pages.length} 篇文章`}>
              <div class="stripe-type-pattern" aria-hidden="true">
                BUILD
                <br />
                LEARN
                <br />
                SHARE
              </div>
              <span class="stripe-visual-brand">afyke /</span>
              <div class="stripe-visual-bottom">
                <strong>
                  {pages.length}
                  <span>篇</span>
                </strong>
                <p>在实践中探索，在记录中生长。</p>
                <span>CODE · NOTES · IDEAS</span>
              </div>
            </div>
          </div>
        </section>
        {/* 首屏下方沿用简洁的精选卡片、最近更新与分类布局。 */}
        <section class="editorial-featured" aria-labelledby="featured-title">
          <h2 id="featured-title">从这里开始</h2>
          <div class="editorial-cards">
            {selected.map((page, index) => (
              <a class="editorial-card internal" href={href(page!.slug!)}>
                <div class={`editorial-art editorial-art-${index}`} aria-hidden="true">
                  <span class="editorial-art-label">
                    {["BUILD & CREATE", "LEARN & EXPLORE", "TOOLS & WORKFLOW"][index]}
                  </span>
                  <strong>{["{ }", "Java", "git /"][index]}</strong>
                  <span class="editorial-art-line">AFYKE / NOTES 0{index + 1}</span>
                </div>
                <h3>{page!.frontmatter!.title}</h3>
              </a>
            ))}
          </div>
        </section>
        <div class="editorial-columns">
          <section id="home-articles">
            <h2>最近更新</h2>
            <div class="editorial-articles">
              {pages.slice(0, 18).map((page) => (
                <a class="editorial-row internal" href={href(page.slug!)}>
                  <span>{page.slug!.split("/")[0]}</span>
                  <h3>{page.frontmatter!.title}</h3>
                  <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </section>
          <aside id="home-topics">
            <h2>内容分类</h2>
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
