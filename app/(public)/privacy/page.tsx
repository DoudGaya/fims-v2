import React from 'react';
import { ShieldCheck, Lock, MapPin, User, FileText, Mail } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 font-sans text-gray-800 dark:text-gray-200">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-ccsa-blue text-white px-8 py-10 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-4">
            <ShieldCheck className="w-10 h-10 text-blue-200" />
            <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          </div>
          <p className="text-blue-100 text-lg">
            Cosmopolitan CCSA Farmers Information Management System (FIMS)
          </p>
          <p className="text-sm text-blue-200 mt-2">
            Last Updated: June 2026
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-10 space-y-10">
          
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Introduction</h2>
            <p className="leading-relaxed">
              Welcome to the Cosmopolitan CCSA Farmers Information Management System (FIMS). FIMS is an internal data collection and management application developed for registered enrollment agents. We are deeply committed to protecting the privacy and security of the data collected through our application.
            </p>
            <p className="leading-relaxed mt-4">
              This Privacy Policy details exactly what information we collect, why we collect it, how it is safeguarded, and the rights of the individuals providing this data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">2. Information We Collect</h2>
            <p className="mb-6 leading-relaxed">
              Because our platform registers agricultural personnel and manages financial/grant distribution systems, we collect highly specific and sensitive information solely for operational functionality.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 dark:bg-gray-700/50 p-5 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <User className="w-6 h-6 text-ccsa-blue dark:text-blue-400" />
                  <h3 className="font-semibold text-lg">Personal Identity Data</h3>
                </div>
                <ul className="list-disc list-inside text-sm space-y-2 text-gray-700 dark:text-gray-300">
                  <li>Full legal names</li>
                  <li>Phone numbers and WhatsApp numbers</li>
                  <li>National Identity Number (NIN)</li>
                  <li>Dates of birth and gender</li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-gray-700/50 p-5 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="w-6 h-6 text-ccsa-blue dark:text-blue-400" />
                  <h3 className="font-semibold text-lg">Financial Information</h3>
                </div>
                <ul className="list-disc list-inside text-sm space-y-2 text-gray-700 dark:text-gray-300">
                  <li>Bank Verification Number (BVN)</li>
                  <li>Bank account names and numbers</li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-gray-700/50 p-5 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <MapPin className="w-6 h-6 text-ccsa-blue dark:text-blue-400" />
                  <h3 className="font-semibold text-lg">Location Data</h3>
                </div>
                <ul className="list-disc list-inside text-sm space-y-2 text-gray-700 dark:text-gray-300">
                  <li>Precise GPS Coordinates of farms</li>
                  <li>State, Local Government Area (LGA), and Ward</li>
                  <li>Polling Unit mappings</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2 italic">Requires background location permissions for accurate polygon mapping.</p>
              </div>

              <div className="bg-blue-50 dark:bg-gray-700/50 p-5 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <ShieldCheck className="w-6 h-6 text-ccsa-blue dark:text-blue-400" />
                  <h3 className="font-semibold text-lg">Media & Documents</h3>
                </div>
                <ul className="list-disc list-inside text-sm space-y-2 text-gray-700 dark:text-gray-300">
                  <li>Passport photographs (Agents & Farmers)</li>
                  <li>Consent forms and signatures</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2 italic">Requires camera and media library permissions.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-3 leading-relaxed ml-2">
              <li><strong>Identity Verification:</strong> To securely verify the identity of agents and registered farmers utilizing government databases (NIN/BVN).</li>
              <li><strong>Geospatial Analysis:</strong> To accurately map farm boundaries and capture agronomic/geospatial data (e.g., Soil pH from external GIS providers).</li>
              <li><strong>Financial Disbursement:</strong> To facilitate grants, subsidies, or payments to authorized beneficiaries.</li>
              <li><strong>Operational Security:</strong> To track agent attendance and field performance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Data Security & Storage</h2>
            <div className="flex items-start gap-4 bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-100 dark:border-green-800">
              <Lock className="w-8 h-8 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-green-800 dark:text-green-300 mb-2">Enterprise-Grade Protection</h3>
                <p className="text-sm leading-relaxed text-green-900 dark:text-green-100">
                  All data collected is <strong>encrypted in transit</strong> using secure TLS/HTTPS protocols. Sensitive personal and financial identifiers (such as BVN and NIN) are securely stored in our managed databases. Our application uses offline caching and strict synchronization protocols to ensure no data is lost or intercepted during remote field operations.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Data Sharing and Disclosure</h2>
            <p className="leading-relaxed">
              FIMS does <strong>not</strong> sell, trade, or rent any personal identification information to third parties. Data is solely shared with authorized internal administrators, affiliated payment gateways strictly for disbursement processing, and government regulatory bodies when legally mandated.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. User Rights & Data Deletion</h2>
            <p className="leading-relaxed">
              Farmers and Agents retain the right to request the viewing, correction, or deletion of their stored data. Because this platform is tied to official administrative and financial distributions, requests for complete deletion may result in removal from the FIMS subsidy/grant registry.
            </p>
            <p className="leading-relaxed mt-3">
              To request an export of your data or complete data deletion, please contact our support desk directly via the contact information below.
            </p>
          </section>

          <section className="bg-gray-100 dark:bg-gray-800/80 p-8 rounded-2xl">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Contact Us</h2>
            <p className="leading-relaxed mb-4">
              If you have any questions or concerns regarding this Privacy Policy, please contact our administrative team:
            </p>
            <div className="flex items-center gap-3 text-ccsa-blue dark:text-blue-400 font-medium">
              <Mail className="w-5 h-5" />
              <a href="mailto:abdulrahman.dauda@cosmopolitan.edu.ng" className="hover:underline">
                abdulrahman.dauda@cosmopolitan.edu.ng
              </a>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
