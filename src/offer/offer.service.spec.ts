import { ConflictException, NotFoundException } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { DatabaseService } from "../database/database.service";
import type { CreateOfferDto } from "./dto/create-offer.dto";
import type { UpdateOfferDto } from "./dto/update-offer.dto";
import { OfferService } from "./offer.service";

const mockDatabaseService = {
  offer: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
};

describe("OfferService", () => {
  let service: OfferService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfferService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<OfferService>(OfferService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create an offer", async () => {
      const createOfferDto: CreateOfferDto = {
        link: "https://example.com/offer/1",
        title: "Test Offer",
        price: 100.5,
        description: "Test description",
        source: "olx",
      };

      mockDatabaseService.offer.findFirst.mockResolvedValue(null);
      mockDatabaseService.offer.create.mockResolvedValue({
        id: 1,
        link: createOfferDto.link,
        title: createOfferDto.title,
        price: createOfferDto.price,
        description: createOfferDto.description,
        source: createOfferDto.source,
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [],
        userId: null,
      });

      const result = await service.create(createOfferDto);

      expect(mockDatabaseService.offer.findFirst).toHaveBeenCalledWith({
        where: { link: createOfferDto.link },
      });
      expect(mockDatabaseService.offer.create).toHaveBeenCalled();
      expect(result).toHaveProperty("id", 1);
      expect(result).toHaveProperty("title", createOfferDto.title);
    });

    it("should throw ConflictException if offer with same link exists", async () => {
      const createOfferDto: CreateOfferDto = {
        link: "https://example.com/offer/1",
        title: "Test Offer",
        price: 100.5,
        source: "olx",
      };

      mockDatabaseService.offer.findFirst.mockResolvedValue({
        id: 1,
        link: createOfferDto.link,
      });

      await expect(service.create(createOfferDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("findAll", () => {
    it("should return an array of offers", async () => {
      const mockOffers = [
        {
          id: 1,
          link: "https://example.com/offer/1",
          title: "Test Offer 1",
          price: 100.5,
          description: "Test description 1",
          source: "olx",
          createdAt: new Date(),
          updatedAt: new Date(),
          images: [],
          userId: null,
          user: null,
        },
        {
          id: 2,
          link: "https://example.com/offer/2",
          title: "Test Offer 2",
          price: 200,
          description: "Test description 2",
          source: "allegro",
          createdAt: new Date(),
          updatedAt: new Date(),
          images: [],
          userId: null,
          user: null,
        },
      ];

      mockDatabaseService.offer.findMany.mockResolvedValue(mockOffers);

      const result = await service.findAll();

      expect(mockDatabaseService.offer.findMany).toHaveBeenCalledWith({
        include: { user: true },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("id", 1);
      expect(result[1]).toHaveProperty("id", 2);
    });
  });

  describe("findOne", () => {
    it("should return an offer by id", async () => {
      const mockOffer = {
        id: 1,
        link: "https://example.com/offer/1",
        title: "Test Offer",
        price: 100.5,
        description: "Test description",
        source: "olx",
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [],
        userId: null,
        user: null,
      };

      mockDatabaseService.offer.findUnique.mockResolvedValue(mockOffer);

      const result = await service.findOne(1);

      expect(mockDatabaseService.offer.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { user: true },
      });
      expect(result).toHaveProperty("id", 1);
      expect(result).toHaveProperty("title", "Test Offer");
    });

    it("should throw NotFoundException if offer not found", async () => {
      mockDatabaseService.offer.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      expect(mockDatabaseService.offer.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
        include: { user: true },
      });
    });
  });

  describe("findByLink", () => {
    it("should return an offer by link", async () => {
      const mockOffer = {
        id: 1,
        link: "https://example.com/offer/1",
        title: "Test Offer",
      };

      mockDatabaseService.offer.findUnique.mockResolvedValue(mockOffer);

      const result = await service.findByLink("https://example.com/offer/1");

      expect(mockDatabaseService.offer.findUnique).toHaveBeenCalledWith({
        where: { link: "https://example.com/offer/1" },
      });
      expect(result).toHaveProperty("id", 1);
    });

    it("should return null if offer not found by link", async () => {
      mockDatabaseService.offer.findUnique.mockResolvedValue(null);

      const result = await service.findByLink("https://nonexistent.com");

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("should update an offer", async () => {
      const updateOfferDto: UpdateOfferDto = {
        title: "Updated Offer Title",
        price: 150,
      };

      mockDatabaseService.offer.findUnique.mockResolvedValue({
        id: 1,
        link: "https://example.com/offer/1",
        title: "Test Offer",
        price: 100.5,
      });

      mockDatabaseService.offer.update.mockResolvedValue({
        id: 1,
        link: "https://example.com/offer/1",
        title: "Updated Offer Title",
        price: 150,
        description: null,
        source: "olx",
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [],
        userId: null,
      });

      const result = await service.update(1, updateOfferDto);

      expect(mockDatabaseService.offer.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          title: "Updated Offer Title",
          price: 150,
        },
      });
      expect(result).toHaveProperty("id", 1);
      expect(result).toHaveProperty("title", "Updated Offer Title");
      expect(result).toHaveProperty("price", 150);
    });

    it("should throw NotFoundException if offer to update not found", async () => {
      mockDatabaseService.offer.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { title: "New Title" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("remove", () => {
    it("should delete an offer", async () => {
      const mockOffer = {
        id: 1,
        link: "https://example.com/offer/1",
        title: "Test Offer",
        price: 100.5,
        description: null,
        source: "olx",
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [],
        userId: null,
      };

      mockDatabaseService.offer.findUnique.mockResolvedValue(mockOffer);
      mockDatabaseService.offer.delete.mockResolvedValue(mockOffer);

      const result = await service.remove(1);

      expect(mockDatabaseService.offer.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toHaveProperty("id", 1);
      expect(result).toHaveProperty("title", "Test Offer");
    });

    it("should throw NotFoundException if offer to delete not found", async () => {
      mockDatabaseService.offer.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("getStatistics", () => {
    it("should return offer statistics", async () => {
      mockDatabaseService.offer.count.mockResolvedValue(10);
      mockDatabaseService.offer.groupBy.mockResolvedValue([
        { source: "olx", _count: { id: 5 } },
        { source: "allegro", _count: { id: 3 } },
        { source: "otomoto", _count: { id: 2 } },
      ]);

      const result = await service.getStatistics();

      expect(mockDatabaseService.offer.count).toHaveBeenCalled();
      expect(mockDatabaseService.offer.groupBy).toHaveBeenCalledWith({
        by: ["source"],
        _count: { id: true },
      });
      expect(result).toEqual({
        total: 10,
        bySource: {
          olx: 5,
          allegro: 3,
          otomoto: 2,
        },
      });
    });
  });

  describe("findOneOrCreate", () => {
    it("should create a new offer if it does not exist", async () => {
      const createOfferDto: CreateOfferDto = {
        link: "https://example.com/offer/new",
        title: "New Offer",
        price: 100,
        source: "olx",
      };

      const newOffer = {
        id: 1,
        link: createOfferDto.link,
        title: createOfferDto.title,
        price: createOfferDto.price,
        source: createOfferDto.source,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [],
        userId: null,
      };

      mockDatabaseService.offer.findUnique.mockResolvedValue(null);
      mockDatabaseService.offer.findFirst.mockResolvedValue(null);
      mockDatabaseService.offer.create.mockResolvedValue(newOffer);

      const result = await service.findOneOrCreate(createOfferDto);

      expect(result.created).toBe(true);
      expect(result.offer).toHaveProperty("id", 1);
    });

    it("should update an existing offer if it exists", async () => {
      const createOfferDto: CreateOfferDto = {
        link: "https://example.com/offer/existing",
        title: "Updated Offer",
        price: 150,
        source: "olx",
      };

      const existingOffer = {
        id: 1,
        link: createOfferDto.link,
        title: "Old Title",
        price: 100,
        source: "olx",
      };

      const updatedOffer = {
        id: 1,
        link: createOfferDto.link,
        title: createOfferDto.title,
        price: createOfferDto.price,
        source: createOfferDto.source,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [],
        userId: null,
      };

      mockDatabaseService.offer.findUnique
        .mockResolvedValueOnce(existingOffer)
        .mockResolvedValueOnce(existingOffer);
      mockDatabaseService.offer.update.mockResolvedValue(updatedOffer);

      const result = await service.findOneOrCreate(createOfferDto);

      expect(result.created).toBe(false);
      expect(result.offer).toHaveProperty("id", 1);
      expect(result.offer).toHaveProperty("title", "Updated Offer");
    });

    it("should throw an error if link is not provided", async () => {
      const createOfferDto = {
        title: "Offer without link",
        price: 100,
        source: "olx",
      } as CreateOfferDto;

      await expect(service.findOneOrCreate(createOfferDto)).rejects.toThrow(
        "Link is required to create or update an offer",
      );
    });
  });
});
