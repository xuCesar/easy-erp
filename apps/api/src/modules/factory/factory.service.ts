import type { AuthPrincipal } from '../../core/auth';
import type { FactoryRecord, FactoryRepository } from './factory.repository';

export class FactoryService {
  constructor(private readonly factoryRepository: FactoryRepository) {}

  async listAccessible(principal: AuthPrincipal): Promise<FactoryRecord[]> {
    if (
      principal.roles.includes('TENANT_ADMIN') ||
      principal.dataScopes.some((scope) => scope.type === 'TENANT')
    ) {
      return this.factoryRepository.listAccessible(principal.tenantId);
    }

    const factoryIds = principal.dataScopes
      .filter((scope) => scope.type === 'FACTORY')
      .map((scope) => scope.factoryId);
    const orgUnitIds = principal.dataScopes
      .filter((scope) => scope.type === 'ORG_UNIT')
      .map((scope) => scope.orgUnitId);
    const [factoryScoped, orgScoped] = await Promise.all([
      this.factoryRepository.listAccessible(principal.tenantId, unique(factoryIds)),
      this.factoryRepository.listByOrgUnits(principal.tenantId, unique(orgUnitIds)),
    ]);

    return uniqueById([...factoryScoped, ...orgScoped]);
  }
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function uniqueById(records: FactoryRecord[]): FactoryRecord[] {
  return Array.from(new Map(records.map((record) => [record.id, record])).values());
}
