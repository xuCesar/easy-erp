import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CheckinMethod, CheckinType, Prisma, PrismaClient } from '@prisma/client';

export type CheckinRecord = {
  id: string;
  tenantId: string;
  factoryId: string;
  employeeId: string;
  checkinType: CheckinType;
  checkinAt: Date;
  clientEventAt: Date | null;
  method: CheckinMethod;
  latitude: number | null;
  longitude: number | null;
  wifiSsid: string | null;
  wifiBssid: string | null;
  photoUrl: string | null;
  deviceId: string | null;
  idempotencyKey: string | null;
  sourceRequestId: string | null;
  isValid: boolean;
  invalidReason: string | null;
  rawData: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateCheckinInput = {
  tenantId: string;
  factoryId: string;
  employeeId: string;
  checkinType: CheckinType;
  checkinAt: Date;
  clientEventAt: Date | null;
  method: CheckinMethod;
  latitude: number | null;
  longitude: number | null;
  wifiSsid: string | null;
  wifiBssid: string | null;
  photoUrl: string | null;
  deviceId: string | null;
  idempotencyKey: string;
  sourceRequestId: string | null;
  isValid: boolean;
  invalidReason: string | null;
  rawData: unknown;
};

export interface CheckinRepository {
  findByIdempotencyKey(
    tenantId: string,
    employeeId: string,
    idempotencyKey: string,
  ): Promise<CheckinRecord | null>;
  create(input: CreateCheckinInput): Promise<CheckinRecord>;
  listByEmployeeAndWindow(
    tenantId: string,
    employeeId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<CheckinRecord[]>;
}

@Injectable()
export class PrismaCheckinRepository
  implements CheckinRepository, OnModuleInit, OnModuleDestroy
{
  private readonly prisma = new PrismaClient();

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async findByIdempotencyKey(
    tenantId: string,
    employeeId: string,
    idempotencyKey: string,
  ): Promise<CheckinRecord | null> {
    const record = await this.prisma.checkinRecord.findFirst({
      where: {
        tenantId,
        employeeId,
        idempotencyKey,
        deletedAt: null,
      },
    });

    return record ? toCheckinRecord(record) : null;
  }

  async create(input: CreateCheckinInput): Promise<CheckinRecord> {
    const record = await this.prisma.checkinRecord.create({
      data: {
        tenantId: input.tenantId,
        factoryId: input.factoryId,
        employeeId: input.employeeId,
        checkinType: input.checkinType,
        checkinAt: input.checkinAt,
        clientEventAt: input.clientEventAt,
        method: input.method,
        latitude: input.latitude,
        longitude: input.longitude,
        wifiSsid: input.wifiSsid,
        wifiBssid: input.wifiBssid,
        photoUrl: input.photoUrl,
        deviceId: input.deviceId,
        idempotencyKey: input.idempotencyKey,
        sourceRequestId: input.sourceRequestId,
        isValid: input.isValid,
        invalidReason: input.invalidReason,
        rawData: input.rawData as Prisma.InputJsonValue,
      },
    });

    return toCheckinRecord(record);
  }

  async listByEmployeeAndWindow(
    tenantId: string,
    employeeId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<CheckinRecord[]> {
    const records = await this.prisma.checkinRecord.findMany({
      where: {
        tenantId,
        employeeId,
        checkinAt: {
          gte: startAt,
          lte: endAt,
        },
        deletedAt: null,
      },
      orderBy: {
        checkinAt: 'asc',
      },
    });

    return records.map(toCheckinRecord);
  }
}

type PrismaCheckinRecord = {
  id: string;
  tenantId: string;
  factoryId: string;
  employeeId: string;
  checkinType: CheckinType;
  checkinAt: Date;
  clientEventAt: Date | null;
  method: CheckinMethod;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
  wifiSsid: string | null;
  wifiBssid: string | null;
  photoUrl: string | null;
  deviceId: string | null;
  idempotencyKey: string | null;
  sourceRequestId: string | null;
  isValid: boolean;
  invalidReason: string | null;
  rawData: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

function toCheckinRecord(record: PrismaCheckinRecord): CheckinRecord {
  return {
    ...record,
    latitude: record.latitude?.toNumber() ?? null,
    longitude: record.longitude?.toNumber() ?? null,
  };
}
