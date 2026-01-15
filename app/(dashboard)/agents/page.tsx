import { Metadata } from 'next';
import AgentsClient from './AgentsClient';

export const metadata: Metadata = {
  title: 'Agents | CCSA',
  description: 'Manage field agents',
};

export default function AgentsPage() {
  return <AgentsClient />;
}
