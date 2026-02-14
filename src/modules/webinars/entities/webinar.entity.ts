export interface WebinarEntity {
  id: string;
  title: string;
  slug: string;
  description: string;
  date: string;
  duration: number;
  sectionOneTitle?: string | null;
  sectionOnePoints?: string[] | null;
  sectionTwoTitle?: string | null;
  sectionTwoPoints?: string[] | null;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  updatedAt: string;
}
