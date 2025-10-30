export interface Profile {
  id: string
  name: string
  email: string
  role: string
  status: "online" | "offline"
}

const CURRENT_PROFILE: Profile = {
  id: "user-1",
  name: "Дмитрий Поляков",
  email: "dmitry@ownspace.io",
  role: "Главный администратор",
  status: "online"
}

export async function getCurrentProfile(): Promise<Profile> {
  return CURRENT_PROFILE
}
