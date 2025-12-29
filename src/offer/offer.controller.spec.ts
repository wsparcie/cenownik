import { Reflector } from "@nestjs/core";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { AuthGuard } from "../auth/auth.guard";
import { RoleGuard } from "../auth/roles/role.guard";
import type { CreateOfferDto } from "./dto/create-offer.dto";
import type { UpdateOfferDto } from "./dto/update-offer.dto";
import { OfferController } from "./offer.controller";
import { OfferService } from "./offer.service";

const mockOfferService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  getStatistics: jest.fn(),
};

const mockAuthGuard = {
  canActivate: jest.fn(() => true),
};

const mockRoleGuard = {
  canActivate: jest.fn(() => true),
};

describe("OfferController", () => {
  let controller: OfferController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OfferController],
      providers: [
        {
          provide: OfferService,
          useValue: mockOfferService,
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RoleGuard)
      .useValue(mockRoleGuard)
      .compile();

    controller = module.get<OfferController>(OfferController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should call service create method", async () => {
      const createOfferDto: CreateOfferDto = {
        link: "https://example.com/offer/1",
        title: "Test Offer",
        price: 100.5,
        description: "Test description",
        source: "olx",
      };

      const mockResult = {
        id: 1,
        link: createOfferDto.link,
        title: createOfferDto.title,
        price: createOfferDto.price,
        description: createOfferDto.description,
        source: createOfferDto.source,
      };

      mockOfferService.create.mockResolvedValue(mockResult);

      const result = await controller.create(createOfferDto);

      expect(mockOfferService.create).toHaveBeenCalledWith(createOfferDto);
      expect(result).toBe(mockResult);
    });
  });

  describe("findAll", () => {
    it("should call service findAll method", async () => {
      const mockResult = [
        {
          id: 1,
          link: "https://example.com/offer/1",
          title: "Test Offer 1",
          price: 100.5,
        },
        {
          id: 2,
          link: "https://example.com/offer/2",
          title: "Test Offer 2",
          price: 200,
        },
      ];

      mockOfferService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll();

      expect(mockOfferService.findAll).toHaveBeenCalled();
      expect(result).toBe(mockResult);
    });
  });

  describe("findOne", () => {
    it("should call service findOne method", async () => {
      const mockResult = {
        id: 1,
        link: "https://example.com/offer/1",
        title: "Test Offer",
        price: 100.5,
      };

      mockOfferService.findOne.mockResolvedValue(mockResult);

      const result = await controller.findOne("1");

      expect(mockOfferService.findOne).toHaveBeenCalledWith(1);
      expect(result).toBe(mockResult);
    });
  });

  describe("update", () => {
    it("should call service update method", async () => {
      const updateOfferDto: UpdateOfferDto = {
        title: "Updated Offer Title",
        price: 150,
      };

      const mockResult = {
        id: 1,
        link: "https://example.com/offer/1",
        title: "Updated Offer Title",
        price: 150,
      };

      mockOfferService.update.mockResolvedValue(mockResult);

      const result = await controller.update("1", updateOfferDto);

      expect(mockOfferService.update).toHaveBeenCalledWith(1, updateOfferDto);
      expect(result).toBe(mockResult);
    });
  });

  describe("remove", () => {
    it("should call service remove method", async () => {
      const mockResult = {
        id: 1,
        link: "https://example.com/offer/1",
        title: "Test Offer",
        price: 100.5,
      };

      mockOfferService.remove.mockResolvedValue(mockResult);

      const result = await controller.remove("1");

      expect(mockOfferService.remove).toHaveBeenCalledWith(1);
      expect(result).toBe(mockResult);
    });
  });

  describe("getStatistics", () => {
    it("should call service getStatistics method", async () => {
      const mockResult = {
        total: 10,
        bySource: {
          olx: 5,
          allegro: 3,
          otomoto: 2,
        },
      };

      mockOfferService.getStatistics.mockResolvedValue(mockResult);

      const result = await controller.getStatistics();

      expect(mockOfferService.getStatistics).toHaveBeenCalled();
      expect(result).toBe(mockResult);
    });
  });
});
