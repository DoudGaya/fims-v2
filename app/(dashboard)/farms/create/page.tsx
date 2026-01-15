'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface Farmer {
  id: string;
  firstName: string;
  lastName: string;
  nin: string;
}

function CreateFarmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedFarmerId = searchParams.get('farmerId');

  const [loading, setLoading] = useState(false);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [formData, setFormData] = useState({
    farmerId: preselectedFarmerId || '',
    farmSize: '',
    primaryCrop: '',
    secondaryCrop: '',
    farmState: '',
    farmLocalGovernment: '',
    farmCity: '',
    farmCoordinates: '', // JSON string or simple format
    farmPolygon: '' // JSON string
  });
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch farmers for the dropdown
    const fetchFarmers = async () => {
      try {
        const res = await fetch('/api/farmers?limit=100'); // Fetch first 100 for now
        if (res.ok) {
          const data = await res.json();
          setFarmers(data.farmers);
        }
      } catch (err) {
        console.error('Failed to fetch farmers', err);
      }
    };
    fetchFarmers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Basic validation
      if (!formData.farmerId) {
        throw new Error('Please select a farmer');
      }

      // Prepare payload
      const payload = {
        ...formData,
        farmSize: formData.farmSize ? parseFloat(formData.farmSize) : undefined,
        // Try to parse JSON fields if provided, otherwise send as is (API might handle or reject)
        // For this simple form, we'll assume the user might paste JSON or we leave it empty
      };

      const res = await fetch('/api/farms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create farm');
      }

      router.push('/farms');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="mb-6">
        <Link
          href="/farms"
          className="flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Farms
        </Link>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Register New Farm
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Enter the details of the farm.</p>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-6">
            {/* Farmer Selection */}
            <div>
              <label htmlFor="farmerId" className="block text-sm font-medium text-gray-700">
                Farmer
              </label>
              <select
                id="farmerId"
                name="farmerId"
                required
                value={formData.farmerId}
                onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
              >
                <option value="">Select a Farmer</option>
                {farmers.map((farmer) => (
                  <option key={farmer.id} value={farmer.id}>
                    {farmer.firstName} {farmer.lastName} ({farmer.nin})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              {/* Farm Size */}
              <div className="sm:col-span-3">
                <label htmlFor="farmSize" className="block text-sm font-medium text-gray-700">
                  Farm Size (Hectares)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    name="farmSize"
                    id="farmSize"
                    step="0.01"
                    value={formData.farmSize}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {/* Primary Crop */}
              <div className="sm:col-span-3">
                <label htmlFor="primaryCrop" className="block text-sm font-medium text-gray-700">
                  Primary Crop
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="primaryCrop"
                    id="primaryCrop"
                    value={formData.primaryCrop}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {/* Secondary Crop */}
              <div className="sm:col-span-6">
                <label htmlFor="secondaryCrop" className="block text-sm font-medium text-gray-700">
                  Secondary Crops (comma separated)
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="secondaryCrop"
                    id="secondaryCrop"
                    value={formData.secondaryCrop}
                    onChange={handleChange}
                    placeholder="e.g. Maize, Beans"
                    className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {/* State */}
              <div className="sm:col-span-2">
                <label htmlFor="farmState" className="block text-sm font-medium text-gray-700">
                  State
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="farmState"
                    id="farmState"
                    value={formData.farmState}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {/* LGA */}
              <div className="sm:col-span-2">
                <label htmlFor="farmLocalGovernment" className="block text-sm font-medium text-gray-700">
                  LGA
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="farmLocalGovernment"
                    id="farmLocalGovernment"
                    value={formData.farmLocalGovernment}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {/* City */}
              <div className="sm:col-span-2">
                <label htmlFor="farmCity" className="block text-sm font-medium text-gray-700">
                  City/Village
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="farmCity"
                    id="farmCity"
                    value={formData.farmCity}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              {/* Coordinates (JSON) */}
              <div className="sm:col-span-6">
                <label htmlFor="farmCoordinates" className="block text-sm font-medium text-gray-700">
                  Coordinates (JSON)
                </label>
                <div className="mt-1">
                  <textarea
                    name="farmCoordinates"
                    id="farmCoordinates"
                    rows={3}
                    value={formData.farmCoordinates}
                    onChange={handleChange}
                    placeholder='[{"lat": 12.34, "lng": 56.78}]'
                    className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md font-mono"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Optional: Enter raw JSON for coordinates.</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                href="/farms"
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 mr-3"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Farm'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CreateFarmPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateFarmForm />
    </Suspense>
  );
}
