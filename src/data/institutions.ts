import rawInstitutions from '../../Institutes.json';
import type { Institution } from '@/domain/models';

type RawInstitution = { Languages?: string; Name?: string; OMCode?: string; Url?: string | null };

export const institutions: Institution[] = (rawInstitutions as RawInstitution[])
  .filter((item): item is Required<Pick<RawInstitution, 'Name' | 'OMCode'>> & RawInstitution => Boolean(item.Name && item.OMCode))
  .map((item) => ({
    id: item.OMCode,
    name: item.Name.trim(),
    omCode: item.OMCode,
    url: item.OMCode === 'FI23344' ? 'https://neptun.bme.hu/hallgatoi/api' : item.Url ?? null,
    languages: (item.Languages ?? 'HU').split(','),
    provider: item.OMCode === 'FI23344' ? 'modern' as const : 'legacy' as const,
  }))
  .sort((left, right) => left.name.localeCompare(right.name, 'hu'));

export function getInstitution(id: string): Institution | undefined {
  return institutions.find((institution) => institution.id === id);
}
