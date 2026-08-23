import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
export async function POST(req: Request){if(!(await isAdmin())) return new NextResponse('Unauthorized',{status:401});const fd=await req.formData();const id=Number(fd.get('id'));const status=String(fd.get('status')||'');if(!id||!['NEW','CONFIRMED','PREPARING','READY','COMPLETED','CANCELLED'].includes(status)) return NextResponse.redirect(new URL('/admin/orders',req.url),303);await db.order.update({where:{id},data:{status:status as any}});return NextResponse.redirect(new URL('/admin/orders',req.url),303)}
