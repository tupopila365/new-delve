import { useRef, type KeyboardEvent, type RefObject, type TextareaHTMLAttributes } from 'react'
import { useHashtagComposer, type HashtagComposerConfig } from '../../hooks/useHashtagComposer'
import type { MessageComposerTheme } from './MessageComposer'
import { HashtagSuggestMenu } from './HashtagSuggestMenu'
import './HashtagSuggestMenu.css'
import './MessageComposer.css'

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
  value: string
  onChange: (value: string) => void
  theme?: MessageComposerTheme
  hashtags?: HashtagComposerConfig | false
  inputClassName?: string
  inputRef?: RefObject<HTMLTextAreaElement | null>
  onComposerKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void
}

export function HashtagTextarea({
  value,
  onChange,
  theme = 'dark',
  hashtags = false,
  className = '',
  inputClassName = '',
  inputRef: inputRefProp,
  onComposerKeyDown,
  onKeyDown,
  ...rest
}: Props) {
  const localRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = inputRefProp ?? localRef
  const enabled = Boolean(hashtags)
  const composer = useHashtagComposer({
    value,
    onChange,
    enabled,
    inputRef,
    scope: hashtags ? hashtags.scope : undefined,
    maxTags: hashtags ? hashtags.maxTags : undefined,
    onMaxTags: hashtags ? hashtags.onMaxTags : undefined,
  })

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (composer.onKeyDown(event)) return
    onComposerKeyDown?.(event)
    onKeyDown?.(event)
  }

  const textarea = (
    <textarea
      ref={inputRef}
      className={
        inputClassName || `composer-pill-input composer-pill-input--${theme}`
      }
      value={value}
      {...(enabled ? composer.fieldHandlers : { onChange: (event) => onChange(event.target.value) })}
      onKeyDown={handleKeyDown}
      {...rest}
    />
  )

  if (!enabled) return textarea

  return (
    <div className={`hashtag-field${className ? ` ${className}` : ''}`}>
      <HashtagSuggestMenu
        open={composer.menuOpen}
        suggestions={composer.suggestions}
        selectedIndex={composer.selectedIndex}
        isLoading={composer.isLoading}
        theme={theme}
        onPick={composer.pickSlug}
        onHover={composer.setSelectedIndex}
      />
      {textarea}
    </div>
  )
}
