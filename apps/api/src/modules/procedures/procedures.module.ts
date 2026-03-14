import { Module } from '@nestjs/common'
import { ProceduresController } from './procedures.controller'
import { ProceduresService } from './procedures.service'

@Module({
  providers: [ProceduresService],
  controllers: [ProceduresController],
  exports: [ProceduresService],
})
export class ProceduresModule {}
