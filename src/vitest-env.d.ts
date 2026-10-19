/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import matchers = require('@testing-library/jest-dom')

declare global {
  namespace vitest {
    interface Assertion<T = any>
      extends matchers.TestingLibraryMatchers<any, T> {}
  }
}