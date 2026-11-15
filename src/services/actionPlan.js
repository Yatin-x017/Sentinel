/*
 * Builds the action plan from the scan's real findings.
 * Priorities are only assigned when the evidence supports them.
 */
export function buildActionPlan(scan) {
  const findings = scan?.findings ?? []
  if (!findings.length) return []

  const hasHash = findings.filter((f) => f.fields.some((x) => /password/i.test(x)))
  const hasEmail = findings.some((f) => f.fields.includes('Email'))
  const plan = []

  hasHash.forEach((f) =>
    plan.push({
      id: `pw-${f.id}`,
      group: 'first',
      title: `Change your password for ${f.title}`,
      body: `A password hash was reported in this record. Change the password for this service, and for any other account where you used the same one.`,
    }),
  )
  plan.push({
    id: 'mfa',
    group: 'next',
    title: 'Turn on two-step verification for your email',
    body: 'Your email account can reset your other accounts, so it is the most useful one to protect.',
  })
  if (hasEmail)
    plan.push({
      id: 'phish',
      group: 'next',
      title: 'Treat unexpected messages with care',
      body: 'Your email address was reported, so you may get more convincing scam messages. Do not open links or attachments you were not expecting.',
    })
  plan.push({
    id: 'manager',
    group: 'review',
    title: 'Use a different password for every account',
    body: 'A password manager can create and remember them for you, so one reported record cannot unlock anything else.',
  })
  return plan
}

export const GROUPS = [
  { id: 'first', title: 'Do first' },
  { id: 'next', title: 'Do next' },
  { id: 'review', title: 'Good to review' },
]
