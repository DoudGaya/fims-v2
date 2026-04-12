import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'CCSA | FIMS',
  description: 'CCSA FIMS & Dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Removes bis_skin_checked injected by Bitdefender/security extensions
            before React hydrates. Raw <script> runs synchronously at top of body,
            blocking parser so MutationObserver is active before any children parse. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){function r(n){if(n.nodeType===1){n.removeAttribute('bis_skin_checked');if(n.children)for(var i=0;i<n.children.length;i++)r(n.children[i]);}}if(typeof MutationObserver!=='undefined'){new MutationObserver(function(ms){ms.forEach(function(m){if(m.type==='attributes')m.target.removeAttribute('bis_skin_checked');m.addedNodes.forEach(function(n){r(n);});});}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['bis_skin_checked']});}})();` }} />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
