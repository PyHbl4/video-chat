import { createInitialFormState } from "./types"

import type { LoginFields, RegisterFields } from "./actions"

export const initialLoginState = createInitialFormState<LoginFields>()
export const initialRegisterState = createInitialFormState<RegisterFields>()
