export const STEPS = [
  { title: "Enter your email", body: "Type the address you want checked. We only need the address itself." },
  {
    title: "Verify your inbox",
    body: "A short-lived one-time code confirms that you control the address before a scan starts.",
  },
  {
    title: "Review the scan",
    body: "The demo checks synthetic source fixtures and labels findings with the matching source and exposed fields.",
  },
] as const

export const SAMPLE = [
  { source: "Breach list", what: "Email and password", todo: "Change the password. Turn on two-step sign-in." },
  { source: "Paste site", what: "Email only", todo: "Watch for scam messages. No action needed." },
  { source: "Stealer log", what: "Email and saved logins", todo: "Run a malware scan. Change passwords from a clean device." },
] as const
