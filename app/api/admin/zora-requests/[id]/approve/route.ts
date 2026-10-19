import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { integrationEnabled, subjectExists, zoraAdmin, type ZoraSubject } from '@/lib/zoraAccess';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
 const admin=await zoraAdmin();
 if(!admin)return NextResponse.json({error:'Administrator access required'},{status:403});
 if(req.headers.get('origin')!==req.nextUrl.origin)return NextResponse.json({error:'Invalid origin'},{status:403});
 if(!integrationEnabled())return NextResponse.json({error:'Zora integration is not enabled'},{status:503});
 const {id}=await params;
 const body=await req.json().catch(()=>({}));
 const adminNotes=typeof body.adminNotes==='string'?body.adminNotes.trim().slice(0,2000):undefined;
 const application=await prisma.zoraAccessRequest.findUnique({where:{id}});
 if(!application)return NextResponse.json({error:'Request not found'},{status:404});
 const phone=(application.phone??'').replace(/[\s()-]/g,'').replace(/^0/,'+234');
 const farmers=/^\+234[789]\d{9}$/.test(phone)?await prisma.farmer.findMany({where:{phone:{in:[phone,'0'+phone.slice(4),phone.slice(1)]}},select:{id:true},take:2}):[];
 const agents=await prisma.user.findMany({where:{email:application.email,isActive:true,role:{in:['agent','data_correction_agent','survey_agent','agri_business_agent']}},select:{id:true},take:2});
 const matches:ZoraSubject[]=[...farmers.map(f=>({type:'farmer' as const,id:f.id})),...agents.map(a=>({type:'agent' as const,id:a.id}))];
 if(matches.length!==1)return NextResponse.json({error:'Match this request to exactly one existing farmer or agent in FIMS, then use Enable free Zora in that table.'},{status:409});
 const subject=matches[0];
 if(!(await subjectExists(subject)))return NextResponse.json({error:'Account unavailable'},{status:404});
 try{
  await prisma.$transaction([
   prisma.$executeRaw`INSERT INTO zora_access_grants(subject_type,subject_id,enabled,updated_by) VALUES (${subject.type},${subject.id},true,${admin.id}) ON CONFLICT(subject_type,subject_id) DO UPDATE SET enabled=true,updated_by=EXCLUDED.updated_by,updated_at=now()`,
   prisma.$executeRaw`INSERT INTO zora_access_events(subject_type,subject_id,enabled,actor_id) VALUES (${subject.type},${subject.id},true,${admin.id})`,
   prisma.zoraAccessRequest.update({where:{id},data:{status:'APPROVED',adminNotes},select:{id:true}}),
  ]);
  return NextResponse.json({message:'Free Zora access enabled. Farmers sign in with their registered phone; agents use CCSA Mobile.',request:{id,status:'APPROVED'}});
 }catch{return NextResponse.json({error:'Access could not be updated. Please retry.'},{status:503});}
}
