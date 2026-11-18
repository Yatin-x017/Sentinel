export function generateActionPlan(findings) {
  if (!findings || findings.length === 0) return [];

  const allExposed = new Set();
  findings.forEach((f) => f.exposedFields.forEach((field) => allExposed.add(field)));

  const actions = [];
  let priority = 1;

  if (allExposed.has('password_hash') || allExposed.has('password')) {
    actions.push({
      id: 'act_change_password',
      priority: priority++,
      title: 'Change the password on the affected service',
      reason: 'A password or password hash was reported in a breach record.',
      categoryTrigger: 'password_hash'
    });
    actions.push({
      id: 'act_reused_passwords',
      priority: priority++,
      title: 'Update any other accounts that share that password',
      reason: 'Attackers test exposed credentials across other websites.',
      categoryTrigger: 'password_hash'
    });
  }

  actions.push({
    id: 'act_enable_mfa',
    priority: priority++,
    title: 'Enable multi-factor authentication (MFA)',
    reason: 'An authenticator app or security key blocks sign-ins even if a password is known.',
    categoryTrigger: 'email'
  });

  if (allExposed.has('phone_number')) {
    actions.push({
      id: 'act_watch_smishing',
      priority: priority++,
      title: 'Be cautious of unexpected SMS messages or calls',
      reason: 'Your phone number was listed alongside your email address.',
      categoryTrigger: 'phone_number'
    });
  }

  return actions;
}