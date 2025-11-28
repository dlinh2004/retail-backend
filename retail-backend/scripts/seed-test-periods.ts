import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { Sale } from '../src/sales/sale.entity'
import { Product } from '../src/products/product.entity'
import { User } from '../src/users/user.entity'

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: '123456',
    database: 'retaildb',
    entities: [User, Product, Sale],
    synchronize: true,
  })

  await dataSource.initialize()

  const salesRepo = dataSource.getRepository(Sale)
  const productRepo = dataSource.getRepository(Product)
  const userRepo = dataSource.getRepository(User)

  const products = await productRepo.find()
  if (!products.length) {
    console.error('No products found — please create products first')
    await dataSource.destroy()
    return
  }

  const users = await userRepo.find()
  if (!users.length) {
    console.error('No users found — please create at least one user')
    await dataSource.destroy()
    return
  }

  const productIds = products.map((p) => p.id)
  const staffId = users[0].id

  const now = new Date()
  const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15, 12, 0, 0))
  const lastYearDate = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 15, 12, 0, 0))

  const insertSales = async (baseDate: Date, offsetsDays: number[], totals: number[]) => {
    for (let i = 0; i < offsetsDays.length; i++) {
      const d = new Date(baseDate)
      d.setUTCDate(baseDate.getUTCDate() + offsetsDays[i])
      d.setUTCHours(12, 0, 0, 0)

      const total = totals[i] ?? Math.round(Math.random() * 200000)
      const productId = productIds[i % productIds.length]

      const sale = salesRepo.create({
        product: { id: productId } as any,
        staff: { id: staffId } as any,
        quantity: 1,
        total,
        soldAt: d,
      })

      const saved = await salesRepo.save(sale)
      console.log('Inserted sale id=', saved.id, 'date=', saved.soldAt.toISOString(), 'total=', saved.total)
    }
  }

  console.log('Seeding test sales for last month...')
  await insertSales(lastMonthDate, [-5, -2, 0, 3, 7], [50000, 120000, 0, 250000, 90000])

  console.log('Seeding test sales for last year...')
  await insertSales(lastYearDate, [-10, -3, 0, 5, 10], [150000, 200000, 300000, 100000, 50000])

  await dataSource.destroy()
  console.log('Test seeding complete')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
