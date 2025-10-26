import { Module } from '@nestjs/common';
import { HttpClientService } from './http-client.service';
import { HttpClientController } from './http-client.controller';

@Module({
  controllers: [HttpClientController],
  providers: [HttpClientService],
  exports: [HttpClientService],
})
export class HttpClientModule {}
