/**
 * キーボードショートカットのカスタムフック
 * Enter: 処理開始
 * Esc: ファイル選択をクリア/処理をキャンセル
 * Ctrl/Cmd+S: バッチダウンロード
 */

import { useEffect, useCallback } from 'react'

export interface KeyboardShortcutHandlers {
  onEnter?: () => void
  onEscape?: () => void
  onSave?: () => void
  enabled?: boolean
}

export function useKeyboardShortcuts({
  onEnter,
  onEscape,
  onSave,
  enabled = true,
}: KeyboardShortcutHandlers) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // 入力フィールドでの操作は無視
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        // Escapeは入力フィールドでも動作させる
        if (event.key === 'Escape' && onEscape) {
          event.preventDefault()
          onEscape()
        }
        return
      }

      // Enter: 処理開始
      if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && onEnter) {
        event.preventDefault()
        onEnter()
      }

      // Escape: キャンセル
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault()
        onEscape()
      }

      // Ctrl/Cmd+S: 保存
      if (
        event.key === 's' &&
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        onSave
      ) {
        event.preventDefault()
        onSave()
      }
    },
    [enabled, onEnter, onEscape, onSave]
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, enabled])
}

/**
 * グローバルキーボードショートカット
 * アプリ全体で使用するショートカット
 */
export function useGlobalShortcuts() {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ctrl/Cmd+/: ヘルプ表示
    if (
      event.key === '/' &&
      (event.ctrlKey || event.metaKey) &&
      !event.shiftKey
    ) {
      event.preventDefault()
      console.log('Keyboard Shortcuts:')
      console.log('Enter: Start processing')
      console.log('Escape: Clear files/Cancel')
      console.log('Ctrl/Cmd+S: Batch download')
      console.log('Ctrl/Cmd+/: Show this help')
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}