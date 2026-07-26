import { describe, it, expect, vi } from 'vitest'
import { useInfiniteScroll } from './useInfiniteScroll'
import { PAGE_SIZE } from '../lib/productos'

describe('useInfiniteScroll — pure logic tests', () => {
  it('exports correct types and PAGE_SIZE', () => {
    expect(PAGE_SIZE).toBe(50)
    expect(typeof useInfiniteScroll).toBe('function')
  })

  it('PAGE_SIZE is 50 (default for hook)', () => {
    // The hook defaults pageSize to PAGE_SIZE from productos.ts
    expect(PAGE_SIZE).toBe(50)
  })
})
