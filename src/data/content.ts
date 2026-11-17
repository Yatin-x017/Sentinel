export const STEPS = [
  { title: "Enter your email", body: "Type the address you want checked. Nothing else is needed." },
  {
    title: "Sentinel searches breach databases",
    body: "It looks through records of leaks, pastes and stealer logs where an address can turn up.",
  },
  { title: "You get a plain list", body: "Each result says where your email appeared and what to do about it." },
] as const

export const SAMPLE = [
  { source: "Breach list", what: "Email and password", todo: "Change the password. Turn on two-step sign-in." },
  { source: "Paste site", what: "Email only", todo: "Watch for scam messages. No action needed." },
  { source: "Stealer log", what: "Email and saved logins", todo: "Run a malware scan. Change passwords from a clean device." },
] as const
