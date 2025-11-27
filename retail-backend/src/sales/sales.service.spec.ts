import { Test, TestingModule } from '@nestjs/testing'
import { SalesService } from './sales.service'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Sale } from './sale.entity'
import { Product } from '../products/product.entity'
import { User } from '../users/user.entity'
import { HttpException, HttpStatus } from '@nestjs/common'
import { SqsProducer } from './sqs.producer'

describe('SalesService', () => {
  let service: SalesService

  const mockSqsProducer = { sendSaleEvent: jest.fn() }

  function createMockManager() {
    return {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    }
  }

  function createMockRepository() {
    const manager = createMockManager()
    return {
      manager,
      // expose manager.transaction to call callback with our manager
      createQueryBuilder: jest.fn(),
      manager: manager,
    }
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: getRepositoryToken(Sale), useValue: createMockRepository() },
        { provide: getRepositoryToken(Product), useValue: createMockRepository() },
        { provide: getRepositoryToken(User), useValue: createMockRepository() },
        { provide: SqsProducer, useValue: mockSqsProducer },
      ],
    }).compile()

    service = module.get<SalesService>(SalesService)
  })

  it('should decrement product stock when creating a sale', async () => {
    // arrange
    const product = { id: 1, price: 1000, stock: 10 }
    const staff = { id: 2 }

    // setup the transactional manager behavior
    const txnManager = createMockManager()
    txnManager.findOne.mockImplementation(async (entity, opt) => {
      if (entity === Product) return product
      if (entity === User) return staff
      return null
    })
    txnManager.save.mockImplementation(async (entityClass, payload) => {
      if (entityClass === Product) return payload
      // Sale save -> return payload with id
      return { id: 123, ...payload }
    })
    txnManager.create.mockImplementation((entityClass, payload) => payload)

    // make salesRepository.manager.transaction call our callback
    // patch underlying salesRepository.manager.transaction
    service['salesRepository'].manager.transaction = async (cb) => cb(txnManager)

    // act
    const saved = await service.create(1, 2, 3)

    // assert
    expect(saved).toBeDefined()
    expect(saved.quantity).toBe(3)
    expect(txnManager.save).toHaveBeenCalledWith(Product, expect.objectContaining({ id: 1, stock: 7 }))
    expect(mockSqsProducer.sendSaleEvent).toHaveBeenCalled()
  })

  it('should throw when stock insufficient and not save sale', async () => {
    const product = { id: 1, price: 1000, stock: 1 }
    const staff = { id: 2 }

    const txnManager = createMockManager()
    txnManager.findOne.mockImplementation(async (entity, opt) => {
      if (entity === Product) return product
      if (entity === User) return staff
      return null
    })
    txnManager.save.mockImplementation(async () => null)
    txnManager.create.mockImplementation((entityClass, payload) => payload)

    service['salesRepository'].manager.transaction = async (cb) => cb(txnManager)

    await expect(service.create(1, 2, 5)).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST })
    expect(txnManager.save).not.toHaveBeenCalledWith(Sale, expect.anything())
    expect(mockSqsProducer.sendSaleEvent).not.toHaveBeenCalledWith()
  })
})
