import { Metadata } from 'next';
import CorrectionsClient from './CorrectionsClient';

export const metadata: Metadata = {
  title: 'Correction Audit Log | CCSA',
  description: 'View farmer record corrections made by field agents',
};

export default function CorrectionsPage() {
  return <CorrectionsClient />;
}
