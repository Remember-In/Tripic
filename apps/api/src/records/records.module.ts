import { Module } from "@nestjs/common";
import { PrismaRecordsAdapter } from "@/records/adapters/prisma-records.adapter";
import { SharpImageInspectorAdapter } from "@/records/adapters/sharp-image-inspector.adapter";
import { IMAGE_INSPECTOR } from "@/records/ports/image-inspector.port";
import { RECORDS_REPOSITORY } from "@/records/ports/records-repository.port";
import { RecordsController } from "@/records/records.controller";
import { RecordsService } from "@/records/records.service";
import { PrismaRecordPlacesAdapter } from "@/records/adapters/prisma-record-places.adapter";
import { RECORD_PLACES } from "@/records/ports/record-places.port";
import { RecordPlacesController } from "@/records/record-places.controller";
import { RecordPlacesService } from "@/records/record-places.service";
import { MapController } from "@/map/map.controller";
import { TourismModule } from "@/tourism/tourism.module";

@Module({
  // 방문 관광지 저장은 KTO 상세로 지역코드를 검증한다 (docs/16 §2.1)
  imports: [TourismModule],
  controllers: [RecordsController, RecordPlacesController, MapController],
  providers: [
    RecordsService,
    { provide: RECORDS_REPOSITORY, useClass: PrismaRecordsAdapter },
    { provide: IMAGE_INSPECTOR, useClass: SharpImageInspectorAdapter },
    RecordPlacesService,
    { provide: RECORD_PLACES, useClass: PrismaRecordPlacesAdapter },
  ],
})
export class RecordsModule {}
