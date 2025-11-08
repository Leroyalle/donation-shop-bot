import { Module } from '@nestjs/common';
import { HttpClientModule } from './http-client/http-client.module';

@Module({
  imports: [HttpClientModule],
  exports: [HttpClientModule],
})
export class InfrastructureModule {}
