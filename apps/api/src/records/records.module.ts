import { Module } from "@nestjs/common";
import { PrismaRecordsAdapter } from "@/records/adapters/prisma-records.adapter";
import { RECORDS_REPOSITORY } from "@/records/ports/records-repository.port";
import { RecordsController } from "@/records/records.controller";
import { RecordsService } from "@/records/records.service";

@Module({
  controllers: [RecordsController],
  providers: [
    RecordsService,
    { provide: RECORDS_REPOSITORY, useClass: PrismaRecordsAdapter },
  ],
})
export class RecordsModule {}
