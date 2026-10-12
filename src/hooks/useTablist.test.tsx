import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { useTablist } from './useTablist'

const ids = ['one', 'two', 'three'] as const

function Tabs() {
  const [active, setActive] = useState<(typeof ids)[number]>('one')
  const { tabProps } = useTablist(ids, active, setActive, (id) => `tab-${id}`)
  return (
    <div role="tablist">
      {ids.map((id) => (
        <button key={id} type="button" onClick={() => setActive(id)} {...tabProps(id)}>
          {id}
        </button>
      ))}
    </div>
  )
}

afterEach(cleanup)

const tab = (name: string) => screen.getByRole('tab', { name })

describe('useTablist', () => {
  it('keeps only the selected tab in the Tab order', () => {
    render(<Tabs />)
    expect(tab('one').tabIndex).toBe(0)
    expect(tab('two').tabIndex).toBe(-1)
  })

  it('moves selection and focus with arrows, wrapping at both ends', () => {
    render(<Tabs />)
    act(() => tab('one').focus())
    fireEvent.keyDown(tab('one'), { key: 'ArrowRight' })
    expect(tab('two').getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(tab('two'))

    fireEvent.keyDown(tab('two'), { key: 'ArrowLeft' })
    fireEvent.keyDown(tab('one'), { key: 'ArrowLeft' })
    expect(tab('three').getAttribute('aria-selected')).toBe('true')
  })

  it('jumps to the ends with Home and End and ignores other keys', () => {
    render(<Tabs />)
    fireEvent.keyDown(tab('one'), { key: 'End' })
    expect(tab('three').getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(tab('three'), { key: 'Home' })
    expect(tab('one').getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(tab('one'), { key: 'a' })
    expect(tab('one').getAttribute('aria-selected')).toBe('true')
  })
})
