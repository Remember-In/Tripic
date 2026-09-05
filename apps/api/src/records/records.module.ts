import { Module } from "@nestjs/common";
import { PrismaRecordsAdapter } from "@/records/adapters/prisma-records.adapter";
import { SharpImageInspectorAdapter } from "@/records/adapters/sharp-image-inspector.adapter";
import { IMAGE_INSPECTOR } from "@/records/ports/image-inspector.port";
import { RECORDS_REPOSITORY } from "@/records/ports/records-repository.port";
import { RecordsController } from "@/records/records.controller";
import { RecordsService } from "@/records/records.service";

@Module({
  controllers: [RecordsController],
  providers: [
    RecordsService,
    { provide: RECORDS_REPOSITORY, useClass: PrismaRecordsAdapter },
    { provide: IMAGE_INSPECTOR, useClass: SharpImageInspectorAdapter },
  ],
})
export class RecordsModule {}
