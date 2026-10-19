const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const ChatConversation = require('../models/ChatConversation');
const ChatLead = require('../models/ChatLead');
const KnowledgeChunk = require('../models/KnowledgeChunk');
const ChatMetric = require('../models/ChatMetric');
const { requireAdmin } = require('../middelware/chatAuth');
const router = express.Router();
router.use(requireAdmin);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: Number(process.env.CHAT_PDF_MAX_BYTES || 8 * 1024 * 1024), files: 1 }, fileFilter: (_req,file,cb) => file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf') ? cb(null,true) : cb(new Error('Only PDF files are supported.')) });
function splitIntoChunks(text, size=2200, overlap=250) {
  const clean = String(text || '').replace(/\u0000/g,' ').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
  const chunks=[]; let start=0;
  while(start < clean.length && chunks.length < 150) { let end=Math.min(start+size,clean.length); if(end<clean.length){ const boundary=clean.lastIndexOf(' ',end); if(boundary>start+size*0.65) end=boundary; } const part=clean.slice(start,end).trim(); if(part.length>40) chunks.push(part); if(end>=clean.length) break; start=Math.max(end-overlap,start+1); }
  return chunks;
}
router.get('/overview', async (_req,res) => {
  try { const [conversations, leads, newLeads, knowledge, recentLeads, usage, popular] = await Promise.all([ChatConversation.countDocuments(), ChatLead.countDocuments(), ChatLead.countDocuments({status:'new'}), KnowledgeChunk.countDocuments({active:true}), ChatLead.find().sort({createdAt:-1}).limit(5).select('name email phone interest status createdAt').lean(), ChatMetric.aggregate([{ $match: { eventType: 'message' } }, { $group: { _id: null, messages: { $sum: 1 }, inputTokens: { $sum: '$inputTokens' }, outputTokens: { $sum: '$outputTokens' } } }]), ChatMetric.aggregate([{ $match: { eventType: 'message' } }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 6 }])]); res.json({success:true,stats:{conversations,leads,newLeads,knowledge,messages:usage[0]?.messages||0,inputTokens:usage[0]?.inputTokens||0,outputTokens:usage[0]?.outputTokens||0},popular,recentLeads}); }
  catch(e){res.status(500).json({success:false,message:'Could not load dashboard metrics.'});}
});
router.get('/conversations', async (req,res) => {
  try { const limit=Math.min(Math.max(Number(req.query.limit||50),1),100); const docs=await ChatConversation.find().sort({updatedAt:-1}).limit(limit).select('conversationId title userId messages createdAt updatedAt').lean(); res.json({success:true,conversations:docs.map(d=>({conversationId:d.conversationId,title:d.title,userId:d.userId,createdAt:d.createdAt,updatedAt:d.updatedAt,messageCount:d.messages.length,lastMessage:d.messages.at(-1)?.content||''}))}); }
  catch(e){res.status(500).json({success:false,message:'Could not load conversations.'});}
});
router.get('/conversations/:conversationId', async (req,res) => {
  try { const doc=await ChatConversation.findOne({conversationId:req.params.conversationId}).select('conversationId title userId messages createdAt updatedAt').lean(); if(!doc)return res.status(404).json({success:false,message:'Conversation not found.'}); res.json({success:true,conversation:doc}); }
  catch(e){res.status(500).json({success:false,message:'Could not load conversation.'});}
});
router.get('/leads', async (req,res) => {
  try { const query={}; if(['new','contacted','qualified','closed'].includes(req.query.status))query.status=req.query.status; const limit=Math.min(Math.max(Number(req.query.limit||100),1),250); const leads=await ChatLead.find(query).sort({createdAt:-1}).limit(limit).lean(); res.json({success:true,leads}); }
  catch(e){res.status(500).json({success:false,message:'Could not load leads.'});}
});
router.patch('/leads/:id', async (req,res) => {
  try { const allowed=['new','contacted','qualified','closed']; if(!allowed.includes(req.body.status))return res.status(400).json({success:false,message:'Invalid lead status.'}); const lead=await ChatLead.findByIdAndUpdate(req.params.id,{status:req.body.status,assignedTo:String(req.body.assignedTo||'').slice(0,120)},{new:true,runValidators:true}); if(!lead)return res.status(404).json({success:false,message:'Lead not found.'}); res.json({success:true,lead}); }
  catch(e){res.status(500).json({success:false,message:'Could not update lead.'});}
});
router.get('/knowledge', async (_req,res) => {
  try { const items=await KnowledgeChunk.find().sort({updatedAt:-1}).limit(500).select('sourceType sourceName title content keywords active createdAt updatedAt').lean(); res.json({success:true,items}); }
  catch(e){res.status(500).json({success:false,message:'Could not load knowledge base.'});}
});
router.post('/knowledge', async (req,res) => {
  try { const {title,content,sourceName,keywords}=req.body||{}; if(typeof title!=='string'||title.trim().length<2||typeof content!=='string'||content.trim().length<20)return res.status(400).json({success:false,message:'Enter a title and at least 20 characters of content.'}); const item=await KnowledgeChunk.create({sourceType:'faq',sourceName:String(sourceName||'Capware FAQ').slice(0,180),title:title.trim().slice(0,180),content:content.trim().slice(0,12000),keywords:Array.isArray(keywords)?keywords.map(x=>String(x).toLowerCase().slice(0,60)).slice(0,30):String(keywords||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).slice(0,30),active:true}); res.status(201).json({success:true,item}); }
  catch(e){res.status(500).json({success:false,message:'Could not add knowledge item.'});}
});
router.patch('/knowledge/:id', async (req,res) => {
  try { const patch={}; if(typeof req.body.active==='boolean')patch.active=req.body.active; if(typeof req.body.title==='string')patch.title=req.body.title.trim().slice(0,180); if(typeof req.body.content==='string')patch.content=req.body.content.trim().slice(0,12000); const item=await KnowledgeChunk.findByIdAndUpdate(req.params.id,patch,{new:true,runValidators:true}); if(!item)return res.status(404).json({success:false,message:'Knowledge item not found.'}); res.json({success:true,item}); }
  catch(e){res.status(500).json({success:false,message:'Could not update knowledge item.'});}
});
router.delete('/knowledge/:id', async (req,res) => {
  try { const item=await KnowledgeChunk.findByIdAndDelete(req.params.id); if(!item)return res.status(404).json({success:false,message:'Knowledge item not found.'}); res.json({success:true}); }
  catch(e){res.status(500).json({success:false,message:'Could not delete knowledge item.'});}
});
router.post('/documents', (req,res,next)=>upload.single('file')(req,res,err=>{if(err)return res.status(400).json({success:false,message:err.message||'Upload failed.'});next();}), async (req,res) => {
  try { if(!req.file)return res.status(400).json({success:false,message:'Choose a PDF file.'}); const parsed=await pdfParse(req.file.buffer); const text=String(parsed.text||'').trim(); if(text.length<80)return res.status(400).json({success:false,message:'No readable text found. This PDF may be scanned; run OCR first.'}); const title=String(req.body.title||req.file.originalname.replace(/\.pdf$/i,'')).slice(0,180); const chunks=splitIntoChunks(text); if(!chunks.length)return res.status(400).json({success:false,message:'No usable text found in this PDF.'}); const docs=await KnowledgeChunk.insertMany(chunks.map((content,i)=>({sourceType:'pdf',sourceName:req.file.originalname.slice(0,180),title:`${title} — section ${i+1}`,content,keywords:wordsFrom(title),active:true}))); res.status(201).json({success:true,message:`Imported ${docs.length} searchable text sections.`,count:docs.length}); }
  catch(e){console.error('PDF import failed:',e.message);res.status(500).json({success:false,message:'Could not process this PDF.'});}
});
function wordsFrom(s){return [...new Set(String(s).toLowerCase().match(/[a-z0-9]+/g)||[])].filter(x=>x.length>2).slice(0,30);}
module.exports=router;
