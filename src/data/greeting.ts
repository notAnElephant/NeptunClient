export function defaultNickname(fullName: string): string {
  const names = fullName.trim().split(/\s+/).filter(Boolean);
  return names[1] ?? names[0] ?? '';
}

export function greetingFor(name: string): string {
  return `Helló, ${name}`;
}
