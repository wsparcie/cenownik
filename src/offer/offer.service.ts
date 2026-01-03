import { Offer } from "@prisma/client";

import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import { DatabaseService } from "../database/database.service";
import { CreateOfferDto } from "./dto/create-offer.dto";
import { UpdateOfferDto } from "./dto/update-offer.dto";

@Injectable()
export class OfferService {
  private readonly logger = new Logger(OfferService.name);

  constructor(private readonly database: DatabaseService) {}

  async findAll(): Promise<Offer[]> {
    return this.database.offer.findMany({
      include: { user: true },
    });
  }

  async findOne(id: number): Promise<Offer> {
    const offer = await this.database.offer.findUnique({
      where: { id },
      include: { user: true },
    });
    if (offer === null) {
      throw new NotFoundException(`Offer with ID ${String(id)} not found`);
    }
    return offer;
  }

  async create(createOfferDto: CreateOfferDto): Promise<Offer> {
    const existing = await this.database.offer.findFirst({
      where: {
        link: createOfferDto.link,
      },
    });

    if (existing !== null) {
      throw new ConflictException("Offer with this link already exists");
    }

    const dataToCreate = {
      link: createOfferDto.link,
      title: createOfferDto.title,
      price: createOfferDto.price,
      description: createOfferDto.description,
      source: createOfferDto.source,
      createdAt: createOfferDto.createdAt ?? new Date(),
      images: createOfferDto.images ?? [],
      userId: createOfferDto.userId,
    };

    return this.database.offer.create({
      data: dataToCreate,
    });
  }

  async update(id: number, updateOfferDto: UpdateOfferDto): Promise<Offer> {
    await this.findOne(id);

    const dataToUpdate: Parameters<
      typeof this.database.offer.update
    >[0]["data"] = {};

    if (updateOfferDto.link !== undefined) {
      dataToUpdate.link = updateOfferDto.link;
    }
    if (updateOfferDto.title !== undefined) {
      dataToUpdate.title = updateOfferDto.title;
    }
    if (updateOfferDto.price !== undefined) {
      dataToUpdate.price = updateOfferDto.price;
    }
    if (updateOfferDto.description !== undefined) {
      dataToUpdate.description = updateOfferDto.description;
    }
    if (updateOfferDto.source !== undefined) {
      dataToUpdate.source = updateOfferDto.source;
    }
    if (updateOfferDto.images !== undefined) {
      dataToUpdate.images = updateOfferDto.images;
    }
    if (updateOfferDto.userId !== undefined) {
      dataToUpdate.userId = updateOfferDto.userId;
    }

    return this.database.offer.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async remove(id: number): Promise<Offer> {
    await this.findOne(id);
    return this.database.offer.delete({
      where: { id },
    });
  }

  async getStatistics(): Promise<{
    total: number;
    bySource: Record<string, number>;
  }> {
    const [total, bySource] = await Promise.all([
      this.database.offer.count(),
      this.database.offer.groupBy({
        by: ["source"],
        _count: { id: true },
      }),
    ]);

    return {
      total,
      bySource: Object.fromEntries(
        bySource.map((item) => [item.source, item._count.id]),
      ),
    };
  }
}
