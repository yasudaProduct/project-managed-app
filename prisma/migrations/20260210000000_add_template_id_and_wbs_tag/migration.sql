-- AlterTable: wbs_phase に templateId カラムを追加
ALTER TABLE "wbs_phase" ADD COLUMN "templateId" INTEGER;

-- AddForeignKey: wbs_phase.templateId -> phase_template.id
ALTER TABLE "wbs_phase" ADD CONSTRAINT "wbs_phase_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "phase_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 既存データの自動マッピング: code が一致する phase_template に紐付け
UPDATE "wbs_phase" wp
SET "templateId" = pt.id
FROM "phase_template" pt
WHERE wp.code = pt.code AND wp."templateId" IS NULL;

-- CreateTable: wbs_tag
CREATE TABLE "wbs_tag" (
    "id" SERIAL NOT NULL,
    "wbsId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wbs_tag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: wbs_tag の一意制約
CREATE UNIQUE INDEX "wbs_tag_wbsId_name_key" ON "wbs_tag"("wbsId", "name");

-- AddForeignKey: wbs_tag.wbsId -> wbs.id (CASCADE DELETE)
ALTER TABLE "wbs_tag" ADD CONSTRAINT "wbs_tag_wbsId_fkey" FOREIGN KEY ("wbsId") REFERENCES "wbs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
