import rawInstitutions from '../../Institutes.json';
import type { Institution } from '@/domain/models';
import { matchesSearch } from '@/data/search';

type RawInstitution = { Languages?: string; Name?: string; OMCode?: string; Url?: string | null };

const BME_OM_CODE = 'FI23344';
const ELTE_OM_CODE = 'FI80798';

const institutionAliases: Readonly<Record<string, readonly string[]>> = {
  [BME_OM_CODE]: ['BME'],
  [ELTE_OM_CODE]: ['ELTE'],
};

export const institutions: Institution[] = (rawInstitutions as RawInstitution[])
  .filter((item): item is Required<Pick<RawInstitution, 'Name' | 'OMCode'>> & RawInstitution => Boolean(item.Name && item.OMCode))
  .map((item) => ({
    id: item.OMCode,
    name: item.Name.trim(),
    omCode: item.OMCode,
    url: item.OMCode === BME_OM_CODE
      ? 'https://neptun.bme.hu/hallgatoi/api'
      : item.OMCode === ELTE_OM_CODE
        ? 'https://hallgato2.neptun.elte.hu/api'
        : item.Url ?? null,
    languages: (item.Languages ?? 'HU').split(','),
    provider: item.OMCode === BME_OM_CODE || item.OMCode === ELTE_OM_CODE ? 'modern' as const : 'legacy' as const,
    authenticationMode: item.OMCode === ELTE_OM_CODE ? 'external' as const : 'credentials' as const,
  }))
  .sort((left, right) => left.name.localeCompare(right.name, 'hu'));

export function getInstitution(id: string): Institution | undefined {
  return institutions.find((institution) => institution.id === id);
}

export function institutionMatchesSearch(institution: Institution, query: string): boolean {
  const aliases = institutionAliases[institution.omCode] ?? [];
  return matchesSearch([institution.name, institution.omCode, ...aliases].join(' '), query);
}
