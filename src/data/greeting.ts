export function greetingFor(date: Date, name: string): string {
  const hour = date.getHours();
  const greeting = hour < 10 ? 'Jó reggelt' : hour < 18 ? 'Jó napot' : 'Jó estét';
  return `${greeting}, ${name}!`;
}
