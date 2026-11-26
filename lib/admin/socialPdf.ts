import { PDFDocument,StandardFonts,rgb } from 'pdf-lib';
import type { SocialArtifact } from './studioContract';
const printable=(value:string)=>value.replace(/\u20b9/g,'INR ').replace(/[\u2010-\u2015]/g,'-').replace(/\u202f|\u00a0/g,' ');
export async function socialPdf(artifact:SocialArtifact,watermark=""):Promise<Uint8Array> {
 const pdf=await PDFDocument.create(),regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 pdf.setCreationDate(new Date(0));pdf.setModificationDate(new Date(0));
 pdf.setTitle(artifact.title);pdf.setAuthor('Abscissa');pdf.setSubject('Evidence-backed product briefing');
 const wrap=(text:string,size:number,width:number)=>{
  const lines:string[]=[];
  for(const paragraph of printable(text).split('\n')){
   let line='';
   for(const raw of paragraph.split(/\s+/)){
    const pieces:string[]=[];let piece='';
    for(const character of raw){if(piece&&regular.widthOfTextAtSize(piece+character,size)>width){pieces.push(piece);piece=character;}else piece+=character;}if(piece)pieces.push(piece);
    for(const word of pieces){if(line&&regular.widthOfTextAtSize(line+' '+word,size)>width){lines.push(line);line=word;}else line+=(line?' ':'')+word;}
   }
   lines.push(line);
  }
  return lines;
 };
 for(const [index,slide] of artifact.slides.entries()){
  const page=pdf.addPage([1080,1080]);page.drawRectangle({x:0,y:0,width:1080,height:1080,color:rgb(.97,.98,.97)});
  page.drawRectangle({x:0,y:1048,width:1080,height:32,color:rgb(.08,.27,.19)});
  page.drawText('ABSCISSA / PRODUCT NOTES',{x:76,y:976,size:16,font:bold,color:rgb(.12,.34,.24)});
  let titleSize=44;
  while(titleSize>28&&wrap(slide.title,titleSize,920).length>3)titleSize-=2;
  let y=850;
  for(const line of wrap(slide.title,titleSize,920)){page.drawText(line,{x:76,y,size:titleSize,font:bold,color:rgb(.08,.16,.12)});y-=titleSize*1.25;}
  y-=42;
  let bodySize=26;
  while(bodySize>14&&wrap(slide.body,bodySize,910).length*bodySize*1.5>y-220)bodySize-=2;
  for(const line of wrap(slide.body,bodySize,910)){if(y<210)throw Error('Slide text is too long. Split it before exporting.');page.drawText(line,{x:76,y,size:bodySize,font:regular,color:rgb(.2,.29,.24)});y-=bodySize*1.5;}
  if(slide.source_url){page.drawText('SOURCE',{x:76,y:160,size:12,font:bold,color:rgb(.2,.35,.26)});let sy=136;for(const line of wrap(slide.source_url,13,910)){page.drawText(line,{x:76,y:sy,size:13,font:regular,color:rgb(.2,.35,.26)});sy-=18;}}
  if(watermark)page.drawText(watermark,{x:76,y:52,size:12,font:bold,color:rgb(.5,.25,.1)});
  page.drawText(`${index+1} / ${artifact.slides.length}`,{x:920,y:52,size:14,font:regular,color:rgb(.4,.48,.42)});
 }
 return pdf.save();
}
