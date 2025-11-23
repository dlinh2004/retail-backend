import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'analytics_results' })
export class AnalyticsResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: string; // ngày báo cáo (YYYY-MM-DD)

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  total_revenue: number;

  @Column({ type: 'int', nullable: true })
  total_sales: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  top_product: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
