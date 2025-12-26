export type User = { id: string; email?: string | null }

export async function requireUser(): Promise<User> {
  if (process.env.REZKYOO_DISABLE_AUTH === "true") {
    return { id: "dev-user", email: "dev@local" }
  }

  // TODO: wire real auth provider.
  return { id: "dev-user", email: "dev@local" }
}

export async function optionalUser(): Promise<User | null> {
  if (process.env.REZKYOO_DISABLE_AUTH === "true") {
    return { id: "dev-user", email: "dev@local" }
  }

  return null
}
