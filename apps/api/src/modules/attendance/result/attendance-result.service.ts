import { ConflictException, Injectable } from '@nestjs/common';
import { calculateAttendanceResult } from '../calculator/attendance-calculator';
import type { AttendanceCalculationInput } from '../calculator/attendance-calculator.types';
import type {
  AttendanceResultRecord,
  AttendanceResultRepository,
} from './attendance-result.repository';

@Injectable()
export class AttendanceResultService {
  constructor(private readonly repository: AttendanceResultRepository) {}

  async recalculate(
    input: AttendanceCalculationInput,
  ): Promise<AttendanceResultRecord> {
    const existing = await this.repository.findByEmployeeAndDate(
      input.tenantId,
      input.employeeId,
      input.date,
    );

    if (existing?.isFinalized) {
      throw new ConflictException('Attendance result is finalized.');
    }

    return this.repository.upsert(calculateAttendanceResult(input));
  }
}
