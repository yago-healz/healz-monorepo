export interface DomainEvent<T = any> {
  readonly event_id: string;
  readonly event_type: string;
  readonly aggregate_type: string;
  readonly aggregate_id: string;
  readonly aggregate_version: number;
  readonly tenant_id: string;
  readonly clinic_id?: string;
  readonly correlation_id: string;
  readonly causation_id?: string;
  readonly user_id?: string;
  readonly created_at: Date;
  readonly event_data: T;
  readonly metadata?: Record<string, any>;
}
