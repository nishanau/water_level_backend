import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WaterLevelsService } from './water-levels.service';
import { CreateWaterLevelDto } from './dto/create-water-level.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IoTWaterLevelDto } from './dto/iot-water-level.dto';

@Controller('tanks')
export class WaterLevelsController {
  constructor(private readonly waterLevelsService: WaterLevelsService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':id/levels')
  create(
    @Param('id') tankId: string,
    @Body() createWaterLevelDto: CreateWaterLevelDto,
    @Request() req,
  ) {
    // Set the tankId from the URL parameter
    createWaterLevelDto.tankId = tankId;
    createWaterLevelDto.source = 'manual';

    return this.waterLevelsService.create(
      createWaterLevelDto,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/levels')
  findAll(@Param('id') tankId: string, @Request() req) {
    return this.waterLevelsService.findAll(
      tankId,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/levels/current')
  findCurrent(@Param('id') tankId: string, @Request() req) {
    return this.waterLevelsService.findCurrent(
      tankId,
      req.user.userId,
      req.user.role,
    );
  }

  // Endpoint for IoT devices - no JWT auth required, but needs a device token
  @Post('iot/water-level')
  reportIoTWaterLevel(@Body() iotWaterLevelDto: IoTWaterLevelDto) {
    return this.waterLevelsService.reportIoTWaterLevel(
      iotWaterLevelDto.deviceId,
      iotWaterLevelDto.level,
    );
  }
}
