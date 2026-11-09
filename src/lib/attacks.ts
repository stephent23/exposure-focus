// What the flaw lets an attacker do, with the security property it breaks (CIA, plus authentication).
export const ATTACKS = {
  rce: { name: 'Remote code execution', property: 'Confidentiality, integrity and availability' },
  'privilege-escalation': { name: 'Privilege escalation', property: 'Confidentiality, integrity and availability' },
  'auth-bypass': { name: 'Authentication bypass', property: 'Authentication' },
  'data-exposure': { name: 'Data exposure', property: 'Confidentiality' },
  'data-tampering': { name: 'Data tampering', property: 'Integrity' },
  dos: { name: 'Denial of service', property: 'Availability' }
} as const;

export const ATTACK_KEYS = Object.keys(ATTACKS) as [keyof typeof ATTACKS, ...(keyof typeof ATTACKS)[]];
