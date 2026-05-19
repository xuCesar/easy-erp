import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateOrgUnitInput,
  OrganizationRepository,
  OrgUnitRecord,
  UpdateOrgUnitInput,
} from './organization.repository';

export type OrgUnitTreeNode = OrgUnitRecord & {
  children: OrgUnitTreeNode[];
};

export type ListOrgTreeInput = {
  tenantId: string;
  factoryId: string;
};

export type RemoveOrgUnitInput = {
  tenantId: string;
  id: string;
};

@Injectable()
export class OrganizationService {
  constructor(private readonly organizationRepository: OrganizationRepository) {}

  async listTree(input: ListOrgTreeInput): Promise<OrgUnitTreeNode[]> {
    const units = await this.organizationRepository.listByFactory(
      input.tenantId,
      input.factoryId,
    );

    return buildOrgTree(units);
  }

  async create(input: CreateOrgUnitInput): Promise<OrgUnitRecord> {
    if (input.parentId) {
      await this.assertParentInSameFactory(input);
    }

    return this.organizationRepository.create(input);
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateOrgUnitInput,
  ): Promise<OrgUnitRecord> {
    const current = await this.organizationRepository.findById(tenantId, id);

    if (!current) {
      throw new NotFoundException('Organization unit not found.');
    }

    if (input.parentId !== undefined && input.parentId !== null) {
      await this.assertNoParentCycle(tenantId, current.factoryId, id, input.parentId);
      await this.assertParentInSameFactory({
        tenantId,
        factoryId: current.factoryId,
        parentId: input.parentId,
        name: input.name ?? current.name,
        type: input.type ?? current.type,
        sortOrder: input.sortOrder ?? current.sortOrder,
      });
    }

    return this.organizationRepository.update(tenantId, id, input);
  }

  async remove(input: RemoveOrgUnitInput): Promise<void> {
    const current = await this.organizationRepository.findById(
      input.tenantId,
      input.id,
    );

    if (!current) {
      throw new NotFoundException('Organization unit not found.');
    }

    if (await this.organizationRepository.hasChildren(input.tenantId, input.id)) {
      throw new ConflictException('Organization unit has child units.');
    }

    if (
      await this.organizationRepository.hasActiveEmployees(input.tenantId, input.id)
    ) {
      throw new ConflictException('Organization unit has active employees.');
    }

    await this.organizationRepository.softDelete(input.tenantId, input.id);
  }

  private async assertParentInSameFactory(input: CreateOrgUnitInput): Promise<void> {
    const parent = await this.organizationRepository.findById(
      input.tenantId,
      input.parentId ?? '',
    );

    if (!parent || parent.factoryId !== input.factoryId) {
      throw new NotFoundException('Parent organization unit not found.');
    }
  }

  private async assertNoParentCycle(
    tenantId: string,
    factoryId: string,
    currentId: string,
    nextParentId: string,
  ): Promise<void> {
    if (currentId === nextParentId) {
      throw new ConflictException('Organization unit cannot parent itself.');
    }

    const units = await this.organizationRepository.listByFactory(
      tenantId,
      factoryId,
    );
    const descendantIds = collectDescendantIds(units, currentId);

    if (descendantIds.includes(nextParentId)) {
      throw new ConflictException(
        'Organization unit cannot move under its descendants.',
      );
    }
  }
}

function buildOrgTree(units: OrgUnitRecord[]): OrgUnitTreeNode[] {
  const nodes = new Map<string, OrgUnitTreeNode>();

  for (const unit of units) {
    nodes.set(unit.id, {
      ...unit,
      children: [],
    });
  }

  const roots: OrgUnitTreeNode[] = [];

  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)?.children.push(node);
      continue;
    }

    roots.push(node);
  }

  return sortTree(roots);
}

function sortTree(nodes: OrgUnitTreeNode[]): OrgUnitTreeNode[] {
  return nodes
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((node) => ({
      ...node,
      children: sortTree(node.children),
    }));
}

function collectDescendantIds(units: OrgUnitRecord[], rootId: string): string[] {
  const childrenByParent = new Map<string, OrgUnitRecord[]>();

  for (const unit of units) {
    if (!unit.parentId) {
      continue;
    }

    childrenByParent.set(unit.parentId, [
      ...(childrenByParent.get(unit.parentId) ?? []),
      unit,
    ]);
  }

  const result: string[] = [];
  const stack = [...(childrenByParent.get(rootId) ?? [])];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current) {
      continue;
    }

    result.push(current.id);
    stack.push(...(childrenByParent.get(current.id) ?? []));
  }

  return result;
}
