export interface ModuleCard {
  title: string;
  description: string;
  status: 'available' | 'wip';
  statsLabel: string;
  statsValue: string;
  features: string[];
  icon?: string;
}
