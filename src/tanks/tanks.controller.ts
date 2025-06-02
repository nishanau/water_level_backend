import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TanksService } from './tanks.service';
import { CreateTankDto } from './dto/create-tank.dto';
import { UpdateTankDto } from './dto/update-tank.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tanks')
@UseGuards(JwtAuthGuard)
export class TanksController {
  constructor(private readonly tanksService: TanksService) {}

  @Post()
  create(@Body() createTankDto: CreateTankDto, @Request() req) {
    return this.tanksService.create(createTankDto, req.user.userId);
  }

  @Get()
  findAll(@Request() req) {
    return this.tanksService.findAll(req.user.userId, req.user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.tanksService.findOne(id, req.user.userId, req.user.role);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTankDto: UpdateTankDto,
    @Request() req,
  ) {
    return this.tanksService.update(
      id,
      updateTankDto,
      req.user.userId,
      req.user.role,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.tanksService.remove(id, req.user.userId, req.user.role);
  }
}
