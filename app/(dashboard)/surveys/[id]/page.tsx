import { Metadata } from 'next';
import SurveyDetailClient from './SurveyDetailClient';

export const metadata: Metadata = {
  title: 'Survey Builder | CCSA',
  description: 'Edit survey questions and view responses',
};

export default function SurveyDetailPage({ params }: { params: { id: string } }) {
  return <SurveyDetailClient id={params.id} />;
}
