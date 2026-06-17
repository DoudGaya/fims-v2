import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { NINProviderError, lookupNINFromProvider } from '@/lib/ninProvider';

function formatDate(dateString: any): string {
    if (!dateString) return '';

    const datePattern = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
    const match = typeof dateString === 'string' ? dateString.match(datePattern) : null;

    if (match) {
        const [, day, month, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
}

function normalizeGender(gender: any): string {
    if (!gender) return '';

    const value = gender.toString().toLowerCase();
    if (value.startsWith('m')) return 'Male';
    if (value.startsWith('f')) return 'Female';
    return gender as string;
}

function mapNINData(data: any, nin: string) {
    return {
        nin,
        firstName: data.firstname || data.firstName || '',
        middleName: data.middlename || data.middleName || '',
        lastName: data.surname || data.lastname || data.lastName || '',
        dateOfBirth: formatDate(data.dateofbirth || data.birthdate || data.dateOfBirth),
        gender: normalizeGender(data.gender),
        birthState: data.birthstate || data.birthState || '',
        birthLGA: data.birthlga || data.birthLGA || '',
        photo: data.photo || null,
        maritalStatus: data.maritalstatus || data.maritalStatus || '',
        employmentStatus: data.emplymentstatus || data.employmentStatus || '',
        verified: true,
        validationDate: new Date().toISOString(),
        source: 'production_api',
    };
}

async function handleValidate(req: NextRequest, nin: string | null) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!nin) {
        return NextResponse.json({ error: 'NIN is required' }, { status: 400 });
    }

    if (!/^\d{11}$/.test(nin)) {
        return NextResponse.json({
            success: false,
            message: 'NIN must be 11 digits',
            error: 'INVALID_FORMAT',
        }, { status: 400 });
    }

    try {
        const providerData = await lookupNINFromProvider(nin);
        const data = mapNINData(providerData, nin);

        return NextResponse.json({
            success: true,
            data,
            source: 'production_api',
        });
    } catch (error: any) {
        if (error instanceof NINProviderError) {
            return NextResponse.json({
                success: false,
                message: error.message,
                error: error.code,
            }, { status: error.status });
        }

        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { nin } = await req.json();
        return handleValidate(req, nin ?? null);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Invalid JSON body' }, { status: 400 });
    }
}

export async function GET(req: NextRequest) {
    return handleValidate(req, req.nextUrl.searchParams.get('nin'));
}
