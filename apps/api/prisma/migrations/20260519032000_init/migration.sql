-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('TENANT_ADMIN', 'HR_ADMIN', 'ORG_MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "DataScopeType" AS ENUM ('TENANT', 'FACTORY', 'ORG_UNIT', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RESIGNED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "OrgUnitType" AS ENUM ('DEPARTMENT', 'WORKSHOP', 'LINE', 'TEAM', 'GROUP', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CheckinType" AS ENUM ('CLOCK_IN', 'CLOCK_OUT');

-- CreateEnum
CREATE TYPE "CheckinMethod" AS ENUM ('GPS', 'WIFI', 'PHOTO', 'DEVICE', 'MANUAL');

-- CreateEnum
CREATE TYPE "AttendancePrimaryStatus" AS ENUM ('NORMAL', 'ABNORMAL', 'ABSENT', 'LEAVE', 'REST', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'PERSONAL', 'MARRIAGE', 'MATERNITY', 'OTHER');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REVOKED');

-- CreateTable
CREATE TABLE "tenant" (
    "id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factory" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "address" VARCHAR(256),
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai',
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "factory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_unit" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "factory_id" UUID NOT NULL,
    "parent_id" UUID,
    "name" VARCHAR(64) NOT NULL,
    "type" "OrgUnitType" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "org_unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_user" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID,
    "phone" VARCHAR(20) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "account_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_role" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "account_user_id" UUID NOT NULL,
    "role_name" "RoleName" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_data_scope" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "account_user_id" UUID NOT NULL,
    "scope_type" "DataScopeType" NOT NULL,
    "factory_id" UUID,
    "org_unit_id" UUID,
    "employee_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_data_scope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_refresh_token" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "account_user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "factory_id" UUID NOT NULL,
    "org_unit_id" UUID,
    "emp_no" VARCHAR(32) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "phone" VARCHAR(20),
    "id_card" VARCHAR(32),
    "gender" "Gender",
    "entry_date" DATE NOT NULL,
    "exit_date" DATE,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "device_id" VARCHAR(128),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "factory_id" UUID NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "cross_day" BOOLEAN NOT NULL DEFAULT false,
    "work_minutes" INTEGER NOT NULL,
    "late_grace_minutes" INTEGER NOT NULL DEFAULT 0,
    "early_leave_grace_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_start_minutes" INTEGER NOT NULL DEFAULT 30,
    "rest_start_time" TIME(6),
    "rest_end_time" TIME(6),
    "color" VARCHAR(7),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_group" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "factory_id" UUID NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "shift_id" UUID NOT NULL,
    "checkin_methods" TEXT[],
    "gps_lat" DECIMAL(10,7),
    "gps_lng" DECIMAL(10,7),
    "gps_radius_meters" INTEGER,
    "wifi_ssid" VARCHAR(64),
    "wifi_bssid" VARCHAR(64),
    "require_photo" BOOLEAN NOT NULL DEFAULT false,
    "allow_outside_checkin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "attendance_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_group_member" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "factory_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "attendance_group_id" UUID NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "attendance_group_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkin_record" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "factory_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "checkin_type" "CheckinType" NOT NULL,
    "checkin_at" TIMESTAMPTZ(6) NOT NULL,
    "client_event_at" TIMESTAMPTZ(6),
    "server_received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "CheckinMethod" NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "wifi_ssid" VARCHAR(64),
    "wifi_bssid" VARCHAR(64),
    "photo_url" VARCHAR(512),
    "device_id" VARCHAR(128),
    "idempotency_key" VARCHAR(128),
    "source_request_id" UUID,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "invalid_reason" VARCHAR(256),
    "ip_address" VARCHAR(64),
    "raw_data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "checkin_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_result" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "factory_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "attendance_group_id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "clock_in_record_id" UUID,
    "clock_out_record_id" UUID,
    "clock_in_at" TIMESTAMPTZ(6),
    "clock_out_at" TIMESTAMPTZ(6),
    "work_minutes" INTEGER NOT NULL DEFAULT 0,
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "early_leave_minutes" INTEGER NOT NULL DEFAULT 0,
    "absence_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "primary_status" "AttendancePrimaryStatus" NOT NULL,
    "status_flags" TEXT[],
    "anomaly_flags" TEXT[],
    "calculated_at" TIMESTAMPTZ(6) NOT NULL,
    "calculation_version" INTEGER NOT NULL DEFAULT 1,
    "is_finalized" BOOLEAN NOT NULL DEFAULT false,
    "finalized_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "attendance_result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_request" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "factory_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type" "LeaveType" NOT NULL,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "duration_hours" DECIMAL(5,1) NOT NULL,
    "reason" TEXT NOT NULL,
    "attachments" TEXT[],
    "status" "ApprovalStatus" NOT NULL,
    "approver_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "reject_reason" TEXT,
    "cancel_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "leave_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_request" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "factory_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "target_date" DATE NOT NULL,
    "repair_type" "CheckinType" NOT NULL,
    "repair_at" TIMESTAMPTZ(6) NOT NULL,
    "reason" TEXT NOT NULL,
    "attachments" TEXT[],
    "status" "ApprovalStatus" NOT NULL,
    "approver_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "reject_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "repair_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "factory_id" UUID,
    "actor_user_id" UUID NOT NULL,
    "actor_employee_id" UUID,
    "action" VARCHAR(64) NOT NULL,
    "resource_type" VARCHAR(64) NOT NULL,
    "resource_id" UUID NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "request_id" UUID NOT NULL,
    "ip_address" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "factory_tenant_id_status_idx" ON "factory"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "org_unit_tenant_id_factory_id_parent_id_idx" ON "org_unit"("tenant_id", "factory_id", "parent_id");

-- CreateIndex
CREATE INDEX "org_unit_tenant_id_factory_id_status_idx" ON "org_unit"("tenant_id", "factory_id", "status");

-- CreateIndex
CREATE INDEX "account_user_tenant_id_employee_id_idx" ON "account_user"("tenant_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_user_tenant_id_phone_key" ON "account_user"("tenant_id", "phone");

-- CreateIndex
CREATE INDEX "account_role_tenant_id_role_name_idx" ON "account_role"("tenant_id", "role_name");

-- CreateIndex
CREATE UNIQUE INDEX "account_role_tenant_id_account_user_id_role_name_key" ON "account_role"("tenant_id", "account_user_id", "role_name");

-- CreateIndex
CREATE INDEX "account_data_scope_tenant_id_account_user_id_scope_type_idx" ON "account_data_scope"("tenant_id", "account_user_id", "scope_type");

-- CreateIndex
CREATE INDEX "account_data_scope_tenant_id_factory_id_idx" ON "account_data_scope"("tenant_id", "factory_id");

-- CreateIndex
CREATE INDEX "account_data_scope_tenant_id_org_unit_id_idx" ON "account_data_scope"("tenant_id", "org_unit_id");

-- CreateIndex
CREATE INDEX "account_data_scope_tenant_id_employee_id_idx" ON "account_data_scope"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "account_refresh_token_tenant_id_account_user_id_revoked_at_idx" ON "account_refresh_token"("tenant_id", "account_user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "account_refresh_token_expires_at_idx" ON "account_refresh_token"("expires_at");

-- CreateIndex
CREATE INDEX "employee_tenant_id_factory_id_status_idx" ON "employee"("tenant_id", "factory_id", "status");

-- CreateIndex
CREATE INDEX "employee_tenant_id_org_unit_id_idx" ON "employee"("tenant_id", "org_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_tenant_id_emp_no_key" ON "employee"("tenant_id", "emp_no");

-- CreateIndex
CREATE INDEX "shift_tenant_id_factory_id_idx" ON "shift"("tenant_id", "factory_id");

-- CreateIndex
CREATE INDEX "attendance_group_tenant_id_factory_id_idx" ON "attendance_group"("tenant_id", "factory_id");

-- CreateIndex
CREATE INDEX "attendance_group_member_tenant_id_employee_id_effective_fro_idx" ON "attendance_group_member"("tenant_id", "employee_id", "effective_from", "effective_to");

-- CreateIndex
CREATE INDEX "attendance_group_member_tenant_id_attendance_group_id_idx" ON "attendance_group_member"("tenant_id", "attendance_group_id");

-- CreateIndex
CREATE INDEX "checkin_record_tenant_id_employee_id_checkin_at_idx" ON "checkin_record"("tenant_id", "employee_id", "checkin_at");

-- CreateIndex
CREATE INDEX "checkin_record_tenant_id_factory_id_checkin_at_idx" ON "checkin_record"("tenant_id", "factory_id", "checkin_at");

-- CreateIndex
CREATE UNIQUE INDEX "checkin_record_tenant_id_employee_id_idempotency_key_key" ON "checkin_record"("tenant_id", "employee_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "attendance_result_tenant_id_factory_id_date_primary_status_idx" ON "attendance_result"("tenant_id", "factory_id", "date", "primary_status");

-- CreateIndex
CREATE INDEX "attendance_result_tenant_id_attendance_group_id_date_idx" ON "attendance_result"("tenant_id", "attendance_group_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_result_tenant_id_employee_id_date_key" ON "attendance_result"("tenant_id", "employee_id", "date");

-- CreateIndex
CREATE INDEX "leave_request_tenant_id_employee_id_start_at_end_at_idx" ON "leave_request"("tenant_id", "employee_id", "start_at", "end_at");

-- CreateIndex
CREATE INDEX "repair_request_tenant_id_employee_id_target_date_idx" ON "repair_request"("tenant_id", "employee_id", "target_date");

-- CreateIndex
CREATE INDEX "audit_log_tenant_id_resource_type_resource_id_idx" ON "audit_log"("tenant_id", "resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_log_tenant_id_actor_user_id_created_at_idx" ON "audit_log"("tenant_id", "actor_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "factory" ADD CONSTRAINT "factory_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_unit" ADD CONSTRAINT "org_unit_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_unit" ADD CONSTRAINT "org_unit_factory_id_fkey" FOREIGN KEY ("factory_id") REFERENCES "factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_unit" ADD CONSTRAINT "org_unit_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "org_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_user" ADD CONSTRAINT "account_user_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_user" ADD CONSTRAINT "account_user_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_role" ADD CONSTRAINT "account_role_account_user_id_fkey" FOREIGN KEY ("account_user_id") REFERENCES "account_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_data_scope" ADD CONSTRAINT "account_data_scope_account_user_id_fkey" FOREIGN KEY ("account_user_id") REFERENCES "account_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_refresh_token" ADD CONSTRAINT "account_refresh_token_account_user_id_fkey" FOREIGN KEY ("account_user_id") REFERENCES "account_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_factory_id_fkey" FOREIGN KEY ("factory_id") REFERENCES "factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_org_unit_id_fkey" FOREIGN KEY ("org_unit_id") REFERENCES "org_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift" ADD CONSTRAINT "shift_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift" ADD CONSTRAINT "shift_factory_id_fkey" FOREIGN KEY ("factory_id") REFERENCES "factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_group" ADD CONSTRAINT "attendance_group_factory_id_fkey" FOREIGN KEY ("factory_id") REFERENCES "factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_group" ADD CONSTRAINT "attendance_group_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_group_member" ADD CONSTRAINT "attendance_group_member_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_group_member" ADD CONSTRAINT "attendance_group_member_attendance_group_id_fkey" FOREIGN KEY ("attendance_group_id") REFERENCES "attendance_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_group_member" ADD CONSTRAINT "attendance_group_member_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "account_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_record" ADD CONSTRAINT "checkin_record_factory_id_fkey" FOREIGN KEY ("factory_id") REFERENCES "factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_record" ADD CONSTRAINT "checkin_record_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_result" ADD CONSTRAINT "attendance_result_factory_id_fkey" FOREIGN KEY ("factory_id") REFERENCES "factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_result" ADD CONSTRAINT "attendance_result_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_result" ADD CONSTRAINT "attendance_result_attendance_group_id_fkey" FOREIGN KEY ("attendance_group_id") REFERENCES "attendance_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_result" ADD CONSTRAINT "attendance_result_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_result" ADD CONSTRAINT "attendance_result_clock_in_record_id_fkey" FOREIGN KEY ("clock_in_record_id") REFERENCES "checkin_record"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_result" ADD CONSTRAINT "attendance_result_clock_out_record_id_fkey" FOREIGN KEY ("clock_out_record_id") REFERENCES "checkin_record"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_request" ADD CONSTRAINT "repair_request_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "account_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
