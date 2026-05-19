import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CheckinMethod, Prisma, PrismaClient } from '@prisma/client';

export type AttendanceGroupRecord = {
  id: string;
  tenantId: string;
  factoryId: string;
  name: string;
  shiftId: string;
  checkinMethods: CheckinMethod[];
  gpsLat: number | null;
  gpsLng: number | null;
  gpsRadiusMeters: number | null;
  wifiSsid: string | null;
  wifiBssid: string | null;
  requirePhoto: boolean;
  allowOutsideCheckin: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type AttendanceGroupMemberRecord = {
  id: string;
  tenantId: string;
  factoryId: string;
  employeeId: string;
  attendanceGroupId: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateAttendanceGroupInput = {
  tenantId: string;
  factoryId: string;
  name: string;
  shiftId: string;
  checkinMethods: CheckinMethod[];
  gpsLat: number | null;
  gpsLng: number | null;
  gpsRadiusMeters: number | null;
  wifiSsid: string | null;
  wifiBssid: string | null;
  requirePhoto: boolean;
  allowOutsideCheckin: boolean;
};

export type UpdateAttendanceGroupInput = Partial<
  Omit<CreateAttendanceGroupInput, 'tenantId' | 'factoryId'>
>;

export type AddAttendanceGroupMembersInput = {
  tenantId: string;
  factoryId: string;
  attendanceGroupId: string;
  employeeIds: string[];
  effectiveFrom: Date;
  createdBy: string;
};

export interface AttendanceGroupRepository {
  findById(tenantId: string, id: string): Promise<AttendanceGroupRecord | null>;
  listByFactory(
    tenantId: string,
    factoryId: string,
  ): Promise<AttendanceGroupRecord[]>;
  create(input: CreateAttendanceGroupInput): Promise<AttendanceGroupRecord>;
  update(
    tenantId: string,
    id: string,
    input: UpdateAttendanceGroupInput,
  ): Promise<AttendanceGroupRecord>;
  softDelete(tenantId: string, id: string): Promise<void>;
  addMembers(
    input: AddAttendanceGroupMembersInput,
  ): Promise<AttendanceGroupMemberRecord[]>;
  findMemberByEmployeeAndDate(
    tenantId: string,
    employeeId: string,
    date: Date,
  ): Promise<AttendanceGroupMemberRecord | null>;
}

@Injectable()
export class PrismaAttendanceGroupRepository
  implements AttendanceGroupRepository, OnModuleInit, OnModuleDestroy
{
  private readonly prisma = new PrismaClient();

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async findById(
    tenantId: string,
    id: string,
  ): Promise<AttendanceGroupRecord | null> {
    const group = await this.prisma.attendanceGroup.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    return group ? toAttendanceGroupRecord(group) : null;
  }

  async listByFactory(
    tenantId: string,
    factoryId: string,
  ): Promise<AttendanceGroupRecord[]> {
    const groups = await this.prisma.attendanceGroup.findMany({
      where: {
        tenantId,
        factoryId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return groups.map(toAttendanceGroupRecord);
  }

  async create(input: CreateAttendanceGroupInput): Promise<AttendanceGroupRecord> {
    const group = await this.prisma.attendanceGroup.create({
      data: {
        tenantId: input.tenantId,
        factoryId: input.factoryId,
        name: input.name,
        shiftId: input.shiftId,
        checkinMethods: input.checkinMethods,
        gpsLat: input.gpsLat,
        gpsLng: input.gpsLng,
        gpsRadiusMeters: input.gpsRadiusMeters,
        wifiSsid: input.wifiSsid,
        wifiBssid: input.wifiBssid,
        requirePhoto: input.requirePhoto,
        allowOutsideCheckin: input.allowOutsideCheckin,
      },
    });

    return toAttendanceGroupRecord(group);
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateAttendanceGroupInput,
  ): Promise<AttendanceGroupRecord> {
    await this.assertExists(tenantId, id);
    const group = await this.prisma.attendanceGroup.update({
      where: {
        id,
      },
      data: {
        name: input.name,
        shiftId: input.shiftId,
        checkinMethods: input.checkinMethods,
        gpsLat: input.gpsLat,
        gpsLng: input.gpsLng,
        gpsRadiusMeters: input.gpsRadiusMeters,
        wifiSsid: input.wifiSsid,
        wifiBssid: input.wifiBssid,
        requirePhoto: input.requirePhoto,
        allowOutsideCheckin: input.allowOutsideCheckin,
      },
    });

    return toAttendanceGroupRecord(group);
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.assertExists(tenantId, id);
    await this.prisma.attendanceGroup.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async addMembers(
    input: AddAttendanceGroupMembersInput,
  ): Promise<AttendanceGroupMemberRecord[]> {
    return this.prisma.$transaction(async (tx) => {
      await tx.attendanceGroupMember.updateMany({
        where: {
          tenantId: input.tenantId,
          employeeId: {
            in: input.employeeIds,
          },
          effectiveTo: null,
          deletedAt: null,
        },
        data: {
          effectiveTo: previousDate(input.effectiveFrom),
        },
      });

      const created = await Promise.all(
        input.employeeIds.map((employeeId) =>
          tx.attendanceGroupMember.create({
            data: {
              tenantId: input.tenantId,
              factoryId: input.factoryId,
              employeeId,
              attendanceGroupId: input.attendanceGroupId,
              effectiveFrom: input.effectiveFrom,
              createdBy: input.createdBy,
            },
          }),
        ),
      );

      return created.map(toAttendanceGroupMemberRecord);
    });
  }

  async findMemberByEmployeeAndDate(
    tenantId: string,
    employeeId: string,
    date: Date,
  ): Promise<AttendanceGroupMemberRecord | null> {
    const member = await this.prisma.attendanceGroupMember.findFirst({
      where: {
        tenantId,
        employeeId,
        effectiveFrom: {
          lte: date,
        },
        OR: [
          {
            effectiveTo: null,
          },
          {
            effectiveTo: {
              gte: date,
            },
          },
        ],
        deletedAt: null,
      },
      orderBy: {
        effectiveFrom: 'desc',
      },
    });

    return member ? toAttendanceGroupMemberRecord(member) : null;
  }

  private async assertExists(tenantId: string, id: string): Promise<void> {
    const count = await this.prisma.attendanceGroup.count({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (count === 0) {
      throw new Error('Attendance group not found.');
    }
  }
}

type PrismaAttendanceGroupRecord = {
  id: string;
  tenantId: string;
  factoryId: string;
  name: string;
  shiftId: string;
  checkinMethods: string[];
  gpsLat: Prisma.Decimal | null;
  gpsLng: Prisma.Decimal | null;
  gpsRadiusMeters: number | null;
  wifiSsid: string | null;
  wifiBssid: string | null;
  requirePhoto: boolean;
  allowOutsideCheckin: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

function toAttendanceGroupRecord(
  record: PrismaAttendanceGroupRecord,
): AttendanceGroupRecord {
  return {
    ...record,
    checkinMethods: record.checkinMethods as CheckinMethod[],
    gpsLat: record.gpsLat?.toNumber() ?? null,
    gpsLng: record.gpsLng?.toNumber() ?? null,
  };
}

function toAttendanceGroupMemberRecord(
  record: AttendanceGroupMemberRecord,
): AttendanceGroupMemberRecord {
  return record;
}

function previousDate(value: Date): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() - 1);
  return next;
}
