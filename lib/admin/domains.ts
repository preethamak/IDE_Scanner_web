export const ADMIN_HOST='admin.abscissa.dev';
export const PRODUCT_ORIGIN='https://abscissa.dev';
export function requestHost(request:Request) { try{return new URL(`https://${request.headers.get('host')||new URL(request.url).host}`).hostname;}catch{return '';} }
export function adminHostRedirect(request:Request):URL|null {
 const url=new URL(request.url);if(requestHost(request)!==ADMIN_HOST)return null;
 if(url.pathname==='/'){url.pathname='/admin';return url;}
 if(url.pathname.startsWith('/admin')||url.pathname.startsWith('/api/admin/')||url.pathname.startsWith('/_next/')||['/api/auth/session','/api/auth/logout','/favicon.ico','/icon','/apple-icon'].includes(url.pathname))return null;
 return new URL(url.pathname+url.search,PRODUCT_ORIGIN);
}
