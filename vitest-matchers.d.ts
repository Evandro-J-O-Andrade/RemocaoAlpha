import type { TestingLibraryMatchers } from '@testing-library/jest-dom/types'

declare global {
  namespace vitest {
    interface Matchers<T = void> extends TestingLibraryMatchers<ReturnType<typeof expect.stringContaining>, T> {}
  }
}