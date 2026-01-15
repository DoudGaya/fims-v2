import Link from 'next/link';
import { BuildingLibraryIcon } from '@heroicons/react/24/outline';

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl text-ccsa-green-900">
                        <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center text-white">
                            C
                        </div>
                        <span>CCSA</span>
                    </Link>
                    <div className="text-sm text-muted-foreground">
                        Agent Recruitment
                    </div>
                </div>
            </header>
            <main className="flex-1">
                {children}
            </main>
            <footer className="bg-white border-t py-8 mt-auto">
                <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} CCSA. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
