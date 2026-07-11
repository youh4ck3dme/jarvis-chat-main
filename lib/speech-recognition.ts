/**
 * Web Speech API helpers (browser dictation in Composer).
 * Note: Chrome/Safari send audio to cloud STT — "network" means that service is unreachable.
 */

export type SpeechRecognitionErrorCode =
  | "network"
  | "not-allowed"
  | "aborted"
  | "no-speech"
  | "audio-capture"
  | "service-not-allowed"
  | string

export function resolveSpeechRecognitionLang(): string {
  if (typeof navigator === "undefined") return "en-US"
  const lang = navigator.language?.trim()
  return lang || "en-US"
}

export function isIgnorableSpeechError(error: SpeechRecognitionErrorCode): boolean {
  return error === "aborted" || error === "no-speech"
}

export function getSpeechRecognitionErrorMessage(
  error: SpeechRecognitionErrorCode,
  options?: { desktopAgentOnline?: boolean },
): string {
  const desktopOnline = options?.desktopAgentOnline ?? false

  switch (error) {
    case "network":
      if (desktopOnline) {
        return "Web diktovanie nie je dostupné. Na Macu môžeš použiť Desktop JARVIS (Gemini Live hlas)."
      }
      return "Web diktovanie nie je dostupné (Google Speech API). Skús iný prehliadač, VPN vypnúť, alebo na Macu Desktop JARVIS."

    case "not-allowed":
    case "service-not-allowed":
      return "Mikrofón zablokovaný. Povoľ prístup v nastaveniach prehliadača alebo macOS."

    case "audio-capture":
      return "Mikrofón sa nepodarilo zachytiť. Skontroluj zvukové zariadenie."

    case "no-speech":
      return "Nič som nepočul — skús hovoriť bližšie k mikrofónu."

    default:
      return `Hlasový vstup zlyhal (${error}).`
  }
}