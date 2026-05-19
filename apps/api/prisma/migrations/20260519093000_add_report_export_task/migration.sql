-- CreateEnum
CREATE TYPE "ReportExportTaskStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "report_export_task" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "factory_id" UUID NOT NULL,
    "org_unit_id" UUID,
    "month" VARCHAR(7) NOT NULL,
    "status" "ReportExportTaskStatus" NOT NULL DEFAULT 'PENDING',
    "download_url" VARCHAR(512),
    "requested_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "report_export_task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_export_task_tenant_id_factory_id_month_idx" ON "report_export_task"("tenant_id", "factory_id", "month");

-- CreateIndex
CREATE INDEX "report_export_task_tenant_id_status_created_at_idx" ON "report_export_task"("tenant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "report_export_task_tenant_id_requested_by_created_at_idx" ON "report_export_task"("tenant_id", "requested_by", "created_at");

-- AddForeignKey
ALTER TABLE "report_export_task" ADD CONSTRAINT "report_export_task_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_export_task" ADD CONSTRAINT "report_export_task_factory_id_fkey" FOREIGN KEY ("factory_id") REFERENCES "factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_export_task" ADD CONSTRAINT "report_export_task_org_unit_id_fkey" FOREIGN KEY ("org_unit_id") REFERENCES "org_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_export_task" ADD CONSTRAINT "report_export_task_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "account_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
