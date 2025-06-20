import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Supplier } from '../models/supplier.schema';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import * as bcrypt from 'bcrypt';
import { SupplierResponse } from 'src/auth/types/auth.types';
import { Types } from 'mongoose';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<Supplier>,
  ) {}

  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    // Check if email exists
    const existingSupplier = await this.supplierModel
      .findOne({
        email: createSupplierDto.email,
      })
      .exec();

    if (existingSupplier) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createSupplierDto.password, salt);
    console.log(
      `Creating supplier with email: ${createSupplierDto.email}, hashed password: ${hashedPassword}`,
    );
    // Create supplier with role set to 'supplier'
    const createdSupplier = new this.supplierModel({
      ...createSupplierDto,
      password: hashedPassword,
      role: 'supplier',
    });

    return createdSupplier.save();
  }

  async findAll(query: any = {}): Promise<Supplier[]> {
    return this.supplierModel.find(query).select('-password').exec();
  }

  async findOne(id: string): Promise<Supplier | null> {
    const supplier = await this.supplierModel
      .findById(id)
      .select('-password')
      .lean();

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  async findByEmail(email: string): Promise<Supplier | null> {
    const supplier = await this.supplierModel.findOne({ email }).lean();

    if (!supplier) {
      return null;
    }
    return supplier;
  }

  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<Supplier | null> {
    // If password is provided, hash it
    if (updateSupplierDto.password) {
      const salt = await bcrypt.genSalt();
      updateSupplierDto.password = await bcrypt.hash(
        updateSupplierDto.password,
        salt,
      );
    }

    const updatedSupplier = await this.supplierModel
      .findByIdAndUpdate(
        id,
        { $set: updateSupplierDto },
        { new: true, runValidators: true },
      )
      .select('-password');

    if (!updatedSupplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return updatedSupplier;
  }

  async remove(id: string): Promise<void> {
    const result = await this.supplierModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
  }

  async findByServiceArea(
    region: string,
    postalCode?: string,
  ): Promise<Supplier[]> {
    const query: any = { 'serviceAreas.region': region };

    if (postalCode) {
      query['serviceAreas.postalCodes'] = postalCode;
    }

    return this.supplierModel.find(query).select('-password').exec();
  }

  async addReview(
    id: string,
    userId: string,
    rating: number,
    comment?: string,
  ): Promise<Supplier> {
    const supplier = await this.supplierModel.findById(id).exec();

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    // Add review
    const review = {
      userId,
      rating,
      comment,
      date: new Date(),
    };

    // Update supplier with new review
    const updatedSupplier = await this.supplierModel
      .findByIdAndUpdate(
        id,
        {
          $push: { reviews: review },
          // Recalculate average rating
          $set: {
            rating:
              supplier.reviews.length > 0
                ? (supplier.reviews.reduce((sum, r) => sum + r.rating, 0) +
                    rating) /
                  (supplier.reviews.length + 1)
                : rating,
          },
        },
        { new: true, runValidators: true },
      )
      .select('-password');

    if (!updatedSupplier) {
      throw new NotFoundException(
        `Supplier with ID ${id} not found after update`,
      );
    }

    return updatedSupplier;
  }
}
