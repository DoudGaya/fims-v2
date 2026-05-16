import { Metadata } from 'next';
import SurveyDetailClient from './SurveyDetailClient';

export const metadata: Metadata = {
  title: 'Survey Builder | CCSA',
  description: 'Edit survey questions and view responses',
};

export default async function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SurveyDetailClient id={id} />;
}
