import ReactMarkdown, { type Components } from 'react-markdown'

interface MarkdownContentProps {
  children: string
  /** 行内场景（选项）：不输出块级容器；配合 label 使用。 */
  inline?: boolean
  className?: string
}

const codeClassName =
  'rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] text-slate-800 [overflow-wrap:anywhere] dark:bg-slate-800 dark:text-slate-100'

const blockComponents: Components = {
  p: ({ children }) => (
    <p className="my-2 break-words leading-relaxed first:mt-0 last:mb-0">{children}</p>
  ),
  pre: ({ children }) => (
    <pre className="my-3 max-w-full overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100 dark:bg-black/60">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className?.includes('language-')) || String(children).includes('\n')
    if (isBlock) return <code className="font-mono">{children}</code>
    return <code className={codeClassName}>{children}</code>
  },
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-4 border-slate-300 pl-3 text-slate-600 dark:border-slate-600 dark:text-slate-300">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="break-words text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="my-3 max-w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-slate-300 px-2 py-1 text-left font-semibold dark:border-slate-600">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-slate-300 px-2 py-1 dark:border-slate-600">{children}</td>
  ),
}

/** 选项内的 Markdown：用 span 承载，避免在 label 中产生块级元素。 */
const inlineComponents: Components = {
  p: ({ children }) => <span className="block">{children}</span>,
  pre: ({ children }) => (
    <span className="my-1 block max-w-full overflow-x-auto rounded bg-slate-900 p-2 text-xs text-slate-100">
      {children}
    </span>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className?.includes('language-')) || String(children).includes('\n')
    if (isBlock) return <code className="font-mono">{children}</code>
    return <code className={codeClassName}>{children}</code>
  },
  ul: ({ children }) => <span className="block">{children}</span>,
  ol: ({ children }) => <span className="block">{children}</span>,
  li: ({ children }) => <span className="block">· {children}</span>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="break-words text-blue-600 underline underline-offset-2 dark:text-blue-400"
    >
      {children}
    </a>
  ),
}

/** 不启用 rehype-raw：题库中的原始 HTML 不会被渲染。 */
export default function MarkdownContent({
  children,
  inline = false,
  className = '',
}: MarkdownContentProps) {
  const content = children?.trim() ?? ''
  if (!content) return null

  const classes = [
    inline ? 'block' : 'min-w-0 max-w-full',
    'break-words',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (inline) {
    return (
      <span className={classes}>
        <ReactMarkdown components={inlineComponents}>{content}</ReactMarkdown>
      </span>
    )
  }

  return (
    <div className={classes}>
      <ReactMarkdown components={blockComponents}>{content}</ReactMarkdown>
    </div>
  )
}
