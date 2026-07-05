export function renderCommentBody(body: string) {
  const parts = body.split(/(@[a-zA-Z0-9_]+)/g)
  return parts.map((part, index) => {
    if (/^@[a-zA-Z0-9_]+$/.test(part)) {
      return (
        <span key={`${part}-${index}`} className="cm-comment__mention">
          {part}
        </span>
      )
    }
    return part
  })
}
