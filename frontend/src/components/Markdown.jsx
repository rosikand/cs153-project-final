import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Compact markdown renderer for chat answers (links open in a new tab).
export default function Markdown({ children, className = '' }) {
  return (
    <div className={`prose-chat ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
        }}
      >
        {children || ''}
      </ReactMarkdown>
    </div>
  )
}
