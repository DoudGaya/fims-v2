'use client';

import React, { useState } from 'react';
import { Trash2, AlertTriangle, CheckCircle2, Mail, Info, Loader2 } from 'lucide-react';

export default function AccountDeletionPage() {
  const [formData, setFormData] = useState({ name: '', phone: '', nin: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/public/account-deletions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 font-sans text-gray-800 dark:text-gray-200">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-red-50 dark:bg-red-900/20 px-8 py-10 border-b border-red-100 dark:border-red-800">
          <div className="flex items-center gap-4 mb-4">
            <Trash2 className="w-10 h-10 text-red-600 dark:text-red-400" />
            <h1 className="text-3xl font-bold tracking-tight text-red-900 dark:text-red-100">Account Deletion Request</h1>
          </div>
          <p className="text-red-700 dark:text-red-300 text-lg">
            Cosmopolitan CCSA Farmers Information Management System (FIMS)
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-10 space-y-8">
          
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Submit Deletion Request</h2>
            <p className="leading-relaxed mb-4">
              If you are a registered Agent or Farmer on the FIMS platform and wish to permanently delete your account and associated data, please fill out the form below.
            </p>
            
            {success ? (
              <div className="bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 p-6 rounded-xl flex items-start gap-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-green-800 dark:text-green-300">Request Submitted Successfully</h3>
                  <p className="text-green-700 dark:text-green-400 mt-2">
                    Our team will verify your identity and process the deletion within 14 business days. We may contact you at your provided phone number if further verification is required.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-gray-100 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600 space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      name="name" 
                      required 
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm focus:border-red-500 focus:ring-red-500 py-2 px-3 text-gray-900 dark:text-white"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                    <input 
                      type="tel" 
                      name="phone" 
                      required 
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm focus:border-red-500 focus:ring-red-500 py-2 px-3 text-gray-900 dark:text-white"
                      placeholder="08012345678"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">National Identity Number (NIN)</label>
                  <input 
                    type="text" 
                    name="nin" 
                    required 
                    maxLength={11}
                    value={formData.nin}
                    onChange={handleChange}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm focus:border-red-500 focus:ring-red-500 py-2 px-3 text-gray-900 dark:text-white"
                    placeholder="11-digit NIN"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for deletion (Optional)</label>
                  <textarea 
                    name="reason" 
                    rows={3}
                    value={formData.reason}
                    onChange={handleChange}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm focus:border-red-500 focus:ring-red-500 py-2 px-3 text-gray-900 dark:text-white"
                    placeholder="Why are you requesting deletion?"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Deletion Request'}
                </button>
              </form>
            )}
          </section>

          <section>
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">What data is deleted?</h2>
                <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                  Upon successful verification of your request, we will permanently delete your:
                </p>
                <ul className="list-disc list-inside mt-2 text-gray-700 dark:text-gray-300 space-y-1">
                  <li>Profile photos and media uploads</li>
                  <li>Login credentials and session data</li>
                  <li>Device identifiers and app activity logs</li>
                  <li>Real-time location tracking history</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">What data is retained?</h2>
                <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                  Because FIMS manages agricultural grants, subsidies, and financial distributions on behalf of regulatory bodies, certain data <strong>must be retained</strong> for legal, fraud-prevention, and auditing purposes even after an account is deleted.
                </p>
                <ul className="list-disc list-inside mt-2 text-gray-700 dark:text-gray-300 space-y-1">
                  <li><strong>Financial Records:</strong> Transaction history, BVN, and bank account associations related to processed payments (retained for 7 years as required by financial regulations).</li>
                  <li><strong>Audit Logs:</strong> Aggregated, anonymized records of farm registrations to prevent duplicate grant claims.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-4 mt-8">
            <Info className="w-6 h-6 text-ccsa-blue dark:text-blue-400 flex-shrink-0 mt-1" />
            <p className="text-sm leading-relaxed text-blue-900 dark:text-blue-100">
              <strong>Please Note:</strong> Deleting your account will immediately revoke your access to the FIMS mobile application and immediately remove you from active grant or subsidy programs. This action cannot be undone.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
