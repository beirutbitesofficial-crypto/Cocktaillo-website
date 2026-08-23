import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { fetchAlqaimaMenu } from '@/lib/alqaima'
import { getSettings } from '@/lib/settings'
const slugify=(s:string)=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'menu'
export async function POST(req:Request){if(!(await isAdmin()))return new NextResponse('Unauthorized',{status:401});try{const settings=await getSettings();const items=await fetchAlqaimaMenu(settings.menuSourceUrl);if(!items.length)throw new Error('No items');await db.$transaction(async tx=>{await tx.product.deleteMany();await tx.category.deleteMany();const cats=new Map<string,number>();for(const item of items){const cat=item.category||'Menu';let id=cats.get(cat);if(!id){const c=await tx.category.create({data:{name:cat,slug:`${slugify(cat)}-${cats.size+1}`}});id=c.id;cats.set(cat,id)}await tx.product.create({data:{name:item.name,description:item.description||null,price:item.price,imageUrl:item.imageUrl||null,categoryId:id}})}});return NextResponse.redirect(new URL(`/admin/products?imported=${items.length}`,req.url),303)}catch(e){console.error(e);return NextResponse.redirect(new URL('/admin/products?error=1',req.url),303)}}
