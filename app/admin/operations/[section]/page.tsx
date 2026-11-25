import { notFound } from 'next/navigation';
import { requireAdminPage,adminRole } from '@/lib/admin/access';
import { operationSections } from '@/lib/admin/permissions';
import OperationsConsole from '../OperationsConsole';
import StudioConsole from '../StudioConsole';
export const dynamic='force-dynamic';
export default async function OperationsPage({params}:{params:Promise<{section:string}>}){
 const key=(await params).section,section=operationSections.find(section=>section.key===key);if(!section)notFound();
 const user=await requireAdminPage(section.permission),role=await adminRole(user.id);if(!role)notFound();
 return <main className="adminPage"><div className="adminHeading"><div><p className="adminEyebrow">Administration / {section.title}</p><h1>{section.title}</h1><p>{section.description}</p></div></div>{key==='studio'||key==='facts'?<StudioConsole key={key} mode={key} role={role}/>:<OperationsConsole key={key} section={key} role={role}/>}</main>;
}
