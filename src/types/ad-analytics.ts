export type AdEventType = 'impression' | 'click';

export interface AdTrackingEvent {
  adId: string;
  type: AdEventType;
  occurredAt: string;
  ipHash?: string;
  userAgent?: string;
}
