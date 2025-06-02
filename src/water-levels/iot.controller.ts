import { Controller, Post, Body } from '@nestjs/common';
import { WaterLevelsService } from './water-levels.service';
import { IoTWaterLevelDto } from './dto/iot-water-level.dto';

@Controller('iot')
export class IoTController {
  constructor(private readonly waterLevelsService: WaterLevelsService) {}

  @Post('water-level')
  reportWaterLevel(@Body() iotWaterLevelDto: IoTWaterLevelDto) {
    return this.waterLevelsService.reportIoTWaterLevel(
      iotWaterLevelDto.deviceId,
      iotWaterLevelDto.level,
    );
  }
}
