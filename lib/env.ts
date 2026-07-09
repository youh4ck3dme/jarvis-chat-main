import { z } from "zod"

import { DEFAULT_AI_MODEL } from "@/lib/default-model"

const requiredString = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1, "Environment variable cannot be empty"))

const optionalString = z
  .string()
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined
    }
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  })

const envSchema = z.object({
  MISTRAL_API_KEY: requiredString,
  DEFAULT_AI_MODEL: optionalString,
  NEXT_PUBLIC_DEFAULT_AI_MODEL: optionalString,
  BLOB_READ_WRITE_TOKEN: optionalString,
  PORT: optionalString,
  BUILDER_UNLOCK_PASSWORD: optionalString,
})

const envResult = envSchema.safeParse(process.env)

if (!envResult.success) {
  const formattedErrors = envResult.error.errors
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("; ")
  throw new Error(`Invalid environment configuration: ${formattedErrors}`)
}

const withDefaults = {
  ...envResult.data,
  DEFAULT_AI_MODEL: envResult.data.DEFAULT_AI_MODEL ?? DEFAULT_AI_MODEL,
  NEXT_PUBLIC_DEFAULT_AI_MODEL:
    envResult.data.NEXT_PUBLIC_DEFAULT_AI_MODEL ?? envResult.data.DEFAULT_AI_MODEL ?? DEFAULT_AI_MODEL,
}

export const env = {
  MISTRAL_API_KEY: withDefaults.MISTRAL_API_KEY,
  DEFAULT_AI_MODEL: withDefaults.DEFAULT_AI_MODEL,
  NEXT_PUBLIC_DEFAULT_AI_MODEL: withDefaults.NEXT_PUBLIC_DEFAULT_AI_MODEL,
  BLOB_READ_WRITE_TOKEN: withDefaults.BLOB_READ_WRITE_TOKEN,
  PORT: withDefaults.PORT,
  BUILDER_UNLOCK_PASSWORD: withDefaults.BUILDER_UNLOCK_PASSWORD,
}

export type Env = typeof env