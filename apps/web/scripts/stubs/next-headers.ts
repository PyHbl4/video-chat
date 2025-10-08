export async function cookies() {
  throw new Error("cookies() stub should not be called in smoke test")
}

export async function headers() {
  return {
    get() {
      return null
    }
  }
}
