'use client';

import { usePathname } from 'next/navigation';
import { Fragment } from 'react';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Image from "next/image";

export function DynamicBreadcrumb() {
    const pathname = usePathname();
    // Filter out empty strings from splitting
    const segments = pathname.split('/').filter(item => item !== '');

    // Helper to format segment names
    const formatSegment = (segment: string) => {
        // Check if it's a UUID-like string (simple length check or hyphen check)
        if (segment.length > 20 && segment.includes('-')) {
            return "Details";
        }

        // Check for specific IDs or clean up names
        if (segment === 'create') return 'Create New';

        // Capitalize first letter and handle hyphens
        return segment
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard" className="flex items-center gap-2">
                        <Image src="/ccsa-logo.png" alt="CCSA Logo" width={24} height={24} className="object-contain" />
                        <span className="font-semibold text-sm">CCSA FIMS</span>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                {segments.length > 0 && <BreadcrumbSeparator className="hidden md:block" />}

                {segments.map((segment, index) => {
                    const href = `/${segments.slice(0, index + 1).join('/')}`;
                    const isLast = index === segments.length - 1;
                    const label = formatSegment(segment);

                    // Don't duplicate "Dashboard" if it's the first segment and we effectively just treated "CCSA FIMS" as Home/Dashboard link
                    if (index === 0 && segment === 'dashboard') {
                        // But wait, if we are at /dashboard, we want to see "Dashboard" selected?
                        // Or just "CCSA FIMS"?
                        // Usually "Home > Dashboard" is redundant if Home IS Dashboard.
                        // Let's render it if it's not the ONLY segment?
                        // Currently "CCSA FIMS" -> /dashboard.
                        // If path is /dashboard, segments=['dashboard'].
                        // Result: CCSA FIMS > Dashboard. This is fine.
                    }

                    return (
                        <Fragment key={href}>
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage>{label}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {!isLast && <BreadcrumbSeparator />}
                        </Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
