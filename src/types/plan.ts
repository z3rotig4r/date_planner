export type PlanStatus = 'idle' | 'accepted' | 'rejected' | 'pending';

export interface Plan {
  id: string;
  time: string;
  activity: string;
  location: string;
  link: string;
  status: PlanStatus;
}
