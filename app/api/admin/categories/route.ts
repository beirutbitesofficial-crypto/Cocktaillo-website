import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
const slugify=(s:string)=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'category'
export async function POST(req:Request){if(!(await isAdmin()))return new NextResponse('Unauthorized',{status:401});const fd=await req.formData();const action=String(fd.get('action'));const id=Number(fd.get('id'));if(action==='create'){const name=String(fd.get('name')||'').trim();if(name)await db.category.create({data:{name,slug:`${slugify(name)}-${Date.now().toString().slice(-5)}`}})}else if(action==='update'&&id){const name=String(fd.get('name')||'').trim();if(name)await db.category.update({where:{id},data:{name,active:fd.get('active')==='on'}})}else if(action==='delete'&&id){await db.category.delete({where:{id}})}return NextResponse.redirect(new URL('/admin/products',req.url),303)}
