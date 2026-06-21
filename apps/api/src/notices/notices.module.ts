import { Module } from "@nestjs/common";
import { NoticesController } from "@/notices/notices.controller";

@Module({
  controllers: [NoticesController],
})
export class NoticesModule {}
