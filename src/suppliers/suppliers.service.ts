import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Supplier, SupplierDocument } from '../models/supplier.schema';
import { User } from '../models/user.schema';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierResponse } from 'src/auth/types/auth.types';
import { randomBytes } from 'crypto';
import Types from 'mongoose';
@Injectable()
export class SuppliersService {
  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<Supplier>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async create(
    createSupplierDto: CreateSupplierDto,
  ): Promise<SupplierResponse> {
    // Check if email exists
    const existingSupplier = await this.supplierModel
      .findOne({
        email: createSupplierDto.email,
      })
      .exec();

    if (existingSupplier) {
      throw new ConflictException('Email already exists');
    }

    // Create supplier with role set to 'supplier'
    const createdSupplier = new this.supplierModel({
      ...createSupplierDto,
      password: createSupplierDto.password,
      role: 'supplier',
    });
    const verificationToken = randomBytes(32).toString('hex');
    createdSupplier.emailVerificationToken = verificationToken;
    const savedSupplier = await createdSupplier.save();

    return {
      ...savedSupplier.toObject(),

      _id: (savedSupplier._id as Types.ObjectId).toString(),
      reviews: (savedSupplier.reviews || []).map((review: any) => ({
        ...review,
        userId: review.userId?.toString?.() ?? review.userId,
      })),
    };
  }

  async findAll(query: any = {}): Promise<Supplier[]> {
    return this.supplierModel.find(query).select('-password').exec();
  }

  async findOne(id: string): Promise<SupplierResponse> {
    const supplier = await this.supplierModel
      .findById(id)
      .select('-password')
      .exec();

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier.toObject() as SupplierResponse;
  }

  async findById(id: string): Promise<Supplier | null> {
    const supplier = await this.supplierModel.findById(id).exec();
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    return supplier;
  }

  async findByEmail(email: string): Promise<SupplierDocument | null> {
    const supplier = await this.supplierModel.findOne({ email }).exec();
    if (!supplier) {
      return null;
    }
    return supplier;
  }

  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<Supplier | null> {
    // Clone the DTO to avoid mutating the original
    const updateData = { ...updateSupplierDto };

    // Check for email uniqueness if email is being updated
    if (updateData.email) {
      // Check in suppliers
      const existingSupplier = await this.supplierModel.findOne({
        email: updateData.email,
        _id: { $ne: id },
      });
      if (existingSupplier) {
        throw new ConflictException('Email already exists.');
      }

      // Check in users
      const existingUser = await this.userModel.findOne({
        email: updateData.email,
      });
      if (existingUser) {
        throw new ConflictException('Email already exists.');
      }
    }

    // Remove password and company fields if present
    if ('password' in updateData) {
      delete updateData.password;
    }
    if ('company' in updateData) {
      delete updateData.company;
    }

    const updatedSupplier = await this.supplierModel
      .findByIdAndUpdate(
        id,
        { $set: updateData },
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
