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

  // pick product and staff ids that already exist in this demo DB
  // staff id 13 and product ids 1-6 are present in sample data
  // discover existing staff and products in the DB so we don't pick missing rows
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

  // Seed one sale per day for last 7 days with non-zero totals so chart shows 7 days
  const totals = [120000, 250000, 370736, 150000, 90000, 123456, 520000]

  const today = new Date()
  // ensure we seed exactly last 7 days (today and previous 6)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    d.setHours(12, 0, 0, 0)

    const total = totals[6 - i] ?? Math.round(Math.random() * 1000000)
    // Skip inserting zero totals to avoid unnecessary zero-sales rows
    // Still we keep some zeros if desired (0 means no sale this day)
    if (total === 0) continue

    const productId = productIds[(6 - i) % productIds.length]

    const sale = salesRepo.create({
      product: { id: productId } as any,
      staff: { id: staffId } as any,
      quantity: 1,
      total: total,
      soldAt: d,
    })

    await salesRepo.save(sale)
    console.log('Inserted sale', sale.soldAt.toISOString(), 'total', sale.total)
  }

  await dataSource.destroy()
  console.log('Seeding complete')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
