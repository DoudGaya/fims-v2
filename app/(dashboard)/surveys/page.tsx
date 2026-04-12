import { Metadata } from 'next';
import SurveysClient from './SurveysClient';

export const metadata: Metadata = {
  title: 'Surveys | CCSA',
  description: 'Create and manage field surveys',
};

export default function SurveysPage() {
  return <SurveysClient />;
}
