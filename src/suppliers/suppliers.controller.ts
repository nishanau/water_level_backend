import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  async create(@Body() createSupplierDto: CreateSupplierDto) {
    const supplier = await this.suppliersService.create(createSupplierDto);
    return {
      message: 'Supplier created successfully',
      supplier: {
        ...supplier.toObject(),
        password: undefined,
      },
    };
  }

  @Get()
  async findAll(
    @Query('region') region?: string,
    @Query('postalCode') postalCode?: string,
  ) {
    if (region) {
      return this.suppliersService.findByServiceArea(region, postalCode);
    }
    return this.suppliersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'supplier')
  update(@Req() req, @Body() updateSupplierDto: UpdateSupplierDto) {
    return this.suppliersService.update(req.user.userId, updateSupplierDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }

  @Post(':id/reviews')
  @UseGuards(JwtAuthGuard)
  addReview(
    @Param('id') id: string,
    @Body() reviewData: { userId: string; rating: number; comment?: string },
  ) {
    return this.suppliersService.addReview(
      id,
      reviewData.userId,
      reviewData.rating,
      reviewData.comment,
    );
  }
}
