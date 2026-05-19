import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateShiftInput,
  ShiftRecord,
  ShiftRepository,
  UpdateShiftInput,
} from './shift.repository';

@Injectable()
export class ShiftService {
  constructor(private readonly shiftRepository: ShiftRepository) {}

  async listByFactory(tenantId: string, factoryId: string): Promise<ShiftRecord[]> {
    return this.shiftRepository.listByFactory(tenantId, factoryId);
  }

  async findByIdOrThrow(tenantId: string, id: string): Promise<ShiftRecord> {
    const shift = await this.shiftRepository.findById(tenantId, id);

    if (!shift) {
      throw new NotFoundException('Shift not found.');
    }

    return shift;
  }

  async create(input: CreateShiftInput): Promise<ShiftRecord> {
    this.assertShiftTime(input);
    return this.shiftRepository.create(input);
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateShiftInput,
  ): Promise<ShiftRecord> {
    const current = await this.findByIdOrThrow(tenantId, id);
    this.assertShiftTime({
      ...current,
      ...input,
      tenantId,
    });

    return this.shiftRepository.update(tenantId, id, input);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findByIdOrThrow(tenantId, id);
    await this.shiftRepository.softDelete(tenantId, id);
  }

  private assertShiftTime(input: CreateShiftInput): void {
    const startMinutes = parseTimeToMinutes(input.startTime);
    const endMinutes = parseTimeToMinutes(input.endTime);

    if (!input.crossDay && endMinutes <= startMinutes) {
      throw new BadRequestException('Same-day shift end time must be after start time.');
    }

    if (input.crossDay && endMinutes >= startMinutes) {
      throw new BadRequestException('Cross-day shift end time must be earlier than start time.');
    }

    if (input.workMinutes <= 0) {
      throw new BadRequestException('workMinutes must be greater than 0.');
    }
  }
}

function parseTimeToMinutes(value: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);

  if (!match) {
    throw new BadRequestException('Invalid time format.');
  }

  return Number(match[1]) * 60 + Number(match[2]);
}
