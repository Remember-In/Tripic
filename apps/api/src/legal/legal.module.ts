import { Module } from "@nestjs/common";
import { LegalController } from "@/legal/legal.controller";

@Module({
  controllers: [LegalController],
})
export class LegalModule {}
