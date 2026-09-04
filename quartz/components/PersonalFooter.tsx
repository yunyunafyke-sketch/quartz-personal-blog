import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { joinSegments, pathToRoot } from "../util/path"

// @ts-ignore
import script from "./scripts/personal-footer.inline"
import styles from "./styles/personal-footer.scss"

interface PersonalFooterOptions {
  author?: string
  githubUrl?: string
  coffeeText?: string
  qrImage?: string
}

const defaultOptions: Required<PersonalFooterOptions> = {
  author: "Afyke",
  githubUrl: "https://github.com/yunyunafyke-sketch",
  coffeeText: "如果对您有用，可以请我喝一杯 Coffee ☕",
  qrImage: "static/images/alipay-qr.jpg",
}

export default ((userOptions?: PersonalFooterOptions) => {
  const options = { ...defaultOptions, ...userOptions }

  const PersonalFooter: QuartzComponent = ({ displayClass, fileData }: QuartzComponentProps) => {
    const year = new Date().getFullYear()
    // 使用相对站点根目录的路径，保证深层笔记页面也能正确加载支付宝收款码。
    const qrImage = joinSegments(pathToRoot(fileData.slug!), options.qrImage)

    return (
      <footer class={classNames(displayClass, "personal-footer")}>
        <p class="personal-footer__copyright">
          <span>{options.author}</span> © {year}
        </p>

        <div class="personal-footer__actions" aria-label="站点相关链接">
          <a
            class="personal-footer__action personal-footer__github"
            href={options.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.2c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.57-.29-5.27-1.29-5.27-5.68 0-1.25.45-2.28 1.2-3.08-.12-.3-.52-1.47.11-3.05 0 0 .97-.31 3.16 1.18A11 11 0 0 1 12 6.15c.98 0 1.95.13 2.87.39 2.2-1.5 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.05.75.8 1.2 1.83 1.2 3.08 0 4.4-2.71 5.38-5.29 5.67.42.36.79 1.07.79 2.16v3.22c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
            </svg>
            <span>GitHub</span>
          </a>

          <button
            class="personal-footer__action personal-footer__coffee"
            type="button"
            data-coffee-open
            aria-haspopup="dialog"
          >
            <span aria-hidden="true">☕</span>
            <span>{options.coffeeText}</span>
          </button>
        </div>

        <div class="personal-footer__modal" data-coffee-modal role="presentation" hidden>
          <section
            class="personal-footer__modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="personal-footer-coffee-title"
            tabIndex={-1}
          >
            <button
              class="personal-footer__modal-close"
              type="button"
              data-coffee-close
              aria-label="关闭支付宝收款码"
              title="关闭"
            >
              ×
            </button>
            <h2 id="personal-footer-coffee-title">请我喝一杯 Coffee ☕</h2>
            <p>感谢您的支持，打开支付宝扫一扫即可。</p>
            <img src={qrImage} alt={`${options.author} 的支付宝收款码`} loading="lazy" />
          </section>
        </div>
      </footer>
    )
  }

  PersonalFooter.css = styles
  PersonalFooter.afterDOMLoaded = script
  return PersonalFooter
}) satisfies QuartzComponentConstructor<PersonalFooterOptions>
