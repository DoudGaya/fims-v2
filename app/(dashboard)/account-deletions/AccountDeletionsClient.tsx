'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoader } from '@/components/ui/loading-spinner';
import { format } from "date-fns";

type AccountDeleteRequest = {
  id: string;
  name: string;
  phone: string;
  nin: string;
  reason: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  reviewedBy?: { displayName: string | null; email: string };
};

export default function AccountDeletionsClient() {
  const [requests, setRequests] = useState<AccountDeleteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/admin/account-deletions');
      if (!res.ok) throw new Error('Failed to fetch requests');
      const data = await res.json();
      setRequests(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (!window.confirm(`Are you sure you want to ${status.toLowerCase()} this request?`)) return;

    try {
      const res = await fetch(`/api/admin/account-deletions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (!res.ok) throw new Error(`Failed to ${status.toLowerCase()} request`);
      
      // Update UI
      setRequests(prev => prev.map(req => 
        req.id === id ? { ...req, status } : req
      ));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Account Deletions</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review and action account deletion requests from users.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm border border-red-200">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Deletion Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <TrashIcon className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm font-medium">No deletion requests found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Details</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {requests.map((req) => (
                    <tr key={req.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(req.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{req.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{req.phone} • NIN: {req.nin}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {req.reason || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          variant={req.status === 'PENDING' ? 'secondary' : req.status === 'APPROVED' ? 'default' : 'destructive'}
                          className={
                            req.status === 'APPROVED' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 
                            req.status === 'REJECTED' ? 'bg-red-100 text-red-800 hover:bg-red-100' : 
                            'bg-amber-100 text-amber-800 hover:bg-amber-100'
                          }
                        >
                          {req.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {req.status === 'PENDING' && (
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => handleAction(req.id, 'APPROVED')}
                            >
                              <CheckCircleIcon className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleAction(req.id, 'REJECTED')}
                            >
                              <XCircleIcon className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {req.status !== 'PENDING' && req.reviewedBy && (
                          <span className="text-xs text-gray-500">
                            by {req.reviewedBy.displayName || req.reviewedBy.email}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
