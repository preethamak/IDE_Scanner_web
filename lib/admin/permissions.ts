export const adminRoles = ['viewer','operator','editor','publisher','administrator'] as const;
export type AdminRole = typeof adminRoles[number] | 'owner';
export type AdminPermission = 'analytics:read'|'accounts:read'|'operations:read'|'operations:write'|'keys:write'|'quality:write'|'content:write'|'publishing:review'|'access:write';
const grants: Record<AdminRole, readonly AdminPermission[]> = {
 owner: ['analytics:read','accounts:read','operations:read','operations:write','keys:write','quality:write','content:write','publishing:review','access:write'],
 administrator: ['analytics:read','accounts:read','operations:read','operations:write','keys:write','quality:write','content:write','publishing:review'],
 viewer: ['analytics:read'], operator: ['analytics:read','accounts:read','operations:read','operations:write','keys:write','quality:write'],
 editor: ['analytics:read','content:write'], publisher: ['analytics:read','content:write','publishing:review'],
};
export function canAdmin(role: AdminRole, permission: AdminPermission) { return grants[role]?.includes(permission) || false; }
export function sectionPermission(key: string): AdminPermission {
 if (['users/all','users/login','users/paths'].includes(key)) return 'accounts:read';
 if (key==='jobs') return 'operations:read';
 if (key==='content') return 'content:write';
 return 'analytics:read';
}
export const operationSections = [
 {key:'jobs',title:'Scan investigation',permission:'operations:read',description:'Inspect stage history and retry failed jobs with a recorded reason.'},
 {key:'funnel',title:'Conversion funnel',permission:'analytics:read',description:'Ordered consenting-session progress from registry to monitoring and workspace activity.'},
 {key:'monitoring',title:'Monitoring health',permission:'operations:read',description:'Stale checks, pending release reviews, scan delays, and notification failures.'},
 {key:'accounts',title:'Account activity',permission:'accounts:read',description:'Account membership and operational activity without impersonation.'},
 {key:'keys',title:'API-key management',permission:'operations:read',description:'Inspect scopes and last use; revoke credentials without exposing secrets.'},
 {key:'usage',title:'AI usage & cost',permission:'operations:read',description:'Provider-reported tokens with explicit, versioned pricing. Missing usage stays unknown.'},
 {key:'access',title:'Admin roles',permission:'access:write',description:'Delegate roles to existing accounts; bootstrap owners remain configured separately.'},
 {key:'audit',title:'Admin audit history',permission:'operations:read',description:'Recorded administrative requests, outcomes, actors, and reasons.'},
 {key:'incidents',title:'Operational alerts',permission:'operations:read',description:'Deduplicated incidents for scan, monitoring, delivery, and provider failures.'},
 {key:'notices',title:'Report corrections',permission:'operations:read',description:'Append public review, correction, or withdrawal notices without rewriting original evidence.'},
 {key:'quality',title:'Detection quality',permission:'operations:read',description:'Review reported cases and preserve disagreements. These cases are not an unbiased accuracy benchmark.'},
 {key:'studio',title:'Company content studio',permission:'content:write',description:'Generate captions, hashtags, and PDF documents from approved facts; review and schedule company-page posts.'},
 {key:'facts',title:'Approved product facts',permission:'content:write',description:'Maintain sourced, time-bounded facts about shipped, beta, and planned capabilities.'},
] as const satisfies readonly {key:string;title:string;permission:AdminPermission;description:string}[];
